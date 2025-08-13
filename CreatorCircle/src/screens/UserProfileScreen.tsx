import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { Profile, Post, SocialLink, SocialPlatform } from '../types';
import { UserService } from '../services/userService';
import { PostService } from '../services/postService';
import { MessagingService } from '../services/messagingService';
import { collaborationService } from '../services/collaborationService';
import { ProfileValidationService } from '../services/profileValidationService';
import PostCard from '../components/PostCard';
import CollaborationRequestModal from '../components/CollaborationRequestModal';
import CreatorCircleLoading from '../components/CreatorCircleLoading';
import { ImageUtils } from '../utils/imageUtils';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Avatar } from '../components/ui/Avatar';
import { Image } from 'expo-image';
import { FollowService } from '../services/followService';
import { useFollowersCount } from '../hooks/useFollowersCount';

type UserProfileRouteParams = {
  userId: string;
  userName?: string;
};

// Helpers to compute level progress thresholds (must match xpService)
function getLevelStart(level: number): number {
  if (level <= 1) return 0;
  if (level === 2) return 200;
  if (level === 3) return 500;
  if (level === 4) return 1000;
  if (level === 5) return 2000;
  return 4000 + (level - 6) * 2000;
}

function getNextLevelXp(level: number): number {
  if (level <= 1) return 200;
  if (level === 2) return 500;
  if (level === 3) return 1000;
  if (level === 4) return 2000;
  if (level === 5) return 4000;
  return getLevelStart(level) + 2000;
}

function detectPlatform(url: string): SocialPlatform {
  const u = url?.toLowerCase?.() || '';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('linkedin.com')) return 'linkedin';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
  if (u.includes('facebook.com')) return 'facebook';
  if (u.includes('github.com')) return 'github';
  if (u.includes('tiktok.com')) return 'tiktok';
  return 'website';
}

function platformIconName(platform: SocialPlatform): keyof typeof Ionicons.glyphMap {
  switch (platform) {
    case 'youtube':
      return 'logo-youtube';
    case 'instagram':
      return 'logo-instagram';
    case 'linkedin':
      return 'logo-linkedin';
    case 'twitter':
      return 'logo-twitter';
    case 'facebook':
      return 'logo-facebook';
    case 'github':
      return 'logo-github';
    case 'tiktok':
      return 'logo-tiktok';
    default:
      return 'link-outline';
  }
}

const UserProfileScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { userId, userName } = route.params as UserProfileRouteParams;
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [canChat, setCanChat] = useState(false);
  const [showCollaborationModal, setShowCollaborationModal] = useState(false);
  const [collaborationMessage, setCollaborationMessage] = useState('');
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [hasCollaborated, setHasCollaborated] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const liveFollowersCount = useFollowersCount(profile?.uid);

  const loadUserProfile = async () => {
    try {
      if (!userId) {
        console.error('userId is undefined');
        setLoading(false);
        return;
      }
      
      console.log('Loading profile for userId:', userId);
      
      // Use direct Firestore call for faster loading
      const userRef = doc(db, 'users', userId);
      const userSnapshot = await getDoc(userRef);
      
      if (userSnapshot.exists()) {
        const userData = { id: userSnapshot.id, ...userSnapshot.data() } as Profile;
        console.log('User profile loaded successfully:', userData.name);
        setProfile(userData);
        setLoading(false);
        
        // Check if this is the current user's profile
        if (user && user.uid === userId) {
          setIsOwnProfile(true);
        }
      } else {
        console.log('User not found in Firestore, creating fallback profile');
        // Create a fallback profile with basic information
        const fallbackProfile: Profile = {
          id: userId,
          uid: userId,
          name: userName || 'Unknown User',
          email: '',
          college: 'Unknown College',
          passion: '',
          about: '',
          profilePhotoUrl: '',
          bannerPhotoUrl: '',
          skills: [],
          interests: [],
          followers: 0,
          following: 0,
          connections: 0,
          isVerified: false,
          location: '',
          joinedDate: new Date(),
        };
        
        setProfile(fallbackProfile);
        setLoading(false);
        
        // Check if this is the current user's profile
        if (user && user.uid === userId) {
          setIsOwnProfile(true);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      
      // Create a fallback profile even on error
      const fallbackProfile: Profile = {
        uid: userId,
        name: userName || 'Unknown User',
        email: '',
        college: 'Unknown College',
        passion: '',
        aboutMe: '',
        profilePhotoUrl: '',
        bannerPhotoUrl: '',
        skills: [],
        interests: [],
        followers: 0,
        following: 0,
        connections: 0,
        isVerified: false,
        location: '',
        joinedDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      setProfile(fallbackProfile);
      setLoading(false);
      
      // Check if this is the current user's profile
      if (user && user.uid === userId) {
        setIsOwnProfile(true);
      }
    }
  };

  const loadUserPosts = async () => {
    try {
      if (!userId) {
        console.error('userId is undefined for posts');
        return;
      }
      
      console.log('Loading posts for userId:', userId);
      
      const unsubscribe = PostService.subscribeToUserPosts(userId, (newPosts) => {
        console.log('Posts loaded:', newPosts.length);
        setPosts(newPosts);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error loading user posts:', error);
      // Set empty posts array on error
      setPosts([]);
    }
  };

  const checkChatPermission = async () => {
    if (!user || !userId) {
      setCanChat(false);
      return;
    }
    
    try {
      console.log('Checking chat permission for users:', user.uid, userId);
      const canChatResult = await MessagingService.canUsersChat(user.uid, userId);
      console.log('Chat permission result:', canChatResult);
      setCanChat(canChatResult);
    } catch (error) {
      console.error('Error checking chat permission:', error);
      setCanChat(false);
    }
  };

  const checkCollaborationStatus = async () => {
    if (!user || !userId || user.uid === userId) {
      setHasCollaborated(false);
      setExistingRequest(null);
      return;
    }
    
    try {
      // Check if users have collaborated
      const collaborated = await collaborationService.haveUsersCollaborated(user.uid, userId);
      setHasCollaborated(collaborated);
      
      // If collaborated, ensure chat is allowed
      if (collaborated) {
        setCanChat(true);
      }
      
      // Check for existing request
      const existing = await collaborationService.getExistingRequest(user.uid, userId);
      setExistingRequest(existing);
    } catch (error) {
      console.error('Error checking collaboration status:', error);
      setHasCollaborated(false);
      setExistingRequest(null);
    }
  };

  useEffect(() => {
    if (!userId) {
      Alert.alert('Error', 'Invalid user ID');
      navigation.goBack();
      return;
    }
    
    // Load profile first, then other data
    const loadData = async () => {
      try {
        await loadUserProfile();
        // Load other data after profile is loaded
        await Promise.all([
          loadUserPosts(),
          checkChatPermission(),
          checkCollaborationStatus()
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };
    
    loadData();
  }, [userId]);

  // Subscribe to the viewed user's profile for live XP/level/badges updates
  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(doc(db, 'users', userId), (snap) => {
      const data: any = snap.data();
      if (data) {
        setProfile((prev) => prev ? ({
          ...prev,
          xp: data.xp ?? prev.xp,
          level: data.level ?? prev.level,
          badges: data.badges ?? prev.badges,
          updatedAt: data.updatedAt?.toDate?.() || prev.updatedAt,
        } as Profile) : prev);
      }
    });
    return () => unsub();
  }, [userId]);

  useEffect(() => {
    (async () => {
      if (!user?.uid || !userId) return;
      try {
        const following = await FollowService.isFollowing(user.uid, userId);
        setIsFollowing(following);
      } catch {}
    })();
  }, [user?.uid, userId]);

  // Prefetch key images to reduce perceived load time
  useEffect(() => {
    (async () => {
      if (profile?.profilePhotoUrl) {
        try { await Image.prefetch(profile.profilePhotoUrl); } catch {}
      }
      if (profile?.bannerPhotoUrl) {
        try { await Image.prefetch(profile.bannerPhotoUrl); } catch {}
      }
    })();
  }, [profile?.profilePhotoUrl, profile?.bannerPhotoUrl]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUserProfile(), loadUserPosts()]);
    setRefreshing(false);
  };

  const handleFollow = async () => {
    if (!user || !profile) return;
    if (user.uid === profile.uid) return;
    try {
      // optimistic
      setIsFollowing((prev) => !prev);
      if (!isFollowing) {
        await FollowService.followUser(user.uid, profile.uid);
      } else {
        await FollowService.unfollowUser(user.uid, profile.uid);
      }
    } catch (e: any) {
      // revert on error
      setIsFollowing((prev) => !prev);
      Alert.alert('Follow Error', e?.message || 'Failed to update follow');
    }
  };

  const handleMessage = async () => {
    if (!user || !userId || !profile) return;
    
    // If users have collaborated by any means, allow chat directly
    if (!canChat && !hasCollaborated) {
      Alert.alert(
        'Collaboration Required',
        'You need to collaborate with this user before you can message them.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Send Collaboration Request', onPress: () => setShowCollaborationModal(true) },
        ]
      );
      return;
    }
    
    try {
      const chatId = await MessagingService.getOrCreateChat(user.uid, userId);
      navigation.navigate('Chat' as never, {
        chatId,
        otherUserId: userId,
        otherUserName: profile.name,
      } as never);
    } catch (error) {
      console.error('Error creating chat:', error);
      Alert.alert('Error', 'Failed to start conversation');
    }
  };

  const handleCollaborate = () => {
    if (!user || !userId || !profile) return;
    
    if (isOwnProfile) {
      Alert.alert('Cannot Collaborate', 'You cannot collaborate with yourself!');
      return;
    }
    
    if (hasCollaborated) {
      // Show un-collaborate option
      Alert.alert(
        'Remove Collaboration',
        `Are you sure you want to remove your collaboration with ${profile.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Remove', 
            style: 'destructive',
            onPress: handleUnCollaborate
          }
        ]
      );
      return;
    }
    
    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        Alert.alert('Request Pending', 'You have already sent a collaboration request to this user.');
      } else if (existingRequest.status === 'declined') {
        Alert.alert('Request Declined', 'Your previous collaboration request was declined.');
      }
      return;
    }
    
    setShowCollaborationModal(true);
  };

  const handleUnCollaborate = async () => {
    if (!user || !userId) return;
    
    try {
      await collaborationService.removeCollaboration(user.uid, userId);
      
      // Update local state
      setHasCollaborated(false);
      setExistingRequest(null);
      
      Alert.alert('Success', 'Collaboration removed successfully!');
      
      // Refresh collaboration status
      checkCollaborationStatus();
    } catch (error) {
      console.error('Error removing collaboration:', error);
      Alert.alert('Error', 'Failed to remove collaboration');
    }
  };

  const sendCollaborationRequest = async () => {
    if (!user || !userId || !profile) return;
    
    try {
      // Get current user's profile
      const currentUserProfile = await UserService.getUserProfile(user.uid);
      
      // Check if current user's profile is complete
      const profileCheck = ProfileValidationService.canPerformAction(currentUserProfile, 'send_collaboration_request');
      if (!profileCheck.allowed) {
        setShowCollaborationModal(false);
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

      await collaborationService.sendCollaborationRequest(
        user.uid,
        userId,
        collaborationMessage.trim()
      );
      
      setShowCollaborationModal(false);
      setCollaborationMessage('');
      
      Alert.alert(
        'Request Sent!',
        `Collaboration request sent to ${profile.name} from ${profile.college}. They will be notified and can accept or decline your request.`
      );
      
      // Refresh collaboration status
      checkCollaborationStatus();
    } catch (error) {
      console.error('Error sending collaboration request:', error);
      Alert.alert('Error', 'Failed to send collaboration request');
    }
  };

  const handlePostUpdate = () => {
    // Refresh posts when a post is updated
    loadUserPosts();
  };

  if (loading) {
    return (
      <CreatorCircleLoading 
        message={`Loading ${route.params?.userName || 'profile'}...`}
        size="medium"
      />
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{profile.name}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Banner and Profile Image */}
        <View style={styles.bannerSection}>
          {/* Banner Image */}
          {profile.bannerPhotoUrl && (
            <View style={styles.bannerContainer}>
              <Image 
                source={{ uri: profile.bannerPhotoUrl }} 
                style={styles.bannerImage}
                contentFit="cover"
                cachePolicy="disk"
                transition={200}
              />
            </View>
          )}
          {/* Profile Image - Overlapping the banner */}
          <View style={styles.profileImageContainer}>
            <Avatar
              size="xlarge"
              source={profile.profilePhotoUrl}
              fallback={profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
              verified={profile.isVerified}
            />
          </View>
        </View>

        {/* Profile Info */}
        <View style={styles.profileInfoSection}>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.college}>{profile.college}</Text>
            {profile.location && (
              <Text style={styles.location}>
                <Ionicons name="location-outline" size={14} color="#666" />
                {' '}{profile.location}
              </Text>
            )}
          </View>

          {/* XP & Level */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>XP & Level</Text>
            {(() => {
              const xp = profile.xp ?? 0;
              const level = profile.level ?? 1;
              const start = getLevelStart(level);
              const next = getNextLevelXp(level);
              const progress = next > start ? Math.min(100, Math.max(0, ((xp - start) / (next - start)) * 100)) : 0;
              return (
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600' }}>Level {level}</Text>
                    <Text style={{ fontSize: 14, color: '#666' }}>{xp} / {next} XP</Text>
                  </View>
                  <View style={styles.progressBar}> 
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                  </View>
                  {profile.badges && profile.badges.length > 0 && (
                    <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap' }}>
                      {profile.badges.map((b, i) => (
                        <View key={`${b}-${i}`} style={styles.xpBadge}>
                          <Ionicons name="ribbon-outline" size={14} color="#6A5ACD" />
                          <Text style={styles.xpBadgeText}>{b}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })()}
          </View>

          {/* Action Buttons */}
          {!isOwnProfile && (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.followButton} onPress={handleFollow}>
                <Ionicons name={isFollowing ? "person-remove-outline" : "person-add-outline"} size={16} color="white" />
                <Text style={styles.followButtonText}>{isFollowing ? 'Unfollow' : 'Follow'}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
                <Ionicons name="mail-outline" size={16} color="#007AFF" />
                <Text style={styles.messageButtonText}>Message</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.collaborateButton, 
                  hasCollaborated && styles.collaboratedButton
                ]} 
                onPress={handleCollaborate}
              >
                <Ionicons 
                  name="people-outline" 
                  size={16} 
                  color={hasCollaborated ? 'white' : '#007AFF'} 
                />
                <Text style={[
                  styles.collaborateButtonText,
                  hasCollaborated && styles.collaboratedButtonText
                ]}>
                  {hasCollaborated 
                    ? 'Collaborated' 
                    : existingRequest 
                      ? existingRequest.status === 'pending' 
                        ? 'Pending' 
                        : existingRequest.status === 'declined' 
                          ? 'Declined' 
                          : 'Collaborate'
                      : 'Collaborate'
                  }
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* About Section */}
        {profile.aboutMe && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.aboutText}>{profile.aboutMe}</Text>
          </View>
        )}

        {/* Skills Section */}
        {profile.skills && profile.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.chipsContainer}>
              {profile.skills.map((skill, index) => (
                <View key={index} style={styles.skillChip}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Interests Section */}
        {profile.interests && profile.interests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.chipsContainer}>
              {profile.interests.map((interest, index) => (
                <View key={index} style={styles.interestChip}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Social Links Section */}
        {profile.socialLinks && profile.socialLinks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Social</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {profile.socialLinks.map((link, idx) => (
                <TouchableOpacity
                  key={`${link.platform || detectPlatform(link.url)}-${idx}`}
                  style={styles.socialIcon}
                  onPress={() => Linking.openURL(link.url)}
                >
                  <Ionicons name={platformIconName(link.platform || detectPlatform(link.url))} size={22} color="#333" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Social Stats */}
        <View style={styles.socialStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{liveFollowersCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile.following || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile.connections || 0}</Text>
            <Text style={styles.statLabel}>Connections</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{posts.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
        </View>

        {/* Posts Section */}
        <View style={styles.postsSection}>
          <View style={styles.postsHeader}>
            <Text style={styles.sectionTitle}>Posts</Text>
          </View>
          {posts.length > 0 ? (
            posts.map((post) => (
              <PostCard key={post.id} post={post} onPostUpdate={handlePostUpdate} />
            ))
          ) : (
            <View style={styles.emptyPosts}>
              <Ionicons name="newspaper-outline" size={48} color="#ccc" />
              <Text style={styles.emptyPostsText}>No posts yet</Text>
            </View>
          )}
        </View>

        {/* Mutuals Section */}
        {user && !isOwnProfile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mutuals</Text>
            <Mutuals userIdA={user.uid} userIdB={profile.uid} />
          </View>
        )}
      </ScrollView>

      {/* Collaboration Request Modal */}
      <Modal
        visible={showCollaborationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCollaborationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Collaboration Request</Text>
              <TouchableOpacity onPress={() => setShowCollaborationModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalSubtitle}>
                Send a collaboration request to {profile.name} from {profile.college}
              </Text>
              
              {profile.skills && profile.skills.length > 0 && (
                <Text style={styles.modalSkills}>
                  Skills: {profile.skills.slice(0, 3).join(', ')}
                  {profile.skills.length > 3 && '...'}
                </Text>
              )}
              
              {profile.interests && profile.interests.length > 0 && (
                <Text style={styles.modalInterests}>
                  Interests: {profile.interests.slice(0, 2).join(', ')}
                  {profile.interests.length > 2 && '...'}
                </Text>
              )}
              
              <Text style={styles.modalLabel}>Message (optional):</Text>
              <TextInput
                style={styles.modalInput}
                value={collaborationMessage}
                onChangeText={setCollaborationMessage}
                placeholder="Tell them why you want to collaborate..."
                multiline
                maxLength={200}
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowCollaborationModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalSendButton}
                onPress={sendCollaborationRequest}
              >
                <Text style={styles.modalSendText}>Send Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSpacer: {
    width: 40,
  },
  bannerSection: {
    position: 'relative',
  },
  bannerContainer: {
    height: 150,
    backgroundColor: '#f0f0f0',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileImageContainer: {
    position: 'absolute',
    bottom: -50,
    left: 20,
    zIndex: 10,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'white',
  },
  defaultAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  defaultAvatarText: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  profileInfoSection: {
    backgroundColor: 'white',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileInfo: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  college: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  followButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  followButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  messageButton: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  messageButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  collaborateButton: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  collaborateButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  collaboratedButton: {
    backgroundColor: '#4CAF50', // Green background for collaborated
    borderColor: '#4CAF50',
  },
  collaboratedButtonText: {
    color: 'white',
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  aboutText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    fontSize: 14,
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
    fontSize: 14,
    color: '#7b1fa2',
    fontWeight: '500',
  },
  socialStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    padding: 20,
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  postsSection: {
    backgroundColor: 'white',
    paddingTop: 20,
    paddingBottom: 20,
    marginTop: 8,
  },
  postsHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  emptyPosts: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyPostsText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '80%',
    maxHeight: '70%',
    padding: 20,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalSkills: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  modalInterests: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
    alignSelf: 'flex-start',
  },
  modalInput: {
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalCancelButton: {
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    width: '40%',
  },
  modalCancelText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalSendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    width: '40%',
  },
  modalSendText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  xpBadge: {
    backgroundColor: '#f3f0ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#d6ccff',
    flexDirection: 'row',
    alignItems: 'center',
  },
  xpBadgeText: {
    color: '#6A5ACD',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  socialIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f3f3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
});

// helper component to fetch and render mutuals
const Mutuals: React.FC<{ userIdA: string; userIdB: string; }> = ({ userIdA, userIdB }) => {
  const [mutualFollowers, setMutualFollowers] = useState<string[]>([]);
  const [mutualConnections, setMutualConnections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [mf, mc] = await Promise.all([
          FollowService.getMutualFollowers(userIdA, userIdB),
          FollowService.getMutualConnections(userIdA, userIdB),
        ]);
        setMutualFollowers(mf);
        setMutualConnections(mc);
      } finally {
        setLoading(false);
      }
    })();
  }, [userIdA, userIdB]);

  if (loading) {
    return (
      <View style={{ paddingVertical: 8 }}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }

  return (
    <View>
      <Text style={{ fontWeight: '600', marginBottom: 6 }}>Mutual Followers ({mutualFollowers.length})</Text>
      {mutualFollowers.length === 0 ? (
        <Text style={{ color: '#777' }}>None</Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {mutualFollowers.slice(0, 12).map((id) => (
            <View key={id} style={{ backgroundColor: '#f0f8ff', borderColor: '#007AFF', borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, marginBottom: 6 }}>
              <Text style={{ color: '#007AFF', fontWeight: '500' }}>{id}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 8 }} />

      <Text style={{ fontWeight: '600', marginBottom: 6 }}>Mutual Connections ({mutualConnections.length})</Text>
      {mutualConnections.length === 0 ? (
        <Text style={{ color: '#777' }}>None</Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {mutualConnections.slice(0, 12).map((id) => (
            <View key={id} style={{ backgroundColor: '#fff0f0', borderColor: '#ff6b6b', borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, marginBottom: 6 }}>
              <Text style={{ color: '#ff6b6b', fontWeight: '500' }}>{id}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default UserProfileScreen; 