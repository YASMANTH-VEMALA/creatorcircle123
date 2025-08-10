import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { collaborationService, CollaborationRequest } from '../services/collaborationService';
import { notificationService, Notification } from '../services/notificationService';
import { UserService } from '../services/userService';
import { useNavigation } from '@react-navigation/native';
import NotificationIndicator from '../components/NotificationIndicator';

interface NotificationItem {
  id: string;
  type: 'collaboration_request' | 'collaboration_response' | 'chat_message';
  title: string;
  body: string;
  data?: any;
  createdAt: any;
  read: boolean;
  senderProfile?: {
    name: string;
    profilePhotoUrl?: string;
    college: string;
  };
}

const NotificationsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<CollaborationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<{[key: string]: any}>({});

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return new Date().toLocaleDateString();
    
    try {
      let date: Date;
      
      // Handle Firestore timestamp
      if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp && typeof timestamp.toMillis === 'function') {
        date = new Date(timestamp.toMillis());
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
        // Handle Firestore timestamp object
        date = new Date(timestamp.seconds * 1000);
      } else {
        // Fallback to current time
        date = new Date();
      }
      
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return new Date().toLocaleDateString();
    }
  };

  useEffect(() => {
    if (user?.uid) {
      loadNotifications();
      loadPendingRequests();
    }
  }, [user?.uid]);

  const loadNotifications = () => {
    if (!user?.uid) return;

    try {
      return notificationService.listenToNotifications(user.uid, (notifications) => {
        setNotifications(notifications);
        setLoading(false);
      });
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
      setLoading(false);
    }
  };

  const loadPendingRequests = () => {
    if (!user?.uid) return;

    try {
      return collaborationService.listenToPendingRequests(user.uid, (requests) => {
        // Accept all requests, let formatTimestamp handle the conversion
        setPendingRequests(requests);
      });
    } catch (error) {
      console.error('Error loading pending requests:', error);
      setPendingRequests([]);
    }
  };

  const handleAcceptRequest = async (request: CollaborationRequest) => {
    if (!user?.uid) return;

    try {
      setResponding(request.id);
      await collaborationService.respondToRequest(request.id, 'accepted');
      
      Alert.alert(
        'Request Accepted!',
        'You can now chat with this creator and see their live location.',
        [
          { text: 'OK' },
          { 
            text: 'Open Chat', 
            onPress: () => {
              // Navigate to chat with the sender
              navigation.navigate('Chat' as never, { 
                otherUserId: request.senderId, 
                otherUserName: 'Creator' 
              } as never);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Error', 'Failed to accept request. Please try again.');
    } finally {
      setResponding(null);
    }
  };

  const handleRejectRequest = async (request: CollaborationRequest) => {
    if (!user?.uid) return;

    try {
      setResponding(request.id);
      await collaborationService.respondToRequest(request.id, 'rejected');
      
      Alert.alert(
        'Request Declined',
        'The request has been declined.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error rejecting request:', error);
      Alert.alert('Error', 'Failed to reject request. Please try again.');
    } finally {
      setResponding(null);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user?.uid) return;
    
    try {
      await notificationService.markNotificationAsRead(user.uid, notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const getIcon = () => {
      switch (item.type) {
        case 'like':
          return 'heart';
        case 'comment':
          return 'chatbubble';
        case 'collab_request':
          return 'people';
        case 'request_accepted':
          return 'checkmark-circle';
        case 'request_rejected':
          return 'close-circle';
        case 'report_warning':
          return 'warning';
        default:
          return 'notifications';
      }
    };

    const getIconColor = () => {
      switch (item.type) {
        case 'like':
          return '#FF3B30';
        case 'comment':
          return '#007AFF';
        case 'collab_request':
          return '#FF9500';
        case 'request_accepted':
          return '#34C759';
        case 'request_rejected':
          return '#FF3B30';
        case 'report_warning':
          return '#FF9500';
        default:
          return '#666';
      }
    };

    const handleNotificationPress = () => {
      // Mark as read
      if (!item.read) {
        handleMarkAsRead(item.id);
      }

      // Handle navigation based on notification type
      switch (item.type) {
        case 'like':
        case 'comment':
          if (item.relatedPostId) {
            navigation.navigate('PostView' as never, { postId: item.relatedPostId } as never);
          }
          break;
        case 'collab_request':
          // Navigate to user profile or show collaboration modal
          navigation.navigate('UserProfile' as never, { userId: item.senderId } as never);
          break;
        case 'request_accepted':
        case 'request_rejected':
          // Navigate to chat or show status
          if (item.type === 'request_accepted') {
            navigation.navigate('Chat' as never, { 
              userId: item.senderId,
              userName: item.senderName 
            } as never);
          }
          break;
        case 'report_warning':
          if (item.relatedPostId) {
            navigation.navigate('PostView' as never, { postId: item.relatedPostId } as never);
          }
          break;
      }
    };

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.read && styles.unreadItem]}
        onPress={handleNotificationPress}
      >
        <View style={styles.notificationIcon}>
          {item.senderProfilePic ? (
            <Image 
              source={{ uri: item.senderProfilePic }} 
              style={styles.userAvatar}
            />
          ) : (
            <View style={styles.defaultAvatar}>
              <Text style={styles.defaultAvatarText}>
                {item.senderName?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle}>{item.message || item.senderName}</Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notificationBody} numberOfLines={2}>
            {item.message}
          </Text>
          <View style={styles.notificationFooter}>
            <Text style={styles.senderInfo}>
              {item.senderName}
              {item.senderVerified && (
                <Ionicons name="checkmark-circle" size={12} color="#007AFF" style={{ marginLeft: 4 }} />
              )}
            </Text>
            <Text style={styles.notificationTime}>
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>
        </View>
        <View style={styles.notificationTypeIcon}>
          <Ionicons name={getIcon() as any} size={16} color={getIconColor()} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderPendingRequest = ({ item }: { item: CollaborationRequest }) => {
    return (
      <View style={styles.requestItem}>
        <View style={styles.requestHeader}>
          <Text style={styles.requestTitle}>Collaboration Request</Text>
          <Text style={styles.requestTime}>
            {formatTimestamp(item.createdAt)}
          </Text>
        </View>
        
        <Text style={styles.requestMessage}>{item.message}</Text>
        
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAcceptRequest(item)}
            disabled={responding === item.id}
          >
            {responding === item.id ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color="white" />
                <Text style={styles.actionButtonText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleRejectRequest(item)}
            disabled={responding === item.id}
          >
            {responding === item.id ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="close" size={16} color="white" />
                <Text style={styles.actionButtonText}>Decline</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
    </View>
  );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.notificationBell}>
            <Ionicons name="notifications-outline" size={24} color="#007AFF" />
            <NotificationIndicator size="small" showCount={false} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Pending Requests Section */}
      {pendingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Requests</Text>
          <FlatList
            data={pendingRequests}
            renderItem={renderPendingRequest}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            style={styles.requestsList}
          />
        </View>
      )}

      {/* All Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Notifications</Text>
        {notifications.length > 0 ? (
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
            style={styles.notificationsList}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No notifications yet</Text>
            <Text style={styles.emptyStateSubtext}>
              You'll see collaboration requests and messages here
            </Text>
          </View>
        )}
    </View>
    </SafeAreaView>
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
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationBell: {
    position: 'relative',
    padding: 8,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  requestsList: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 15,
  },
  requestItem: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  requestTime: {
    fontSize: 12,
    color: '#666',
  },
  requestMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  notificationsList: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 10,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  unreadItem: {
    backgroundColor: '#f8f9ff',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  defaultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  senderInfo: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 2,
    fontWeight: '500',
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notificationTypeIcon: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 10,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
    paddingHorizontal: 20,
  },
});

export default NotificationsScreen; 