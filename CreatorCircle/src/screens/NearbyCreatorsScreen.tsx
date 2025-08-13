import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Linking,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Derive available chip options from nearby users (fallback to profile lists)
  const availableSkills = useMemo(() => {
    const set = new Set<string>();
    nearbyUsers.forEach(u => (u.skills || []).forEach((s) => set.add(s)));
    (userProfile?.skills || []).forEach((s: string) => set.add(s));
    return Array.from(set).slice(0, 20);
  }, [nearbyUsers, userProfile]);

  const availableInterests = useMemo(() => {
    const set = new Set<string>();
    nearbyUsers.forEach(u => (u.interests || []).forEach((i) => set.add(i)));
    (userProfile?.interests || []).forEach((i: string) => set.add(i));
    return Array.from(set).slice(0, 20);
  }, [nearbyUsers, userProfile]);

  // Suggestions based on query
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as Array<{ type: 'user'|'skill'|'interest'; id: string; label: string; payload?: any } >;
    const skillSugg = availableSkills
      .filter((s) => s.toLowerCase().includes(q))
      .slice(0, 5)
      .map((s) => ({ type: 'skill' as const, id: `skill-${s}`, label: s }));
    const interestSugg = availableInterests
      .filter((i) => i.toLowerCase().includes(q))
      .slice(0, 5)
      .map((i) => ({ type: 'interest' as const, id: `interest-${i}`, label: i }));
    const userSugg = nearbyUsers
      .filter((u) => (u.displayName || '').toLowerCase().includes(q))
      .slice(0, 8)
      .map((u) => ({ type: 'user' as const, id: u.uid, label: u.displayName || 'Unknown', payload: u }));
    return [...userSugg, ...skillSugg, ...interestSugg].slice(0, 10);
  }, [query, availableSkills, availableInterests, nearbyUsers]);

  // Filter users client-side by selected skills/interests
  const filteredUsers = useMemo(() => {
    return nearbyUsers.filter((u) => {
      const skillOk = selectedSkills.length === 0 || (u.skills || []).some(s => selectedSkills.includes(s));
      const interestOk = selectedInterests.length === 0 || (u.interests || []).some(i => selectedInterests.includes(i));
      return skillOk && interestOk;
    });
  }, [nearbyUsers, selectedSkills, selectedInterests]);

  // Ask for foreground permission (with Settings fallback) when needed
  const ensureForegroundPermission = async (): Promise<boolean> => {
    const hasFg = await locationService.checkLocationPermission();
    if (hasFg) return true;
    const granted = await locationService.requestLocationPermission();
    if (granted) return true;

    Alert.alert(
      'Permission needed',
      'Please allow location access in device settings to use Nearby Creators.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  };

  useEffect(() => {
    initializeLocation();
    return () => {
      locationService.stopLocationTracking();
    };
  }, []);

  const initializeLocation = async () => {
    try {
      setLoading(true);

      // Load user profile
      let loadedProfile: any = null;
      if (user?.uid) {
        loadedProfile = await UserService.getUserProfile(user.uid);
        setUserProfile(loadedProfile);
      }

      // Restore toggle state
      const saved = await AsyncStorage.getItem(STORAGE_KEY_TOGGLE);
      const enabled = saved ? JSON.parse(saved) : false;
      setIsLocationShared(enabled);

      // Request permission explicitly
      const hasPermission = await ensureForegroundPermission();

      // Get current device location
      const location = hasPermission ? await locationService.getCurrentLocation() : null;
      let initialLocationUpdate: LocationUpdate | null = null;
      if (location) {
        initialLocationUpdate = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy ?? undefined,
          timestamp: location.timestamp ?? Date.now(),
        };
        setCurrentLocation(initialLocationUpdate);
      }

      // If previously enabled, start sharing and listening using freshly loaded data
      if (enabled && user?.uid && loadedProfile && initialLocationUpdate) {
        // Only auto-start if foreground permission is granted
        const hasFg = await locationService.checkLocationPermission();
        if (hasFg) {
        await locationService.enableSharing(
          user.uid,
          {
              displayName: loadedProfile.name || user.email || 'Unknown',
              college: loadedProfile.college || 'Unknown',
              skills: loadedProfile.skills || [],
              interests: loadedProfile.interests || [],
              verified: loadedProfile.isVerified || false,
              photoURL: loadedProfile.profilePhotoUrl || undefined,
          },
          (locationUpdate) => setCurrentLocation(locationUpdate)
        );
          locationService.listenToNearbyUsers(user.uid, initialLocationUpdate, setNearbyUsers);
        }
      }

      setLoading(false);
    } catch (error: any) {
      console.warn('Error initializing location:', error);
      setIsLocationShared(false);
      await AsyncStorage.setItem(STORAGE_KEY_TOGGLE, JSON.stringify(false));
      setLoading(false);
    }
  };

  const handleLocationToggle = async (enabled: boolean) => {
    try {
      if (!user?.uid) {
        Alert.alert('Error', 'User not available');
        return;
      }

      // Optimistic UI
      setIsLocationShared(enabled);
      await AsyncStorage.setItem(STORAGE_KEY_TOGGLE, JSON.stringify(enabled));

      if (enabled) {
        // Ensure permission now
        const ok = await ensureForegroundPermission();
        if (!ok) {
          setIsLocationShared(false);
          await AsyncStorage.setItem(STORAGE_KEY_TOGGLE, JSON.stringify(false));
          return;
        }

        // Ensure profile is loaded
        const profile = userProfile || (await UserService.getUserProfile(user.uid));
        if (!profile) {
          throw new Error('User profile not available');
        }
        if (!userProfile) setUserProfile(profile);

        // Ensure current device location is available
        let baseLocation = currentLocation;
        if (!baseLocation) {
          const loc = await locationService.getCurrentLocation();
          if (!loc) throw new Error('Location permission not granted');
          baseLocation = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy ?? undefined,
            timestamp: loc.timestamp ?? Date.now(),
          };
          setCurrentLocation(baseLocation);
        }

        // Start sharing and listen for nearby users
        await locationService.enableSharing(
          user.uid,
          {
            displayName: profile.name || user.email || 'Unknown',
            college: profile.college || 'Unknown',
            skills: profile.skills || [],
            interests: profile.interests || [],
            verified: profile.isVerified || false,
            photoURL: profile.profilePhotoUrl || undefined,
          },
          (locationUpdate) => setCurrentLocation(locationUpdate)
        );

          locationService.listenToNearbyUsers(
            user.uid,
          baseLocation,
            (users) => setNearbyUsers(users)
          );
      } else {
        await locationService.disableSharing(user.uid);
        setNearbyUsers([]);
        setSelectedUser(null);
        setShowUserModal(false);
      }
    } catch (error: any) {
      console.error('Error toggling location:', error);
      const message = String(error?.message || error);
      if (message.includes('permission')) {
        Alert.alert(
          'Permission Needed',
          'Please enable location access in device settings to share your location.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      } else {
      Alert.alert('Error', 'Failed to update location sharing');
      }
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
    <SafeAreaView style={styles.container} edges={['top','bottom']}>
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
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#777" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search creators, skills, interests"
            placeholderTextColor="#999"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        {(searchFocused || !!query) && suggestions.length > 0 && (
          <View style={styles.suggestionsPanel}>
            {suggestions.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={styles.suggestionRow}
                onPress={() => {
                  if (s.type === 'user' && s.payload) {
                    setSelectedUser(s.payload);
                    setShowUserModal(true);
                  } else if (s.type === 'skill') {
                    setSelectedSkills((prev) => prev.includes(s.label) ? prev : [...prev, s.label]);
                  } else if (s.type === 'interest') {
                    setSelectedInterests((prev) => prev.includes(s.label) ? prev : [...prev, s.label]);
                  }
                  setQuery('');
                  setSearchFocused(false);
                }}
              >
                <Ionicons
                  name={s.type === 'user' ? 'person-outline' : s.type === 'skill' ? 'pricetag-outline' : 'hash'}
                  size={16}
                  color="#555"
                />
                <Text style={styles.suggestionText}>{s.type === 'interest' ? `#${s.label}` : s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filtersBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          <TouchableOpacity
            style={[styles.filterChip, (selectedSkills.length>0 || selectedInterests.length>0) && styles.filterChipSecondary]}
            onPress={() => { setSelectedSkills([]); setSelectedInterests([]); }}
          >
            <Ionicons name="filter" size={14} color="#007AFF" />
            <Text style={styles.filterChipText}>All</Text>
          </TouchableOpacity>

          {availableSkills.map((s) => {
            const active = selectedSkills.includes(s);
            return (
              <TouchableOpacity
                key={`skill-${s}`}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedSkills(prev => active ? prev.filter(x => x!==s) : [...prev, s])}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{s}</Text>
              </TouchableOpacity>
            );
          })}

          {availableInterests.map((i) => {
            const active = selectedInterests.includes(i);
            return (
              <TouchableOpacity
                key={`interest-${i}`}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedInterests(prev => active ? prev.filter(x => x!==i) : [...prev, i])}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>#{i}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <GoogleMapView
          currentLocation={currentLocation}
          nearbyUsers={filteredUsers.map(user => ({
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
          <View style={[styles.statusDot, !isLocationShared && styles.statusDotDisabled]} />
          <Text style={styles.statusText}>
            {isLocationShared ? 'Sharing location' : 'Location sharing disabled'}
          </Text>
        </View>
        <Text style={styles.userCount}>
          {filteredUsers.length} creator{filteredUsers.length !== 1 ? 's' : ''} nearby
        </Text>
      </View>

      {/* User Modal */}
      <UserModal
        visible={showUserModal}
        user={selectedUser}
        onClose={() => setShowUserModal(false)}
        onSendRequest={handleSendRequest}
      />
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
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
    backgroundColor: '#fafafa',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: '#333',
  },
  suggestionsPanel: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  suggestionText: {
    marginLeft: 8,
    color: '#333',
  },
  filtersBar: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  chipsRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  filterChipSecondary: {
    borderColor: '#999',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipText: {
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  filterChipTextActive: {
    color: 'white',
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
  statusDotDisabled: {
    backgroundColor: '#bbb',
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