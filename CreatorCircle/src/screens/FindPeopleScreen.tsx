import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Profile } from '../types';
import { collaborationService } from '../services/collaborationService';
import { UserService } from '../services/userService';
import { ProfileValidationService } from '../services/profileValidationService';
import LoadingScreen from '../components/LoadingScreen';
import { ImageUtils } from '../utils/imageUtils';
import { Avatar } from '../components/ui/Avatar';
import { SearchHistoryService, ViewedProfile } from '../services/searchHistoryService';
import RecentlyViewedCard from '../components/RecentlyViewedCard';
import { useScroll } from '../contexts/ScrollContext';

const { width: screenWidth } = Dimensions.get('window');

const FindPeopleScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { notifyScroll } = useScroll();
  const [users, setUsers] = useState<Profile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collaborationStatus, setCollaborationStatus] = useState<{[key: string]: boolean}>({});
  const [recentlyViewed, setRecentlyViewed] = useState<ViewedProfile[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadUsers();
    loadRecentlyViewed();
  }, []);

  useEffect(() => {
    if (users.length > 0 && user) {
      checkCollaborationStatuses();
    }
  }, [users, user]);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, users]);

  const checkCollaborationStatuses = async () => {
    if (!user) return;
    
    const statuses: {[key: string]: boolean} = {};
    
    for (const targetUser of users) {
      if (targetUser.uid !== user.uid) {
        try {
          const hasCollaborated = await CollaborationService.haveUsersCollaborated(user.uid, targetUser.uid);
          statuses[targetUser.uid] = hasCollaborated;
        } catch (error) {
          console.error('Error checking collaboration status:', error);
          statuses[targetUser.uid] = false;
        }
      }
    }
    
    setCollaborationStatus(statuses);
  };

  const loadUsers = async () => {
    try {
      console.log('Starting to load users...');
      const usersRef = collection(db, 'users');
      // Get all users first, then filter in JavaScript
      const querySnapshot = await getDocs(usersRef);
      
      console.log(`Found ${querySnapshot.size} total users in database`);
      
      if (querySnapshot.empty) {
        console.log('No users found in database');
        setUsers([]);
        return;
      }
      
      const usersData: Profile[] = [];
      querySnapshot.forEach((doc) => {
        const userData = { 
          id: doc.id, 
          uid: doc.id, // Ensure uid is set to document ID
          ...doc.data() 
        } as Profile;
        console.log(`Processing user: ${userData.name} (UID: ${userData.uid})`);
        // Filter out the current user
        if (userData.uid !== user?.uid) {
          usersData.push(userData);
        } else {
          console.log(`Skipping current user: ${userData.name}`);
        }
      });
      
      console.log(`Loaded ${usersData.length} users from database (excluding current user)`);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users. Please check your connection and try again.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = users.filter((user) => {
      const nameMatch = user.name?.toLowerCase().includes(query);
      const collegeMatch = user.college?.toLowerCase().includes(query);
      const skillsMatch = user.skills?.some(skill => 
        skill.toLowerCase().includes(query)
      );
      const interestsMatch = user.interests?.some(interest => 
        interest.toLowerCase().includes(query)
      );
      
      return nameMatch || collegeMatch || skillsMatch || interestsMatch;
    });

    setFilteredUsers(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const loadRecentlyViewed = async () => {
    if (!user?.uid) return;
    
    try {
      const history = await SearchHistoryService.getRecentlyViewed(user.uid);
      setRecentlyViewed(history);
    } catch (error) {
      console.error('Error loading recently viewed:', error);
    }
  };

  const handleUserPress = async (userProfile: Profile) => {
    console.log('Navigating to user profile:', {
      uid: userProfile.uid,
      name: userProfile.name,
      id: userProfile.id
    });
    
    if (!userProfile.uid) {
      console.error('userProfile.uid is undefined or empty');
      Alert.alert('Error', 'Invalid user profile');
      return;
    }
    
    // Add to recently viewed
    if (user?.uid) {
      await SearchHistoryService.addToRecentlyViewed(user.uid, {
        userId: userProfile.uid,
        name: userProfile.name,
        profilePhotoUrl: userProfile.profilePhotoUrl,
        college: userProfile.college,
      });
      // Reload recently viewed
      loadRecentlyViewed();
    }
    
    navigation.navigate('UserProfile' as never, {
      userId: userProfile.uid,
      userName: userProfile.name,
    } as never);
  };

  const handleRecentlyViewedPress = async (viewedProfile: ViewedProfile) => {
    // Update the viewed time
    if (user?.uid) {
      await SearchHistoryService.addToRecentlyViewed(user.uid, {
        userId: viewedProfile.userId,
        name: viewedProfile.name,
        profilePhotoUrl: viewedProfile.profilePhotoUrl,
        college: viewedProfile.college,
      });
      // Reload recently viewed
      loadRecentlyViewed();
    }
    
    navigation.navigate('UserProfile' as never, {
      userId: viewedProfile.userId,
      userName: viewedProfile.name,
    } as never);
  };

  const handleRemoveFromHistory = async (userId: string) => {
    if (!user?.uid) return;
    
    try {
      await SearchHistoryService.removeFromHistory(user.uid, userId);
      setRecentlyViewed(prev => prev.filter(profile => profile.userId !== userId));
    } catch (error) {
      console.error('Error removing from history:', error);
    }
  };

  const handleClearHistory = async () => {
    if (!user?.uid) return;
    
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all recently viewed profiles?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await SearchHistoryService.clearHistory(user.uid);
              setRecentlyViewed([]);
            } catch (error) {
              console.error('Error clearing history:', error);
            }
          },
        },
      ]
    );
  };

  const handleCollaborate = async (targetUser: Profile) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to send collaboration requests');
      return;
    }

    if (user.uid === targetUser.uid) {
      Alert.alert('Cannot Collaborate', 'You cannot collaborate with yourself!');
      return;
    }

    // Check if already collaborated
    const hasCollaborated = collaborationStatus[targetUser.uid];
    if (hasCollaborated) {
      // Show un-collaborate option
      Alert.alert(
        'Remove Collaboration',
        `Are you sure you want to remove your collaboration with ${targetUser.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Remove', 
            style: 'destructive',
            onPress: () => handleUnCollaborate(targetUser)
          }
        ]
      );
      return;
    }

    try {
      // Get current user's profile
      const currentUserProfile = await UserService.getUserProfile(user.uid);
      
      // Check if current user's profile is complete
      const profileCheck = ProfileValidationService.canPerformAction(currentUserProfile, 'send_collaboration_request');
      if (!profileCheck.allowed) {
        Alert.alert('Profile Incomplete', profileCheck.message, [
          { text: 'OK', style: 'default' },
          { 
            text: 'Complete Profile', 
            style: 'default',
            onPress: () => navigation.navigate('Profile' as never)
          }
        ]);
        return;
      }

      // Check if users have already collaborated
      const hasCollaboratedCheck = await CollaborationService.haveUsersCollaborated(user.uid, targetUser.uid);
      if (hasCollaboratedCheck) {
        Alert.alert('Already Collaborated', 'You have already collaborated with this user!');
        return;
      }

      // Check for existing request
      const existingRequest = await CollaborationService.getExistingRequest(user.uid, targetUser.uid);
      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          Alert.alert('Request Pending', 'You have already sent a collaboration request to this user.');
        } else if (existingRequest.status === 'declined') {
          Alert.alert('Request Declined', 'Your previous collaboration request was declined.');
        }
        return;
      }

      // Send collaboration request
              await collaborationService.sendCollaborationRequest(user.uid, targetUser.uid, 'I would like to collaborate with you!');
      Alert.alert(
        'Request Sent!',
        `Collaboration request sent to ${targetUser.name} from ${targetUser.college}. They will be notified and can accept or decline your request.`
      );
    } catch (error) {
      console.error('Error sending collaboration request:', error);
      Alert.alert('Error', 'Failed to send collaboration request');
    }
  };

  const handleUnCollaborate = async (targetUser: Profile) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to remove collaboration.');
      return;
    }

    try {
      await CollaborationService.removeCollaboration(user.uid, targetUser.uid);
      Alert.alert('Success!', `Collaboration with ${targetUser.name} has been removed.`);
      setCollaborationStatus(prev => ({ ...prev, [targetUser.uid]: false }));
    } catch (error) {
      console.error('Error removing collaboration:', error);
      Alert.alert('Error', 'Failed to remove collaboration.');
    }
  };

  const renderSkillChip = (skill: string, index: number) => (
    <View key={index} style={styles.skillChip}>
      <Text style={styles.skillText}>{skill}</Text>
    </View>
  );

  const renderInterestChip = (interest: string, index: number) => (
    <View key={index} style={styles.interestChip}>
      <Text style={styles.interestText}>#{interest}</Text>
    </View>
  );

  const renderUserItem = ({ item }: { item: Profile }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => handleUserPress(item)}
      activeOpacity={0.7}
    >
      {/* Banner Image */}
      {item.bannerPhotoUrl && (
        <View style={styles.bannerContainer}>
          <Image 
            source={ImageUtils.getImageSource(item.bannerPhotoUrl)} 
            style={styles.bannerImage}
            onError={ImageUtils.getImageErrorHandler('FindPeopleScreen-banner')}
            onLoad={ImageUtils.getImageSuccessHandler('FindPeopleScreen-banner')}
            defaultSource={{ uri: 'https://via.placeholder.com/400x200/007AFF/FFFFFF?text=Banner' }}
          />
        </View>
      )}
      
      <View style={styles.userHeader}>
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Avatar
              size="large"
              source={item.profilePhotoUrl}
              fallback={item.name ? item.name.charAt(0).toUpperCase() : 'U'}
              verified={item.isVerified}
            />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name || 'Anonymous'}</Text>
            <Text style={styles.userCollege}>{item.college || 'College not specified'}</Text>
            {item.location && (
              <Text style={styles.userLocation}>
                <Ionicons name="location-outline" size={12} color="#666" />
                {' '}{item.location}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.collaborateButton,
            collaborationStatus[item.uid] && styles.collaboratedButton
          ]}
          onPress={(e) => {
            e.stopPropagation();
            handleCollaborate(item);
          }}
        >
          <Ionicons 
            name="people-outline" 
            size={16} 
            color={collaborationStatus[item.uid] ? 'white' : '#007AFF'} 
          />
          <Text style={[
            styles.collaborateText,
            collaborationStatus[item.uid] && styles.collaboratedText
          ]}>
            {collaborationStatus[item.uid] ? 'Collaborated' : 'Collaborate'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.userDetails}>
        {/* Skills Section */}
        {item.skills && item.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.chipsContainer}>
              {item.skills.slice(0, 5).map(renderSkillChip)}
              {item.skills.length > 5 && (
                <Text style={styles.moreText}>+{item.skills.length - 5} more</Text>
              )}
            </View>
          </View>
        )}

        {/* Interests Section */}
        {item.interests && item.interests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.chipsContainer}>
              {item.interests.slice(0, 5).map(renderInterestChip)}
              {item.interests.length > 5 && (
                <Text style={styles.moreText}>+{item.interests.length - 5} more</Text>
              )}
            </View>
          </View>
        )}

        {/* About Section */}
        {item.aboutMe && (
          <View style={styles.aboutSection}>
            <Text style={styles.aboutLabel}>About</Text>
            <Text style={styles.aboutText} numberOfLines={3}>
              {item.aboutMe}
            </Text>
          </View>
        )}

        {/* Social Stats */}
        <View style={styles.socialStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{item.followers || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{item.following || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{item.connections || 0}</Text>
            <Text style={styles.statLabel}>Connections</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading creators...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find People</Text>
        <Text style={styles.headerSubtitle}>Connect with creators worldwide</Text>
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, college, skills, or interests..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id || item.uid}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          const scrollY = event.nativeEvent.contentOffset.y;
          notifyScroll(scrollY);
        }}
        scrollEventThrottle={16}
        ListHeaderComponent={
          recentlyViewed.length > 0 && !searchQuery ? (
            <View style={styles.recentlyViewedSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recently Viewed</Text>
                <TouchableOpacity onPress={handleClearHistory} style={styles.clearHistoryButton}>
                  <Ionicons name="trash-outline" size={16} color="#666" />
                  <Text style={styles.clearHistoryText}>Clear</Text>
                </TouchableOpacity>
              </View>
              {recentlyViewed.slice(0, 5).map((profile) => (
                <RecentlyViewedCard
                  key={profile.userId}
                  profile={profile}
                  onPress={handleRecentlyViewedPress}
                  onRemove={handleRemoveFromHistory}
                />
              ))}
              <View style={styles.sectionDivider} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No users found' : 'No users available'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'Check back later for more creators'
              }
            </Text>
          </View>
        }
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
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  clearButton: {
    marginLeft: 8,
  },
  listContainer: {
    padding: 16,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  bannerContainer: {
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingTop: 12,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  defaultAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userCollege: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userLocation: {
    fontSize: 12,
    color: '#666',
  },
  collaborateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  collaborateText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  collaboratedButton: {
    backgroundColor: '#4CAF50', // A green color for collaboration
    borderColor: '#4CAF50',
  },
  collaboratedText: {
    color: 'white',
  },
  userDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  skillChip: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 6,
  },
  skillText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  interestChip: {
    backgroundColor: '#f3e5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 6,
  },
  interestText: {
    fontSize: 12,
    color: '#7b1fa2',
    fontWeight: '500',
  },
  moreText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  aboutSection: {
    marginBottom: 16,
  },
  aboutLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  aboutText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  socialStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  recentlyViewedSection: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  clearHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearHistoryText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
    marginTop: 16,
  },
});

export default FindPeopleScreen; 