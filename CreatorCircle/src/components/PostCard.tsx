import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { Post, Comment, Report, RootStackParamList } from '../types';
import { PostService } from '../services/postService';
import { UserService } from '../services/userService';
import { ProfileValidationService } from '../services/profileValidationService';
import PostImageStack from './PostImageStack';
import PostEditModal from './PostEditModal';
import PostTextComponent from './PostTextComponent';
import { ImageUtils } from '../utils/imageUtils';
import { Video, ResizeMode } from 'expo-av';
import { Avatar } from './ui/Avatar';
import { PremiumService } from '../services/premiumService';
import { xpService } from '../services/xpService';
import { notificationService } from '../services/notificationService';

const { width } = Dimensions.get('window');

// LinkedIn-style reaction options
const REACTION_OPTIONS = [
  { emoji: '👍', name: 'Like', color: '#0077B5' },
  { emoji: '🎉', name: 'Celebrate', color: '#FF6B35' },
  { emoji: '❤️', name: 'Love', color: '#E31B23' },
  { emoji: '🤔', name: 'Insightful', color: '#8E44AD' },
  { emoji: '😂', name: 'Funny', color: '#F39C12' },
  { emoji: '🙏', name: 'Support', color: '#27AE60' },
];

type PostCardNavigationProp = StackNavigationProp<RootStackParamList>;

interface PostCardProps {
  post: Post;
  onPostUpdate: () => void;
  showUserProfile?: boolean;
  isInProfile?: boolean;
}

const PostCard: React.FC<PostCardProps> = React.memo(({ 
  post, 
  onPostUpdate, 
  showUserProfile = true,
  isInProfile = false 
}) => {
  const navigation = useNavigation<PostCardNavigationProp>();
  const { user } = useAuth();
  
  // State management
  const [likesCount, setLikesCount] = useState(post.likes || 0);
  const [hasLiked, setHasLiked] = useState(false);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactions, setReactions] = useState<{ [emoji: string]: number }>({});
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
  // New state for comment replies and likes
  const [replyingToComment, setReplyingToComment] = useState<Comment | null>(null);
  const [commentLikes, setCommentLikes] = useState<{ [commentId: string]: boolean }>({});
  const [commentLikesCount, setCommentLikesCount] = useState<{ [commentId: string]: number }>({});

  // Memoize the post ID to prevent unnecessary re-renders
  const postId = useMemo(() => post.id, [post.id]);
  const postUserId = useMemo(() => post.userId, [post.userId]);

  // Debug effect to track reaction picker state
  useEffect(() => {
    console.log('🎯 Reaction picker state changed:', showReactionPicker);
  }, [showReactionPicker]);

  // Consolidated initialization effect
  useEffect(() => {
    if (user?.uid && postId) {
      initializePost();
    }
  }, [user?.uid, postId]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // setIsOptimisticUpdate(false); // Removed
      // setIsCommentOptimisticUpdate({}); // Removed
    };
  }, []);

  // Real-time updates effect
  useEffect(() => {
    if (postId) {
      const unsubscribe = PostService.subscribeToPostUpdates(postId, (updates) => {
        // Only update if the server data is different from our current state
        // This prevents conflicts with optimistic updates
        if (updates.likes !== likesCount) {
          setLikesCount(updates.likes);
        }
        if (updates.reactions) {
          setReactions(updates.reactions);
        }
        if (onPostUpdate) {
          onPostUpdate();
        }
      });
      
      return unsubscribe;
    }
  }, [postId, onPostUpdate, likesCount]);

  const initializePost = useCallback(async () => {
    if (!user?.uid || !postId) return;

    try {
      // Load user's reaction for this post
      const userReactionData = await PostService.getUserReaction(postId, user.uid);
      setUserReaction(userReactionData);
      setHasLiked(!!userReactionData);

      // Load post reactions
      const reactionsData = await PostService.getPostReactions(postId);
      setReactions(reactionsData);

      // Load other post data
      await loadUserProfile();
      await checkLikeStatus();
      await loadComments();
    } catch (error) {
      console.error('Error initializing post:', error);
    }
  }, [user?.uid, postId]);

  const loadUserProfile = useCallback(async () => {
    try {
      const profile = await UserService.getUserProfile(postUserId);
      setUserProfile(profile);
      
      // Load user's verified badge
      const verifiedBadge = await PremiumService.getUserVerifiedBadge(postUserId);
      setUserVerifiedBadge(verifiedBadge);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }, [postUserId]);

  const checkLikeStatus = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const liked = await PostService.hasUserLiked(postId, user.uid);
      setHasLiked(liked);
    } catch (error) {
      console.error('❌ Error checking like status:', error);
    }
  }, [user?.uid, postId]);

  const loadComments = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setLoadingComments(true);
      const unsubscribe = PostService.subscribeToComments(postId, (newComments) => {
        setComments(newComments);
        
        // Initialize comment likes state
        const likesState: { [commentId: string]: boolean } = {};
        const likesCountState: { [commentId: string]: number } = {};
        
        newComments.forEach(comment => {
          likesState[comment.id] = false; // Will be updated below
          likesCountState[comment.id] = comment.likes || 0;
        });
        
        setCommentLikesCount(likesCountState);
        setLoadingComments(false);
        
        // Check like status for each comment
        newComments.forEach(async (comment) => {
          try {
            const commentLiked = await PostService.hasUserLikedComment(postId, comment.id, user.uid);
            setCommentLikes(prev => ({ ...prev, [comment.id]: commentLiked }));
          } catch (error) {
            console.error('Error checking comment like status:', error);
          }
        });
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error loading comments:', error);
      setLoadingComments(false);
    }
  }, [user?.uid, postId]);

  const handleReaction = async (reactionEmoji: string) => {
    if (!user?.uid || isLiking) return;
    
    // Store current state for potential rollback
    const previousReaction = userReaction;
    const previousReactions = { ...reactions };
    const previousLikesCount = likesCount;
    
    try {
      setIsLiking(true);
      
      // Instant optimistic update
      if (userReaction === reactionEmoji) {
        // Remove reaction if same emoji is selected
        setUserReaction(null);
        setHasLiked(false);
        setReactions(prev => ({
          ...prev,
          [reactionEmoji]: Math.max(0, (prev[reactionEmoji] || 0) - 1)
        }));
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        // Add new reaction or change reaction
        if (userReaction) {
          // Remove previous reaction
          setReactions(prev => ({
            ...prev,
            [userReaction]: Math.max(0, (prev[userReaction] || 0) - 1)
          }));
        } else {
          // New reaction
          setLikesCount(prev => prev + 1);
        }
        
        // Add new reaction
        setUserReaction(reactionEmoji);
        setHasLiked(true);
        setReactions(prev => ({
          ...prev,
          [reactionEmoji]: (prev[reactionEmoji] || 0) + 1
        }));
      }
      
      // Perform the actual reaction operation
      await PostService.toggleReaction(postId, user.uid, reactionEmoji);
      
      // Server operation successful - now handle XP and notifications
      if (postUserId !== user.uid && userReaction !== reactionEmoji) {
        try {
          if (reactionEmoji !== userReaction) {
            // User just reacted to the post
            console.log('🎯 Reaction successful - awarding XP to post owner');
            await xpService.awardForLike(postUserId);
            
            // Send notification for the reaction
            await notificationService.createLikeNotification(user.uid, postUserId, postId);
            console.log('📱 Reaction notification sent successfully');
          }
        } catch (xpError) {
          console.warn('XP operation failed, but reaction action succeeded:', xpError);
        }
      }
      
      console.log('✅ Reaction action completed successfully');
      
    } catch (error) {
      console.error('❌ Reaction action failed:', error);
      
      // Rollback optimistic updates on error
      setUserReaction(previousReaction);
      setReactions(previousReactions);
      setHasLiked(!!previousReaction);
      setLikesCount(previousLikesCount);
      
      // Show error message to user
      Alert.alert(
        'Error', 
        'Failed to update reaction. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLiking(false);
      setShowReactionPicker(false);
    }
  };

  const handleLongPress = () => {
    console.log('🔥 Long press detected - showing reaction picker');
    console.log('Current showReactionPicker state:', showReactionPicker);
    setShowReactionPicker(true);
    console.log('Set showReactionPicker to true');
  };

  const handleQuickReaction = () => {
    console.log('👆 Quick tap - using default like reaction');
    handleReaction('👍');
  };

  const handlePressIn = () => {
    console.log('👇 Press in detected');
  };

  const handlePressOut = () => {
    console.log('👆 Press out detected');
  };

  const handleCommentLike = async (comment: Comment) => {
    if (!user?.uid) return;
    
    // Store current state for potential rollback
    const currentLiked = commentLikes[comment.id] || false;
    const currentCount = commentLikesCount[comment.id] || 0;
    const previousLiked = currentLiked;
    const previousCount = currentCount;
    
    try {
      // Instant optimistic update for better UX
      setCommentLikes(prev => ({ ...prev, [comment.id]: !currentLiked }));
      setCommentLikesCount(prev => ({ 
        ...prev, 
        [comment.id]: currentLiked ? currentCount - 1 : currentCount + 1 
      }));
      
      // Perform the actual comment like/unlike operation
      await PostService.toggleCommentLike(postId, comment.id, user.uid);
      
      // Server operation successful - now handle XP and notifications
      if (comment.userId !== user.uid) {
        try {
          if (!currentLiked) {
            // User just liked the comment
            console.log('🎯 Comment like successful - awarding XP to comment owner');
            await xpService.awardForCommentLike(comment.userId);
            
            // Send notification for the comment like
            await notificationService.createCommentLikeNotification(
              user.uid, 
              comment.userId, 
              postId, 
              comment.id
            );
            console.log('📱 Comment like notification sent successfully');
          } else {
            // User just unliked the comment
            console.log('🎯 Comment unlike successful - deducting XP from comment owner');
            await xpService.deductForCommentUnlike(comment.userId);
            console.log('📉 XP deducted for comment unlike');
          }
        } catch (xpError) {
          console.warn('Comment XP operation failed, but like action succeeded:', xpError);
          // XP failure shouldn't break the like functionality
        }
      }
      
      console.log('✅ Comment like action completed successfully');
      
    } catch (error) {
      console.error('❌ Comment like action failed:', error);
      
      // Rollback optimistic updates on error
      setCommentLikes(prev => ({ ...prev, [comment.id]: previousLiked }));
      setCommentLikesCount(prev => ({ 
        ...prev, 
        [comment.id]: previousCount 
      }));
      
      // Show error message to user
      Alert.alert(
        'Error', 
        'Failed to update comment like. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleReplyToComment = (comment: Comment) => {
    setReplyingToComment(comment);
    setNewComment(`@${comment.userName} `);
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
            onPress: () => navigation.navigate('Profile')
          }
        ]);
        return;
      }

      if (!newComment.trim()) {
        Alert.alert('Error', 'Please enter a comment');
        return;
      }

      // Remove @username prefix if replying
      let cleanComment = newComment.trim();
      let replyToCommentId: string | undefined;
      let replyToUserName: string | undefined;
      
      if (replyingToComment) {
        cleanComment = cleanComment.replace(`@${replyingToComment.userName} `, '');
        replyToCommentId = replyingToComment.id;
        replyToUserName = replyingToComment.userName;
      }

      await PostService.addComment(
        postId,
        user.uid,
        userProfile.name || user.email || 'Anonymous',
        userProfile.profilePhotoUrl || '',
        cleanComment,
        replyToCommentId,
        replyToUserName
      );

      setNewComment('');
      setReplyingToComment(null);
      
      // Notify post owner if not self-comment
      if (postUserId !== user.uid) {
        await notificationService.createCommentNotification(user.uid, postUserId, postId, cleanComment);
      }
      
      // Notify comment owner if replying to someone else's comment
      if (replyingToComment && replyingToComment.userId !== user.uid) {
        await notificationService.createCommentReplyNotification(
          user.uid,
          replyingToComment.userId,
          postId,
          replyingToComment.id,
          replyingToComment.content,
          cleanComment
        );
      }
      
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
        postId,
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
      navigation.navigate('Profile');
    } else {
      navigation.navigate('UserProfile', { userId: post.userId });
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
    console.log(`✅ PostCard userAvatar loaded for post ${post.id}: ${post.userAvatar || userProfile?.profilePhotoUrl}`);
    setAvatarError(false);
    ImageUtils.getImageSuccessHandler('PostCard-userAvatar')();
  };

  const getAvatarSource = () => {
    if (avatarError) {
      return { uri: 'https://via.placeholder.com/40x40/007AFF/FFFFFF?text=U' };
    }
    
    const avatarUrl = post.userAvatar || userProfile?.profilePhotoUrl || '';
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
        {post.content && (
          <PostTextComponent
            content={post.content}
            maxLines={3}
            maxCharacters={120}
            style={styles.postContent}
            onHashtagPress={(hashtag) => {
              // Navigate to hashtag search or page
              console.log('Hashtag tapped:', hashtag);
              // You can add navigation logic here
              // navigation.navigate('HashtagSearch', { hashtag });
            }}
            onMentionPress={(mention) => {
              // Navigate to user profile
              const username = mention.substring(1); // Remove @ symbol
              console.log('Mention tapped:', username);
              
              // Find the user in the post and navigate to their profile
              // This would require additional logic to map mentions to user IDs
              // For now, we'll just log the mention
              // You can implement user lookup logic here
            }}
          />
        )}

        {/* Reactions Display */}
        {Object.keys(reactions).length > 0 && (
          <View style={styles.reactionsDisplay}>
            {Object.entries(reactions)
              .filter(([_, count]) => count > 0)
              .sort(([_, a], [__, b]) => b - a)
              .slice(0, 3) // Show top 3 reactions
              .map(([emoji, count]) => (
                <View key={emoji} style={styles.reactionItem}>
                  <Text style={styles.reactionEmojiSmall}>{emoji}</Text>
                  <Text style={styles.reactionCount}>{count}</Text>
                </View>
              ))}
            {Object.values(reactions).reduce((sum, count) => sum + count, 0) > 0 && (
              <Text style={styles.totalReactions}>
                {Object.values(reactions).reduce((sum, count) => sum + count, 0)} reactions
              </Text>
            )}
          </View>
        )}
        
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
        {/* Like Button */}
        <TouchableOpacity 
          style={[styles.actionButton, hasLiked && styles.likedButton]} 
          onPress={handleQuickReaction}
          onLongPress={handleLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          delayLongPress={500}
          disabled={isLiking}
          activeOpacity={0.7}
        >
          {isLiking ? (
            <ActivityIndicator size="small" color={hasLiked ? "#007AFF" : "#666"} />
          ) : (
            <>
              <Text style={styles.reactionEmoji}>
                {userReaction || '👍'}
              </Text>
              <Text style={[styles.actionText, hasLiked && styles.likedText]}>{likesCount}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Debug: Manual Reaction Picker Button */}
        <TouchableOpacity 
          style={styles.debugReactionButton}
          onPress={() => {
            console.log('🐛 Debug button pressed - opening reaction picker');
            setShowReactionPicker(true);
          }}
        >
          <Text style={styles.debugButtonText}>+</Text>
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
                    
                    {/* Show reply indicator if this is a reply */}
                    {item.replyToUserName && (
                      <Text style={styles.replyIndicator}>
                        Replying to @{item.replyToUserName}
                      </Text>
                    )}
                    
                    <PostTextComponent
                      content={item.content}
                      maxLines={2}
                      maxCharacters={80}
                      style={styles.commentText}
                      onHashtagPress={(hashtag) => {
                        console.log('Comment hashtag tapped:', hashtag);
                      }}
                      onMentionPress={(mention) => {
                        const username = mention.substring(1);
                        console.log('Comment mention tapped:', username);
                      }}
                    />
                    
                    <View style={styles.commentActions}>
                      <Text style={styles.commentTimestamp}>
                        {formatTimestamp(item.createdAt)}
                      </Text>
                      
                      {/* Comment like button */}
                      <TouchableOpacity 
                        style={styles.commentLikeButton}
                        onPress={() => handleCommentLike(item)}
                      >
                        <Ionicons 
                          name={commentLikes[item.id] ? "heart" : "heart-outline"} 
                          size={16} 
                    color={commentLikes[item.id] ? "#007AFF" : "#666"} 
                        />
                        <Text style={[
                          styles.commentLikeText,
                    { color: commentLikes[item.id] ? "#007AFF" : "#666" }
                        ]}>
                          {commentLikesCount[item.id] || 0}
                        </Text>
                      </TouchableOpacity>
                      
                      {/* Reply button */}
                      <TouchableOpacity 
                        style={styles.commentReplyButton}
                        onPress={() => handleReplyToComment(item)}
                      >
                        <Ionicons name="chatbubble-outline" size={16} color="#666" />
                        <Text style={styles.commentReplyText}>Reply</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
              style={styles.commentsList}
            />
          )}
          
          {/* Add Comment */}
          <View style={styles.addCommentContainer}>
            {replyingToComment && (
              <View style={styles.replyingToContainer}>
                <Text style={styles.replyingToText}>
                  Replying to @{replyingToComment.userName}
                </Text>
                <TouchableOpacity 
                  onPress={() => setReplyingToComment(null)}
                  style={styles.cancelReplyButton}
                >
                  <Ionicons name="close" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            )}
            <TextInput
              style={styles.commentInput}
              placeholder={replyingToComment ? `Reply to @${replyingToComment.userName}...` : "Add a comment..."}
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
                              <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                <Text style={[styles.optionText, { color: '#FF6B6B' }]}>Delete Post</Text>
            </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.optionButton} onPress={handleReport}>
                <Ionicons name="flag-outline" size={20} color="#FF9500" />
                <Text style={[styles.optionText, { color: '#FF9500' }]}>Report Post</Text>
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

      {/* Reaction Picker Modal */}
      <Modal
        visible={showReactionPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReactionPicker(false)}
        statusBarTranslucent={true}
      >
        <TouchableOpacity
          style={styles.reactionPickerOverlay}
          activeOpacity={1}
          onPress={() => {
            console.log('🚫 Closing reaction picker');
            setShowReactionPicker(false);
          }}
        >
          <View style={styles.reactionPickerContainer}>
            <Text style={styles.reactionPickerTitle}>Choose your reaction</Text>
            <View style={styles.reactionPicker}>
              {REACTION_OPTIONS.map((reaction) => (
                <TouchableOpacity
                  key={reaction.emoji}
                  style={[
                    styles.reactionOption,
                    userReaction === reaction.emoji && styles.selectedReaction
                  ]}
                  onPress={() => {
                    console.log('🎯 Reaction selected:', reaction.emoji, reaction.name);
                    handleReaction(reaction.emoji);
                  }}
                >
                  <Text style={styles.reactionOptionEmoji}>{reaction.emoji}</Text>
                  <Text style={styles.reactionOptionName}>{reaction.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 24,
    marginBottom: 8,
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
    color: '#007AFF',
    fontWeight: '600',
  },
  likedButton: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
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
  replyIndicator: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  commentLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  commentLikeText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  commentReplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  commentReplyText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  replyingToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  replyingToText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  cancelReplyButton: {
    padding: 4,
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
  reactionEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  reactionPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reactionPickerContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  reactionPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  reactionOption: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    width: '30%',
    minHeight: 80,
    backgroundColor: '#fafafa',
  },
  selectedReaction: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
    borderWidth: 3,
  },
  reactionOptionEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  reactionOptionName: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  reactionsDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    alignItems: 'center',
  },
  reactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 5,
  },
  reactionEmojiSmall: {
    fontSize: 20,
    marginRight: 5,
  },
  reactionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  totalReactions: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  reactionPickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  debugReactionButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  debugButtonText: {
    fontSize: 24,
    color: '#666',
  },
});

export default PostCard; 