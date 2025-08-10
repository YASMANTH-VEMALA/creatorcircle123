import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { UserService } from '../services/userService';
import { PostService } from '../services/postService';
import { ProfileValidationService, ProfileCompletionStatus } from '../services/profileValidationService';
import { ProfileImageService } from '../services/profileImageService';
import { Profile, Post } from '../types';
import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';
import PostCard from '../components/PostCard';
import { Avatar } from '../components/ui/Avatar';
import { PremiumService } from '../services/premiumService';
import { useScroll } from '../contexts/ScrollContext';
// XP: subscribe to xp logs and profile
import { collection, onSnapshot, query, orderBy, limit, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

const { width } = Dimensions.get('window');

interface UserPost {
  id: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  createdAt: Date;
}

// XP log entry interface
interface XpLogEntry {
  id: string;
  action: string;
  delta: number;
  note?: string;
  createdAt: Date;
}

// Helpers to compute level progress thresholds matching xpService
function getLevelStart(level: number): number {
  if (level <= 1) return 0;
  if (level === 2) return 200;
  if (level === 3) return 500;
  if (level === 4) return 1000;
  if (level === 5) return 2000;
  // Level 6+: starts at 4000 then +2000 per level
  return 4000 + (level - 6) * 2000;
}

function getNextLevelXp(level: number): number {
  if (level <= 1) return 200;
  if (level === 2) return 500;
  if (level === 3) return 1000;
  if (level === 4) return 2000;
  if (level === 5) return 4000;
  // Level 6+: +2000 per level
  return getLevelStart(level) + 2000;
}

const ProfileScreen: React.FC = () => {
  const { user } = useAuth();
  const { notifyScroll } = useScroll();
  const [profile, setProfile] = useState<Profile>({
    uid: user?.uid || '',
    email: user?.email || '',
    name: '',
    college: '',
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
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [newInterest, setNewInterest] = useState('');
  const [completionStatus, setCompletionStatus] = useState<ProfileCompletionStatus>({
    isComplete: false,
    missingFields: [],
    completionPercentage: 0
  });
  const [verifiedBadge, setVerifiedBadge] = useState<'none' | 'silver' | 'gold'>('none');
  // XP state
  const [xpLogs, setXpLogs] = useState<XpLogEntry[]>([]);
  const [showXpLog, setShowXpLog] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadProfile();
      subscribeToUserPosts();
      // Subscribe to XP logs
      const qxp = query(
        collection(db, 'users', user.uid, 'xp_logs'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const unsubXp = onSnapshot(qxp, (snapshot) => {
        const logs: XpLogEntry[] = [];
        snapshot.forEach((d) => {
          const data: any = d.data();
          logs.push({
            id: d.id,
            action: data.action,
            delta: data.delta,
            note: data.note,
            createdAt: data.createdAt?.toDate?.() || new Date(),
          });
        });
        setXpLogs(logs);
      });

      // Subscribe to profile for real-time XP/level/badges updates
      const unsubProfile = onSnapshot(doc(db, 'users', user.uid), async (snap) => {
        try {
          // Reuse cleaning from service for consistency
          const updated = await UserService.getUserProfile(user.uid);
          if (updated) setProfile(updated);
        } catch (e) {
          // Fallback: minimal update if service fails
          const data: any = snap.data();
          if (data) {
            setProfile((prev) => ({
              ...prev,
              xp: data.xp ?? prev.xp,
              level: data.level ?? prev.level,
              badges: data.badges ?? prev.badges,
              updatedAt: data.updatedAt?.toDate?.() || new Date(),
            } as Profile));
          }
        }
      });

      return () => {
        unsubXp();
        unsubProfile();
      };
    }
  }, [user]);

  useEffect(() => {
    // Update completion status whenever profile changes
    const status = ProfileValidationService.validateProfileCompletion(profile);
    setCompletionStatus(status);
  }, [profile]);

  const loadProfile = async () => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      const userProfile = await UserService.getUserProfile(user.uid);
      if (userProfile) {
        setProfile(userProfile);
        console.log('📋 Profile loaded:', {
          name: userProfile.name,
          verifiedBadge: userProfile.verifiedBadge
        });
      }
      
      // Load user's verified badge
      const badge = await PremiumService.getUserVerifiedBadge(user.uid);
      setVerifiedBadge(badge);
      console.log('🏆 Verified badge loaded:', badge);
    } catch (error) {
      console.error('❌ Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUserPosts = () => {
    if (!user?.uid) return;

    try {
      const unsubscribe = PostService.subscribeToUserPosts(user.uid, (posts) => {
        setUserPosts(posts);
      });
      return unsubscribe;
    } catch (error) {
      console.error('Error subscribing to user posts:', error);
    }
  };

  const handlePostUpdate = () => {
    // Posts will automatically update via real-time subscription
  };

  const addSkill = () => {
    if (newSkill.trim()) {
      const trimmedSkill = newSkill.trim();
      const existingSkills = profile.skills || [];
      
      // Prevent duplicates (case-insensitive)
      if (!existingSkills.some(skill => skill.toLowerCase() === trimmedSkill.toLowerCase())) {
        setProfile(prev => ({
          ...prev,
          skills: [...existingSkills, trimmedSkill]
        }));
      }
      setNewSkill('');
    }
  };

  const addInterest = () => {
    if (newInterest.trim()) {
      const trimmedInterest = newInterest.trim();
      const existingInterests = profile.interests || [];
      
      // Prevent duplicates (case-insensitive)
      if (!existingInterests.some(interest => interest.toLowerCase() === trimmedInterest.toLowerCase())) {
        setProfile(prev => ({
          ...prev,
          interests: [...existingInterests, trimmedInterest]
        }));
      }
      setNewInterest('');
    }
  };

  const pickImage = async (type: 'profile' | 'banner') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'profile' ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      console.log(`📸 Selected ${type} image: ${imageUri}`);
      
      if (type === 'profile') {
        setProfile(prev => ({
          ...prev,
          profilePhotoUrl: imageUri,
        }));
      } else {
        setProfile(prev => ({
          ...prev,
          bannerPhotoUrl: imageUri,
        }));
      }
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    try {
      setSaving(true);
      console.log('💾 Saving profile...');

      // Upload images to Firebase Storage if they are local URIs
      let profilePhotoUrl = profile.profilePhotoUrl;
      let bannerPhotoUrl = profile.bannerPhotoUrl;

      if (profilePhotoUrl && ProfileImageService.isLocalFile(profilePhotoUrl)) {
        console.log('📤 Uploading profile photo to Firebase Storage...');
        profilePhotoUrl = await ProfileImageService.uploadProfileImage(profilePhotoUrl, user.uid, 'profile');
      }

      if (bannerPhotoUrl && ProfileImageService.isLocalFile(bannerPhotoUrl)) {
        console.log('📤 Uploading banner photo to Firebase Storage...');
        bannerPhotoUrl = await ProfileImageService.uploadProfileImage(bannerPhotoUrl, user.uid, 'banner');
      }

      // Update profile with Firebase Storage URLs
      const updatedProfile = {
        ...profile,
        profilePhotoUrl,
        bannerPhotoUrl,
        updatedAt: new Date(),
      };

      console.log('📝 Updating user profile in Firestore...');
      await UserService.updateUserProfile(user.uid, updatedProfile);

      setProfile(updatedProfile);
      setSaving(false);
      setIsEditing(false); // Exit edit mode after successful save
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      setSaving(false);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    }
  };

  const cancelEdit = () => {
    // Reload the original profile data to discard changes
    loadProfile();
    setIsEditing(false);
    setNewSkill('');
    setNewInterest('');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const renderPost = ({ item }: { item: Post }) => (
    <PostCard post={item} onPostUpdate={handlePostUpdate} />
  );

  const renderProfileCompletionBanner = () => {
    if (completionStatus.isComplete) {
      return (
        <View style={styles.completionBanner}>
          <View style={styles.completionBannerContent}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.completionBannerTextComplete}>
              Profile Complete! 🎉
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.completionBanner, styles.incompleteBanner]}>
        <View style={styles.completionBannerContent}>
          <Ionicons name="alert-circle" size={20} color="#FF9500" />
          <View style={styles.completionTextContainer}>
            <Text style={styles.completionBannerText}>
              Profile {completionStatus.completionPercentage}% Complete
            </Text>
            <Text style={styles.completionSubtext}>
              Complete your profile to unlock all features
            </Text>
          </View>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${completionStatus.completionPercentage}%` }
              ]} 
            />
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      onScroll={(event) => {
        const scrollY = event.nativeEvent.contentOffset.y;
        notifyScroll(scrollY);
      }}
      scrollEventThrottle={16}
    >
      {/* Banner Image */}
      <View style={styles.bannerContainer}>
        {profile.bannerPhotoUrl ? (
          <Image source={{ uri: profile.bannerPhotoUrl }} style={styles.bannerImage} />
        ) : (
          <View style={styles.defaultBanner}>
            <Ionicons name="image-outline" size={40} color="#ccc" />
          </View>
        )}
        {isEditing && (
          <TouchableOpacity
            style={styles.bannerEditButton}
            onPress={() => pickImage('banner')}
          >
            <Ionicons name="camera-outline" size={20} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profilePhotoContainer}>
          <Avatar
            size="xlarge"
            source={profile.profilePhotoUrl}
            fallback={profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
            verified={verifiedBadge !== 'none'}
          />
          {isEditing && (
            <TouchableOpacity
              style={styles.profileEditButton}
              onPress={() => pickImage('profile')}
            >
              <Ionicons name="camera-outline" size={16} color="white" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.profileInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.profileName}>{profile.name || 'Your Name'}</Text>
          </View>
          <Text style={styles.profileCollege}>{profile.college || 'College Name'}</Text>
          {profile.location && (
            <Text style={styles.profileLocation}>
              <Ionicons name="location-outline" size={14} color="#666" />
              {' '}{profile.location}
            </Text>
          )}
        </View>

        {/* Edit Mode Fields */}
        {isEditing && (
          <View style={styles.editFields}>
            <TextInput
              style={styles.editInput}
              value={profile.name}
              onChangeText={(text) => setProfile(prev => ({ ...prev, name: text }))}
              placeholder="Your Name"
            />
            <TextInput
              style={styles.editInput}
              value={profile.college}
              onChangeText={(text) => setProfile(prev => ({ ...prev, college: text }))}
              placeholder="Your College"
            />
            <TextInput
              style={styles.editInput}
              value={profile.passion}
              onChangeText={(text) => setProfile(prev => ({ ...prev, passion: text }))}
              placeholder="Your Passion (e.g., Photography, Music, Art)"
            />
            <TextInput
              style={styles.editInput}
              value={profile.location}
              onChangeText={(text) => setProfile(prev => ({ ...prev, location: text }))}
              placeholder="Your Location (optional)"
            />
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {isEditing ? (
            <View style={styles.editButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.actionButton, 
                  styles.cancelButton
                ]}
                onPress={cancelEdit}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle-outline" size={16} color="#FF3B30" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.actionButton, 
                  styles.saveButton,
                  saving && styles.saveButtonDisabled
                ]}
                onPress={saveProfile}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name={saving ? "sync-outline" : "checkmark-circle-outline"} 
                  size={18} 
                  color="white" 
                />
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Save Profile'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="create-outline" size={16} color="#007AFF" />
              <Text style={styles.actionButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Social Metrics */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricItem}>
          <Text style={styles.metricNumber}>{profile.connections}</Text>
          <Text style={styles.metricLabel}>Connections</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricNumber}>{profile.followers}</Text>
          <Text style={styles.metricLabel}>Followers</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricNumber}>{profile.following}</Text>
          <Text style={styles.metricLabel}>Following</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricNumber}>{userPosts.length}</Text>
          <Text style={styles.metricLabel}>Posts</Text>
        </View>
      </View>

      {/* XP & Level Section */}
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
                <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: '#007AFF' }]} />
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
              <TouchableOpacity
                style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center' }}
                onPress={() => setShowXpLog(prev => !prev)}
                activeOpacity={0.7}
              >
                <Ionicons name={showXpLog ? 'chevron-down' : 'chevron-forward'} size={18} color="#007AFF" />
                <Text style={{ color: '#007AFF', fontWeight: '600', marginLeft: 4 }}>XP Activity</Text>
              </TouchableOpacity>
              {showXpLog && (
                <View style={{ marginTop: 8 }}>
                  {xpLogs.length === 0 ? (
                    <Text style={{ color: '#666' }}>No XP activity yet.</Text>
                  ) : (
                    xpLogs.slice(0, 10).map((log) => (
                      <View key={log.id} style={styles.xpLogItem}>
                        <Text style={styles.xpLogAction}>{log.action.replace(/_/g, ' ').toLowerCase()}</Text>
                        <Text style={[styles.xpLogDelta, { color: log.delta >= 0 ? '#2e7d32' : '#c62828' }]}> {log.delta >= 0 ? `+${log.delta}` : log.delta} XP</Text>
                        <Text style={styles.xpLogTime}>{log.createdAt.toLocaleString()}</Text>
                        {log.note ? <Text style={styles.xpLogNote}>{log.note}</Text> : null}
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          );
        })()}
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        {isEditing ? (
          <TextInput
            style={styles.aboutInput}
            value={profile.aboutMe}
            onChangeText={(text) => setProfile(prev => ({ ...prev, aboutMe: text }))}
            placeholder="Tell us about yourself..."
            multiline
            numberOfLines={4}
          />
        ) : (
          <Text style={styles.aboutText}>{profile.aboutMe || 'No bio yet'}</Text>
        )}
      </View>

      {/* Skills Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Skills</Text>
        {isEditing ? (
          <View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.skillInput}
                placeholder="Add a skill (e.g., Photography, Programming)"
                value={newSkill}
                onChangeText={setNewSkill}
                onSubmitEditing={addSkill}
              />
              <TouchableOpacity onPress={addSkill} style={styles.addButton}>
                <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.skillsContainer}>
                {profile.skills && profile.skills.length > 0 ? (
                  profile.skills.map((skill, index) => (
                    <View key={index} style={styles.skillTag}>
                      <Text style={styles.skillText}>{skill}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setProfile(prev => ({
                            ...prev,
                            skills: prev.skills?.filter((_, i) => i !== index) || []
                          }));
                        }}
                      >
                        <Ionicons name="close-circle" size={16} color="#007AFF" />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No skills added yet</Text>
                )}
              </View>
            </ScrollView>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.skillsContainer}>
              {profile.skills && profile.skills.length > 0 ? (
                profile.skills.map((skill, index) => (
                  <View key={index} style={styles.skillTag}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No skills added yet</Text>
              )}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Interests Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interests</Text>
        {isEditing ? (
          <View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.interestInput}
                placeholder="Add an interest (e.g., Art, Music, Technology)"
                value={newInterest}
                onChangeText={setNewInterest}
                onSubmitEditing={addInterest}
              />
              <TouchableOpacity onPress={addInterest} style={styles.addButton}>
                <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.interestsContainer}>
                {profile.interests && profile.interests.length > 0 ? (
                  profile.interests.map((interest, index) => (
                    <View key={index} style={styles.interestTag}>
                      <Text style={styles.interestText}>#{interest}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setProfile(prev => ({
                            ...prev,
                            interests: prev.interests?.filter((_, i) => i !== index) || []
                          }));
                        }}
                      >
                        <Ionicons name="close-circle" size={16} color="#ff6b6b" />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No interests added yet</Text>
                )}
              </View>
            </ScrollView>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.interestsContainer}>
              {profile.interests && profile.interests.length > 0 ? (
                profile.interests.map((interest, index) => (
                  <View key={index} style={styles.interestTag}>
                    <Text style={styles.interestText}>#{interest}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No interests added yet</Text>
              )}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Posts Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Posts</Text>
        {userPosts.length > 0 ? (
          <FlatList
            data={userPosts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyPostsContainer}>
            <Ionicons name="newspaper-outline" size={48} color="#ccc" />
            <Text style={styles.emptyPostsTitle}>No Posts Yet</Text>
            <Text style={styles.emptyPostsSubtitle}>
              Start sharing your creativity with the community!
            </Text>
          </View>
        )}
      </View>

      {/* Profile Completion Banner */}
      {renderProfileCompletionBanner()}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
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
  bannerContainer: {
    position: 'relative',
    height: 200,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  defaultBanner: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerEditButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  profileSection: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profilePhotoContainer: {
    position: 'relative',
    marginTop: -50,
    marginBottom: 16,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'white',
  },
  defaultProfilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  defaultProfileText: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
  },
  profileEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    padding: 8,
  },
  profileInfo: {
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  profileCollege: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  profileLocation: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  actionButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginLeft: 6,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  editButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 1,
  },
  cancelButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  metricsContainer: {
    backgroundColor: 'white',
    flexDirection: 'row',
    paddingVertical: 20,
    marginBottom: 8,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  aboutInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  aboutText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  skillInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
    flex: 1,
  },
  skillsContainer: {
    flexDirection: 'row',
    paddingRight: 20,
  },
  skillTag: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  skillText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  interestInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
    flex: 1,
  },
  interestsContainer: {
    flexDirection: 'row',
    paddingRight: 20,
  },
  interestTag: {
    backgroundColor: '#fff0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ff6b6b',
    flexDirection: 'row',
    alignItems: 'center',
  },
  interestText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  postCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  postContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  logoutButton: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  editFields: {
    marginTop: 10,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
  },
  emptyPostsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyPostsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  emptyPostsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  completionBanner: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  completionBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  completionTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  completionBannerText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  completionBannerTextComplete: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  completionSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  incompleteBanner: {
    backgroundColor: '#fff8f0',
    borderColor: '#FF9500',
    borderWidth: 1,
  },
  progressBarContainer: {
    marginTop: 10,
    width: '100%',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  addButton: {
    marginLeft: 10,
    padding: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  xpLogItem: {
    backgroundColor: '#f9f9fb',
    borderWidth: 1,
    borderColor: '#eee',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  xpLogAction: {
    fontSize: 13,
    color: '#444',
    textTransform: 'capitalize',
  },
  xpLogDelta: {
    fontSize: 13,
    fontWeight: '700',
  },
  xpLogTime: {
    fontSize: 12,
    color: '#777',
  },
  xpLogNote: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
});

export default ProfileScreen; 