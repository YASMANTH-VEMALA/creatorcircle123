import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Alert,
  Modal,
  ScrollView,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { Post, Comment, Report } from '../types';
import { PostService } from '../services/postService';
import { UserService } from '../services/userService';
import { ProfileValidationService } from '../services/profileValidationService';
import PostImageStack from './PostImageStack';
import PostEditModal from './PostEditModal';
import { ImageUtils } from '../utils/imageUtils';
import { Video, ResizeMode } from 'expo-av';
import { Avatar } from './ui/Avatar';
import { PremiumService } from '../services/premiumService';
import { xpService } from '../services/xpService';
import { notificationService } from '../services/notificationService';

const { width } = Dimensions.get('window');

interface PostCardProps {
  post: Post;
  onPostUpdate: () => void;
  showUserProfile?: boolean;
  isInProfile?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  onPostUpdate, 
  showUserProfile = true,
  isInProfile = false 
}) => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  // State management
  const [likesCount, setLikesCount] = useState(post.likes || 0);
  const [hasLiked, setHasLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLiking, setIsLiking] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [fullscreenImageLoading, setFullscreenImageLoading] = useState<{ [key: number]: boolean }>({});
  const [fullscreenImageErrors, setFullscreenImageErrors] = useState<{ [key: number]: boolean }>({});
  const [avatarError, setAvatarError] = useState(false);
  const [userVerifiedBadge, setUserVerifiedBadge] = useState<'none' | 'silver' | 'gold'>('none');

  useEffect(() => {
    if (user?.uid) {
      initializePost();
    }
  }, [user, post.id]);

  const initializePost = async () => {
    try {
      // Load user profile for the post creator
      await loadUserProfile();
      
      // Check if current user has liked this post
      await checkLikeStatus();
      
      // Load comments
      await loadComments();
    } catch (error) {
      console.error('Error initializing post:', error);
    }
  };

  const loadUserProfile = async () => {
    try {
      const profile = await UserService.getUserProfile(post.userId);
      setUserProfile(profile);
      
      // Load user's verified badge
      const verifiedBadge = await PremiumService.getUserVerifiedBadge(post.userId);
      setUserVerifiedBadge(verifiedBadge);
      console.log(`🏆 Post ${post.id} - User ${post.userId} verified badge:`, verifiedBadge);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const checkLikeStatus = async () => {
    if (!user?.uid) return;
    
    try {
      const liked = await PostService.hasUserLiked(post.id, user.uid);
      setHasLiked(liked);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const loadComments = async () => {
    if (!user?.uid) return;
    
    try {
      setLoadingComments(true);
      const unsubscribe = PostService.subscribeToComments(post.id, (newComments) => {
        setComments(newComments);
        setLoadingComments(false);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error loading comments:', error);
      setLoadingComments(false);
    }
  };

  const handleLike = async () => {
    if (!user?.uid || isLiking) return;
    
    try {
      setIsLiking(true);
      await PostService.toggleLike(post.id, user.uid);
      
      // Update local state
      setLikesCount(prev => hasLiked ? prev - 1 : prev + 1);
      setHasLiked(!hasLiked);

      // Notify post owner if not self-like
      if (post.userId !== user.uid) {
        await notificationService.createLikeNotification(user.uid, post.userId, post.id);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like. Please try again.');
    } finally {
      setIsLiking(false);
    }
  };

  const handleAddComment = async () => {
    if (!user?.uid || isCommenting) return;

    try {
      setIsCommenting(true);
      
      const userProfile = await UserService.getUserProfile(user.uid);
      if (!userProfile) {
        Alert.alert('Error', 'User profile not found');
        return;
      }

      // Validate profile completion
      const profileCheck = ProfileValidationService.canPerformAction(userProfile, 'comment_on_post');
      if (!profileCheck.allowed) {
        Alert.alert('Profile Incomplete', profileCheck.message, [
          { text: 'OK' },
          { 
            text: 'Complete Profile', 
            onPress: () => navigation.navigate('Profile' as never)
          }
        ]);
        return;
      }

      if (!newComment.trim()) {
        Alert.alert('Error', 'Please enter a comment');
        return;
      }

      await PostService.addComment(
        post.id,
        user.uid,
        userProfile.name || user.email || 'Anonymous',
        userProfile.profilePhotoUrl || '',
        newComment.trim()
      );

      setNewComment('');
      Alert.alert('Success', 'Comment added successfully!');
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    } finally {
      setIsCommenting(false);
    }
  };

  const handleReport = async () => {
    if (!user?.uid) return;

    Alert.alert(
      'Report Post',
      'Select a reason for reporting this post:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Inappropriate Content', onPress: () => reportPost('inappropriate') },
        { text: 'Spam', onPress: () => reportPost('spam') },
        { text: 'Harassment', onPress: () => reportPost('offensive') },
        { text: 'Other', onPress: () => reportPost('other') },
      ]
    );
  };

  const reportPost = async (reason: Report['reason']) => {
    if (!user?.uid) return;

    try {
      const userProfile = await UserService.getUserProfile(user.uid);
      if (!userProfile) {
        Alert.alert('Error', 'User profile not found');
        return;
      }

      await PostService.reportPost(
        post.id,
        user.uid,
        userProfile.name || user.email || 'Anonymous',
        reason
      );

      Alert.alert('Success', 'Post reported successfully. Thank you for helping keep our community safe.');
    } catch (error) {
      console.error('Error reporting post:', error);
      Alert.alert('Error', 'Failed to report post. Please try again.');
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handlePostUpdated = () => {
    setShowEditModal(false);
    onPostUpdate();
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await PostService.deletePost(post.id);
              onPostUpdate();
              Alert.alert('Success', 'Post deleted successfully!');
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleImagePress = (imageUrl: string, index: number) => {
    console.log('🖼️ PostCard: Image pressed:', {
      imageUrl,
      index,
      totalMedia: getCombinedMedia().length,
      mediaUrls: getCombinedMedia()
    });
    
    setCurrentImageIndex(index);
    setShowFullscreenImage(true);
  };

  const handleUserPress = () => {
    if (post.userId === user?.uid) {
      navigation.navigate('Profile' as never);
    } else {
      navigation.navigate('UserProfile' as never, { userId: post.userId } as never);
    }
  };

  const getCombinedMedia = () => {
    const media = [];
    if (post.images && post.images.length > 0) {
      media.push(...post.images);
    }
    if (post.videos && post.videos.length > 0) {
      media.push(...post.videos);
    }
    return media;
  };

  const isVideo = (url: string) => {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v', '.3gp'];
    const lowerUrl = url.toLowerCase();
    const hasVideoExtension = videoExtensions.some(ext => lowerUrl.endsWith(ext));
    const hasVideoKeywords = lowerUrl.includes('video') ||
                            lowerUrl.includes('mp4') ||
                            lowerUrl.includes('mov') ||
                            lowerUrl.includes('avi');
    const hasVideoMimeType = lowerUrl.includes('video/');
    const isFirebaseStorageUrl = lowerUrl.includes('firebasestorage.googleapis.com') &&
                                (lowerUrl.includes('videos') || lowerUrl.includes('video'));
    const isVideoFile = hasVideoExtension || hasVideoKeywords || hasVideoMimeType || isFirebaseStorageUrl;
    
    return isVideoFile;
  };

  const renderFullscreenMedia = (media: string, index: number) => {
    if (isVideo(media)) {
      return (
        <Video
          source={{ uri: media }}
          style={styles.fullscreenImage}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={true}
          onLoadStart={() => {
            console.log(`🔄 Loading fullscreen video ${index}: ${media}`);
            setFullscreenImageLoading(prev => ({ ...prev, [index]: true }));
            setFullscreenImageErrors(prev => ({ ...prev, [index]: false }));
          }}
          onLoad={() => {
            console.log(`✅ Fullscreen video ${index} loaded successfully`);
            setFullscreenImageLoading(prev => ({ ...prev, [index]: false }));
          }}
          onError={(error) => {
            console.error(`❌ Fullscreen video ${index} failed to load:`, error);
            console.error(`Video URL: ${media}`);
            setFullscreenImageLoading(prev => ({ ...prev, [index]: false }));
            setFullscreenImageErrors(prev => ({ ...prev, [index]: true }));
          }}
        />
      );
    }

    return (
      <Image
        source={{ 
          uri: media
        }}
        style={styles.fullscreenImage}
        resizeMode={'contain'}
        onLoadStart={() => {
          console.log(`🔄 Loading fullscreen image ${index}: ${media}`);
          setFullscreenImageLoading(prev => ({ ...prev, [index]: true }));
          setFullscreenImageErrors(prev => ({ ...prev, [index]: false }));
        }}
        onLoad={() => {
          console.log(`✅ Fullscreen image ${index} loaded successfully`);
          setFullscreenImageLoading(prev => ({ ...prev, [index]: false }));
        }}
        onError={(error) => {
          console.error(`❌ Fullscreen image ${index} failed to load:`, error);
          console.error(`Image URL: ${media}`);
          setFullscreenImageLoading(prev => ({ ...prev, [index]: false }));
          setFullscreenImageErrors(prev => ({ ...prev, [index]: true }));
          
          // Try to reload the image after a delay
          setTimeout(() => {
            setFullscreenImageErrors(prev => ({ ...prev, [index]: false }));
            setFullscreenImageLoading(prev => ({ ...prev, [index]: true }));
          }, 2000);
        }}
      />
    );
  };

  const renderFullscreenImage = () => (
    <Modal
      visible={showFullscreenImage}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowFullscreenImage(false)}
    >
      <View style={styles.fullscreenContainer}>
        <TouchableOpacity
          style={styles.fullscreenCloseButton}
          onPress={() => setShowFullscreenImage(false)}
        >
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>
        
        <ScrollView 
          horizontal 
          pagingEnabled 
          showsHorizontalScrollIndicator={false}
          style={styles.fullscreenScrollView}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
            setCurrentImageIndex(newIndex);
          }}
        >
          {getCombinedMedia().map((media, index) => (
            <View key={index} style={styles.fullscreenImageContainer}>
              {renderFullscreenMedia(media, index)}
              
              {/* Loading Overlay */}
              {fullscreenImageLoading[index] && (
                <View style={styles.fullscreenLoadingOverlay}>
                  <ActivityIndicator size="large" color="white" />
                  <Text style={styles.fullscreenLoadingText}>
                    Loading {isVideo(media) ? 'video' : 'image'}...
                  </Text>
                </View>
              )}
              
              {/* Error Overlay */}
              {fullscreenImageErrors[index] && (
                <TouchableOpacity 
                  style={styles.fullscreenErrorOverlay}
                  onPress={() => setShowFullscreenImage(false)}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name={isVideo(media) ? "videocam-outline" : "image-outline"} 
                    size={48} 
                    color="white" 
                  />
                  <Text style={styles.fullscreenErrorText}>
                    Failed to load {isVideo(media) ? 'video' : 'image'}
                  </Text>
                  <Text style={styles.fullscreenErrorSubtext}>Tap to close</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
        
        {getCombinedMedia().length > 1 && (
          <View style={styles.fullscreenIndicators}>
            {getCombinedMedia().map((_, index) => (
              <View
                key={index}
                style={[
                  styles.fullscreenIndicator,
                  index === currentImageIndex && styles.fullscreenIndicatorActive
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return timestamp.toLocaleDateString();
  };

  const handleAvatarError = (error: any) => {
    console.error(`❌ PostCard userAvatar error for post ${post.id}:`, error);
    console.error(`🔍 User avatar URL: ${post.userAvatar}`);
    console.error(`🔍 User profile image: ${userProfile?.profileImage}`);
    setAvatarError(true);
    ImageUtils.getImageErrorHandler('PostCard-userAvatar')(error);
  };

  const handleAvatarLoad = () => {
    console.log(`✅ PostCard userAvatar loaded for post ${post.id}: ${post.userAvatar || userProfile?.profileImage}`);
    setAvatarError(false);
    ImageUtils.getImageSuccessHandler('PostCard-userAvatar')();
  };

  const getAvatarSource = () => {
    if (avatarError) {
      return { uri: 'https://via.placeholder.com/40x40/007AFF/FFFFFF?text=U' };
    }
    
    const avatarUrl = post.userAvatar || userProfile?.profileImage || '';
    return ImageUtils.getImageSource(avatarUrl, { cache: 'force-cache' });
  };

  const handleShare = async () => {
    try {
      // Assuming there is a share handler
      if (user?.uid) {
        await xpService.awardForShare(user.uid);
      }
    } catch (e) {
      console.warn('Share failed:', e);
    }
  };

  return (
    <View style={styles.container}>
      {/* User Profile Section */}
      {showUserProfile && (
      <TouchableOpacity style={styles.userInfo} onPress={handleUserPress} activeOpacity={0.7}>
        <Avatar
          size="medium"
          source={post.userAvatar || userProfile?.profilePhotoUrl}
          fallback={(post.userName || userProfile?.name || 'U').charAt(0).toUpperCase()}
          verified={userVerifiedBadge !== 'none'}
        />
        <View style={styles.userDetails}>
            <View style={styles.userNameContainer}>
              <Text style={styles.userName}>{post.userName || userProfile?.name || 'Unknown User'}</Text>
            </View>
            <Text style={styles.userCollege}>{post.userCollege || userProfile?.college || ''}</Text>
          <Text style={styles.timestamp}>
              {formatTimestamp(post.createdAt)}
              {post.isEdited && ' • Edited'}
          </Text>
        </View>
          <TouchableOpacity onPress={() => setShowOptions(true)}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
          </TouchableOpacity>
          </TouchableOpacity>
        )}

      {/* Post Content */}
      <View style={styles.content}>
        {post.content && <Text style={styles.postText}>{post.content}</Text>}
        {post.emoji && <Text style={styles.emoji}>{post.emoji}</Text>}
        
        {/* Media with Fullscreen Support */}
        {getCombinedMedia().length > 0 && (
          <TouchableOpacity 
            style={styles.mediaContainer}
            onPress={() => handleImagePress(getCombinedMedia()[0], 0)}
            activeOpacity={0.9}
          >
          <PostImageStack 
              media={getCombinedMedia()} 
            onImagePress={handleImagePress}
          />
          </TouchableOpacity>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.actionButton, isLiking && styles.actionButtonDisabled]} 
          onPress={handleLike}
          disabled={isLiking}
        >
          <Ionicons
            name={hasLiked ? "heart" : "heart-outline"}
            size={20}
            color={hasLiked ? "#FF3B30" : "#666"}
          />
          <Text style={[styles.actionText, hasLiked && styles.likedText]}>{likesCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => setShowComments(!showComments)}>
          <Ionicons name="chatbubble-outline" size={20} color="#666" />
          <Text style={styles.actionText}>{comments.length}</Text>
        </TouchableOpacity>

        {user?.uid !== post.userId && (
          <TouchableOpacity style={styles.actionButton} onPress={handleReport}>
          <Ionicons name="flag-outline" size={20} color="#666" />
          <Text style={styles.actionText}>Report</Text>
        </TouchableOpacity>
        )}
      </View>

      {/* Comments Section */}
      {showComments && (
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>
          
          {loadingComments ? (
            <View style={styles.loadingComments}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingText}>Loading comments...</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.commentItem}>
                  <Image
                    source={ImageUtils.getImageSource(
                      item.userAvatar || '',
                      { cache: 'force-cache' }
                    )}
                    style={styles.commentAvatar}
                    onError={(error) => {
                      console.error(`❌ Comment avatar error for comment ${item.id}:`, error);
                      console.error(`🔍 Comment avatar URL: ${item.userAvatar}`);
                    }}
                    defaultSource={{ uri: 'https://via.placeholder.com/30x30/007AFF/FFFFFF?text=U' }}
                    onLoad={() => {
                      console.log(`✅ Comment avatar loaded for comment ${item.id}: ${item.userAvatar}`);
                    }}
                  />
                  <View style={styles.commentContent}>
                    <View style={styles.commentUserNameContainer}>
                      <Text style={styles.commentUserName}>{item.userName || 'Unknown User'}</Text>
                      {/* Note: We'll need to load verified badges for comment authors separately */}
                    </View>
                    <Text style={styles.commentText}>{item.content}</Text>
                    <Text style={styles.commentTimestamp}>
                      {formatTimestamp(item.createdAt)}
                    </Text>
                  </View>
                </View>
              )}
              style={styles.commentsList}
            />
          )}
          
          {/* Add Comment */}
          <View style={styles.addCommentContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[styles.addCommentButton, isCommenting && styles.addCommentButtonDisabled]} 
              onPress={handleAddComment}
              disabled={isCommenting}
            >
              {isCommenting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Options Modal */}
      <Modal
        visible={showOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptions(false)}
        >
          <View style={styles.optionsModal}>
            {user?.uid === post.userId ? (
              <>
            <TouchableOpacity style={styles.optionButton} onPress={handleEdit}>
              <Ionicons name="create-outline" size={20} color="#007AFF" />
              <Text style={styles.optionText}>Edit Post</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              <Text style={[styles.optionText, { color: '#FF3B30' }]}>Delete Post</Text>
            </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.optionButton} onPress={handleReport}>
                <Ionicons name="flag-outline" size={20} color="#FF3B30" />
                <Text style={[styles.optionText, { color: '#FF3B30' }]}>Report Post</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Post Edit Modal */}
      <PostEditModal
        visible={showEditModal}
        post={post}
        onClose={() => setShowEditModal(false)}
        onPostUpdated={handlePostUpdated}
      />

      {/* Fullscreen Image Modal */}
      {renderFullscreenImage()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  userDetails: {
    flex: 1,
    marginLeft: 16,
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  userCollege: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  content: {
    marginBottom: 16,
  },
  postText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 12,
  },
  emoji: {
    fontSize: 24,
    marginBottom: 12,
  },
  mediaContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  likedText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  commentsSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  loadingComments: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  commentsList: {
    maxHeight: 300,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentUserNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 4,
  },
  commentTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    marginRight: 12,
    maxHeight: 80,
  },
  addCommentButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    padding: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCommentButtonDisabled: {
    backgroundColor: '#ccc',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  optionText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  fullscreenCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  fullscreenScrollView: {
    flex: 1,
  },
  fullscreenImageContainer: {
    width: width,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  fullscreenImage: {
    width: width,
    height: '100%',
  },
  fullscreenLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenLoadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },
  fullscreenErrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenErrorText: {
    color: 'white',
    fontSize: 18,
    marginTop: 16,
    fontWeight: '600',
  },
  fullscreenErrorSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 8,
  },
  fullscreenIndicators: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  fullscreenIndicatorActive: {
    backgroundColor: 'white',
  },
});

export default PostCard; 