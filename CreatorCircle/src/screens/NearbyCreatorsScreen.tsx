import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { locationService, UserLocation, LocationUpdate } from '../services/locationService';
import GoogleMapView from '../components/GoogleMapView';
import { UserService } from '../services/userService';
import { collaborationService } from '../services/collaborationService';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface UserModalProps {
  visible: boolean;
  user: UserLocation | null;
  onClose: () => void;
  onSendRequest: (user: UserLocation) => void;
}

const UserModal: React.FC<UserModalProps> = ({ visible, user, onClose, onSendRequest }) => {
  if (!user) return null;

  const firstLetter = (user.displayName || 'U').charAt(0).toUpperCase();
  const skills = user.skills ?? [];
  const interests = user.interests ?? [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Creator Profile</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* CreatorCircle Banner */}
            <View style={styles.bannerContainer}>
              <Text style={styles.bannerText}>
                <Text style={styles.creatorText}>Creator</Text>
                <Text style={styles.circleText}>Circle</Text>
              </Text>
            </View>

            {/* Profile Picture */}
            <View style={styles.profileImageContainer}>
              {user.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Text style={styles.profileImageText}>{firstLetter}</Text>
                </View>
              )}
              {user.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                </View>
              )}
            </View>

            {/* User Info */}
            <Text style={styles.userName}>{user.displayName || 'Unknown'}</Text>
            <Text style={styles.userCollege}>{user.college || 'Unknown'}</Text>
            
            {typeof user.distance === 'number' && (
              <Text style={styles.userDistance}>
                {(user.distance * 1000).toFixed(0)}m away
              </Text>
            )}

            {/* Skills */}
            {(skills.length > 0) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Skills</Text>
                <View style={styles.tagsContainer}>
                  {skills.slice(0, 5).map((skill, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{skill}</Text>
                    </View>
                  ))}
                  {skills.length > 5 && (
                    <Text style={styles.moreText}>+{skills.length - 5} more</Text>
                  )}
                </View>
              </View>
            )}

            {/* Interests */}
            {(interests.length > 0) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Interests</Text>
                <View style={styles.tagsContainer}>
                  {interests.slice(0, 5).map((interest, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{interest}</Text>
                    </View>
                  ))}
                  {interests.length > 5 && (
                    <Text style={styles.moreText}>+{interests.length - 5} more</Text>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Send Request Button */}
          <TouchableOpacity
            style={styles.sendRequestButton}
            onPress={() => onSendRequest(user)}
          >
            <Ionicons name="chatbubble-outline" size={20} color="white" />
            <Text style={styles.sendRequestText}>Send Request</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const STORAGE_KEY_TOGGLE = 'cc.location.sharingEnabled';

const NearbyCreatorsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [isLocationShared, setIsLocationShared] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationUpdate | null>(null);
  const [nearbyUsers, setNearbyUsers] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<UserLocation | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    initializeLocation();
    return () => {
      locationService.stopLocationTracking();
    };
  }, []);

  const initializeLocation = async () => {
    try {
      setLoading(true);

      if (user?.uid) {
        const profile = await UserService.getUserProfile(user.uid);
        setUserProfile(profile);
      }

      const saved = await AsyncStorage.getItem(STORAGE_KEY_TOGGLE);
      const enabled = saved ? JSON.parse(saved) : false;
      setIsLocationShared(enabled);

      const location = await locationService.getCurrentLocation();
      if (location) {
        const locationUpdate: LocationUpdate = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy ?? undefined,
          timestamp: location.timestamp ?? Date.now(),
        };
        setCurrentLocation(locationUpdate);
      }

      if (enabled && user?.uid && userProfile && currentLocation) {
        await locationService.enableSharing(
          user.uid,
          {
            displayName: userProfile.name || user.email || 'Unknown',
            college: userProfile.college || 'Unknown',
            skills: userProfile.skills || [],
            interests: userProfile.interests || [],
            verified: userProfile.isVerified || false,
            photoURL: userProfile.profilePhotoUrl || undefined,
          },
          (locationUpdate) => setCurrentLocation(locationUpdate)
        );
        locationService.listenToNearbyUsers(user.uid, currentLocation, setNearbyUsers);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error initializing location:', error);
      setLoading(false);
    }
  };

  const handleLocationToggle = async (enabled: boolean) => {
    try {
      if (!user?.uid || !userProfile) {
        Alert.alert('Error', 'User profile not available');
        return;
      }

      setIsLocationShared(enabled);
      await AsyncStorage.setItem(STORAGE_KEY_TOGGLE, JSON.stringify(enabled));

      if (enabled) {
        await locationService.enableSharing(
          user.uid,
          {
            displayName: userProfile.name || user.email || 'Unknown',
            college: userProfile.college || 'Unknown',
            skills: userProfile.skills || [],
            interests: userProfile.interests || [],
            verified: userProfile.isVerified || false,
            photoURL: userProfile.profilePhotoUrl || undefined,
          },
          (locationUpdate) => setCurrentLocation(locationUpdate)
        );
        if (currentLocation) {
          locationService.listenToNearbyUsers(
            user.uid,
            currentLocation,
            (users) => setNearbyUsers(users)
          );
        }
      } else {
        await locationService.disableSharing(user.uid);
        setNearbyUsers([]);
      }
    } catch (error) {
      console.error('Error toggling location:', error);
      Alert.alert('Error', 'Failed to update location sharing');
      setIsLocationShared(!enabled);
    }
  };

  const handleMarkerPress = (user: UserLocation) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleMarkerLongPress = (markerUser: any) => {
    // markerUser has { uid, title/displayName, photoURL,... }
    const found = nearbyUsers.find(u => u.uid === markerUser.uid);
    const userToShow: UserLocation = found || {
      uid: markerUser.uid,
      displayName: markerUser.title || markerUser.displayName || 'Unknown',
      college: '',
      skills: markerUser.skills || [],
      interests: markerUser.interests || [],
      verified: false,
      photoURL: markerUser.photoURL || undefined,
      location: { latitude: markerUser.position?.latitude || 0, longitude: markerUser.position?.longitude || 0 },
      distance: markerUser.distance,
      lastUpdated: new Date(),
    } as any;
    setSelectedUser(userToShow);
    setShowUserModal(true);
  };

  const handleSendRequest = async (targetUser: UserLocation) => {
    if (!user?.uid || !userProfile) {
      Alert.alert('Error', 'User profile not available');
      return;
    }

    try {
      setSendingRequest(true);

      const requestMessage = `${userProfile.name || user.email} from ${userProfile.college || 'Unknown'}, skilled in ${(userProfile.skills || []).join(', ')}, wants to talk to you.`;

      await collaborationService.sendCollaborationRequest(
        user.uid,
        targetUser.uid,
        requestMessage
      );

      Alert.alert(
        'Request Sent!',
        'Your request has been sent. You will be notified when they respond.',
        [{ text: 'OK', onPress: () => setShowUserModal(false) }]
      );
    } catch (error) {
      console.error('Error sending request:', error);
      Alert.alert('Error', 'Failed to send request. Please try again.');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleNavigateToChat = (otherUserId: string, otherUserName: string) => {
    navigation.navigate('Chat' as never, { otherUserId, otherUserName } as never);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading nearby creators...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Creators</Text>
        <View style={styles.locationToggle}>
          <Text style={styles.toggleLabel}>Share My Location</Text>
          <Switch
            value={isLocationShared}
            onValueChange={handleLocationToggle}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isLocationShared ? '#007AFF' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <GoogleMapView
          currentLocation={currentLocation}
          nearbyUsers={nearbyUsers.map(user => ({
            uid: user.uid,
            displayName: user.displayName,
            photoURL: user.photoURL,
            location: {
              latitude: user.location.latitude,
              longitude: user.location.longitude,
            },
            distance: user.distance,
            skills: user.skills || [],
            interests: user.interests || [],
          }))}
          onMarkerPress={handleMarkerPress}
          onMarkerLongPress={handleMarkerLongPress}
        />
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusItem}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>
            {isLocationShared ? 'Sharing location' : 'Location sharing disabled'}
          </Text>
        </View>
        <Text style={styles.userCount}>
          {nearbyUsers.length} creator{nearbyUsers.length !== 1 ? 's' : ''} nearby
        </Text>
      </View>

      {/* User Modal */}
      <UserModal
        visible={showUserModal}
        user={selectedUser}
        onClose={() => setShowUserModal(false)}
        onSendRequest={handleSendRequest}
      />
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
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  locationToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 16,
    color: '#666',
  },
  mapContainer: {
    flex: 1,
  },
  statusBar: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  userCount: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: width * 0.9,
    maxHeight: height * 0.8,
    padding: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    padding: 20,
  },
  bannerContainer: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  bannerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  creatorText: {
    color: 'white',
  },
  circleText: {
    color: '#FFD700', // Yellow color
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 15,
    position: 'relative',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#666',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 2,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  userCollege: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  userDistance: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#666',
  },
  moreText: {
    fontSize: 14,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  sendRequestButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    margin: 20,
    borderRadius: 10,
  },
  sendRequestText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default NearbyCreatorsScreen; 