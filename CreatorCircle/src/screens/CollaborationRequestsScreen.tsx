import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { collaborationService } from '../services/collaborationService';
import { UserService } from '../services/userService';
import { Collaboration, Profile } from '../types';

const CollaborationRequestsScreen: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestProfiles, setRequestProfiles] = useState<{ [key: string]: Profile }>({});

  useEffect(() => {
    if (user) {
      loadRequests();
    }
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const unsubscribe = collaborationService.listenToPendingRequests(user.uid, async (newRequests) => {
        setRequests(newRequests);
        
        // Load requester profiles
        const profiles: { [key: string]: Profile } = {};
        for (const request of newRequests) {
          if (!profiles[request.requesterId]) {
            // Fetch requester profile via UserService
            const profile = await UserService.getUserProfile(request.requesterId);
            if (profile) {
              profiles[request.requesterId] = profile;
            }
          }
        }
        setRequestProfiles(profiles);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading collaboration requests:', error);
      Alert.alert('Error', 'Failed to load collaboration requests');
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const handleAccept = async (request: Collaboration) => {
    try {
      await collaborationService.respondToRequest(request.id, 'accepted');
      Alert.alert(
        'Request Accepted',
        `${requestProfiles[request.requesterId]?.name || 'User'} accepted your collaboration request!`
      );
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  const handleDecline = async (request: Collaboration) => {
    Alert.alert(
      'Decline Request',
      `Are you sure you want to decline the collaboration request from ${requestProfiles[request.requesterId]?.name || 'this user'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await collaborationService.respondToRequest(request.id, 'rejected');
            } catch (error) {
              console.error('Error declining request:', error);
              Alert.alert('Error', 'Failed to decline request');
            }
          },
        },
      ]
    );
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderRequestItem = ({ item }: { item: Collaboration }) => {
    const requesterProfile = requestProfiles[item.requesterId];
    
    if (!requesterProfile) return null;

    return (
      <View style={styles.requestItem}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            {requesterProfile.profilePhotoUrl ? (
              <Image source={{ uri: requesterProfile.profilePhotoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.defaultAvatar}>
                <Text style={styles.defaultAvatarText}>
                  {requesterProfile.name ? requesterProfile.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{requesterProfile.name}</Text>
            <Text style={styles.userCollege}>{requesterProfile.college}</Text>
            {requesterProfile.skills && requesterProfile.skills.length > 0 && (
              <Text style={styles.userSkills}>
                Skills: {requesterProfile.skills.slice(0, 3).join(', ')}
                {requesterProfile.skills.length > 3 && '...'}
              </Text>
            )}
            {requesterProfile.interests && requesterProfile.interests.length > 0 && (
              <Text style={styles.userInterests}>
                Interests: {requesterProfile.interests.slice(0, 2).join(', ')}
                {requesterProfile.interests.length > 2 && '...'}
              </Text>
            )}
            {item.message && (
              <Text style={styles.requestMessage}>"{item.message}"</Text>
            )}
            <Text style={styles.requestTime}>{formatTime(item.timestamp)}</Text>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.acceptButton]} 
            onPress={() => handleAccept(item)}
          >
            <Ionicons name="checkmark" size={16} color="white" />
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.declineButton]} 
            onPress={() => handleDecline(item)}
          >
            <Ionicons name="close" size={16} color="#FF3B30" />
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Collaboration Requests</Text>
      </View>
      
      {requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No pending requests</Text>
          <Text style={styles.emptySubtext}>
            When other creators send you collaboration requests, they'll appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  requestItem: {
    backgroundColor: 'white',
    margin: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userInfo: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userCollege: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userSkills: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 2,
  },
  userInterests: {
    fontSize: 12,
    color: '#FF9500',
    marginBottom: 4,
  },
  requestMessage: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 12,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    flex: 1,
    marginHorizontal: 4,
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  declineButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  declineButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default CollaborationRequestsScreen; 