import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { useAuth } from '../contexts/AuthContext';
import { PostService } from '../services/postService';
import { SpotlightService } from '../services/spotlightService';
import { ProfileValidationService } from '../services/profileValidationService';
import { UserService } from '../services/userService';
import { ProfileImageService } from '../services/profileImageService';

const { width } = Dimensions.get('window');

interface PostCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

const PostCreationModal: React.FC<PostCreationModalProps> = ({
  visible,
  onClose,
  onPostCreated,
}) => {
  const { user } = useAuth();
  
  // State management
  const [content, setContent] = useState('');
  const [emoji, setEmoji] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [postType, setPostType] = useState<'post' | 'spotlight'>('post');
  const [isCreating, setIsCreating] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [characterCount, setCharacterCount] = useState(0);
  const [mediaCount, setMediaCount] = useState(0);

  const MAX_CONTENT_LENGTH = 1000;
  const MAX_IMAGES = 10;
  const MAX_VIDEOS = 2;

  useEffect(() => {
    if (visible && user?.uid) {
      loadUserProfile();
    }
  }, [visible, user]);

  useEffect(() => {
    setCharacterCount(content.length);
    setMediaCount(images.length + videos.length);
  }, [content, images, videos]);

  const loadUserProfile = async () => {
    try {
      const profile = await UserService.getUserProfile(user!.uid);
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const resetForm = () => {
    setContent('');
    setEmoji('');
    setImages([]);
    setVideos([]);
    setPostType('post');
    setIsCreating(false);
  };

  const handleClose = () => {
    if (content.trim() || emoji || images.length > 0 || videos.length > 0) {
      Alert.alert(
        'Discard Post',
        'Are you sure you want to discard this post?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              resetForm();
              onClose();
            },
          },
        ]
      );
    } else {
      resetForm();
      onClose();
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photo library');
        return;
      }

      if (images.length >= MAX_IMAGES) {
        Alert.alert('Image Limit Reached', `You can only upload up to ${MAX_IMAGES} images per post`);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: MAX_IMAGES - images.length,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        setImages(prev => [...prev, ...newImages]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photo library');
        return;
      }

      if (videos.length >= MAX_VIDEOS) {
        Alert.alert('Video Limit Reached', `You can only upload up to ${MAX_VIDEOS} videos per post`);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: true,
        selectionLimit: MAX_VIDEOS - videos.length,
        quality: 0.8,
        videoMaxDuration: 60, // 60 seconds max
      });

      if (!result.canceled && result.assets) {
        const newVideos = result.assets.map(asset => asset.uri);
        setVideos(prev => [...prev, ...newVideos]);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const removeMedia = (index: number, type: 'image' | 'video') => {
    if (type === 'image') {
      setImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setVideos(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleCreatePost = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (!content.trim() && images.length === 0 && videos.length === 0) {
      Alert.alert('Error', 'Please add some content, image, or video to your post');
      return;
    }

    // Check if user's profile is complete
    if (userProfile) {
      const profileCheck = ProfileValidationService.canPerformAction(userProfile, 'create_post');
      if (!profileCheck.allowed) {
        Alert.alert('Profile Incomplete', profileCheck.message, [
          { text: 'OK' },
          { 
            text: 'Complete Profile', 
            onPress: () => {
              handleClose();
              // Navigate to profile screen
            }
          }
        ]);
        return;
      }
    }

    setIsCreating(true);

    try {
      if (postType === 'spotlight') {
        // Validate Spotlight post requirements
        if (videos.length === 0) {
          Alert.alert('Error', 'Spotlight posts must include a video');
          setIsCreating(false);
          return;
        }
        
        // Create Spotlight post
        const videoUri = videos[0];
        await SpotlightService.createSpotlightPost({
          userId: user.uid,
          videoURL: videoUri,
          caption: content.trim(),
          duration: 0, // You can calculate actual duration if needed
          isPublic: true,
          tags: content.match(/#\w+/g)?.map(tag => tag.substring(1)) || [],
          mentions: content.match(/@\w+/g)?.map(mention => mention.substring(1)) || [],
        });
        
        Alert.alert('Success', 'Spotlight post created successfully!');
      } else {
        // Create regular post
        await PostService.createPost(
          user.uid,
          content.trim(),
          images,
          videos,
          emoji || undefined
        );
        
        Alert.alert('Success', 'Post created successfully!');
      }
      
      onPostCreated();
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const renderMediaPreview = () => {
    const allMedia = [
      ...images.map((uri, index) => ({ uri, type: 'image' as const, index })),
      ...videos.map((uri, index) => ({ uri, type: 'video' as const, index }))
    ];

    if (allMedia.length === 0) return null;

    return (
      <View style={styles.mediaPreviewContainer}>
        <View style={styles.mediaPreviewHeader}>
          <View style={styles.mediaPreviewTitleContainer}>
            <Ionicons name="images" size={20} color="#007AFF" />
            <Text style={styles.mediaPreviewTitle}>Media Preview</Text>
          </View>
          <View style={styles.mediaCountBadge}>
            <Text style={styles.mediaCountText}>{mediaCount}</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScrollView}>
          {allMedia.map(({ uri, type, index }) => (
            <View key={`${type}-${index}`} style={styles.mediaItem}>
              {type === 'image' ? (
                <Image source={{ uri }} style={styles.mediaPreview} />
              ) : (
                <View style={styles.videoPreview}>
                  <Video
                    source={{ uri }}
                    style={styles.mediaPreview}
                    useNativeControls
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                  />
                  <View style={styles.videoOverlay}>
                    <Ionicons name="play-circle" size={24} color="white" />
                  </View>
                </View>
              )}
              <TouchableOpacity
                style={styles.removeMediaButton}
                onPress={() => removeMedia(index, type)}
              >
                <Ionicons name="close-circle" size={24} color="#FF3B30" />
              </TouchableOpacity>
              <View style={styles.mediaTypeBadge}>
                <Text style={styles.mediaTypeText}>{type === 'image' ? 'IMG' : 'VID'}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const canPost = content.trim().length > 0 || images.length > 0 || videos.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Modern Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} disabled={isCreating} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Post</Text>
          <TouchableOpacity
            onPress={handleCreatePost}
            disabled={isCreating || !canPost}
            style={[
              styles.createButton,
              (!canPost || isCreating) && styles.createButtonDisabled
            ]}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.createButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* User Profile Section */}
        <View style={styles.userProfileSection}>
          <Image 
            source={{ uri: userProfile?.profilePhotoUrl || 'https://via.placeholder.com/40x40/007AFF/FFFFFF?text=U' }} 
            style={styles.userAvatar}
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userProfile?.name || 'Anonymous'}</Text>
            <Text style={styles.userCollege}>{userProfile?.college || 'College'}</Text>
          </View>
        </View>

        {/* Post Type Selection */}
        <View style={styles.postTypeSection}>
          <Text style={styles.postTypeLabel}>Post Type:</Text>
          <View style={styles.postTypeButtons}>
            <TouchableOpacity
              style={[styles.postTypeButton, postType === 'post' && styles.postTypeButtonActive]}
              onPress={() => setPostType('post')}
            >
              <Ionicons name="document-text" size={20} color={postType === 'post' ? 'white' : '#666'} />
              <Text style={[styles.postTypeButtonText, postType === 'post' && styles.postTypeButtonTextActive]}>
                Regular Post
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.postTypeButton, postType === 'spotlight' && styles.postTypeButtonActive]}
              onPress={() => setPostType('spotlight')}
            >
              <Ionicons name="flash" size={20} color={postType === 'spotlight' ? 'white' : '#FF6B35'} />
              <Text style={[styles.postTypeButtonText, postType === 'spotlight' && styles.postTypeButtonTextActive]}>
                Spotlight
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Text Input */}
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="What's on your mind?"
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              maxLength={MAX_CONTENT_LENGTH}
              placeholderTextColor="#999"
            />
            <View style={styles.inputFooter}>
              <Text style={styles.characterCount}>
                {characterCount}/{MAX_CONTENT_LENGTH}
              </Text>
            </View>
          </View>

          {/* Emoji Input */}
          <View style={styles.emojiContainer}>
            <TextInput
              style={styles.emojiInput}
              placeholder="😊 Add an emoji (optional)"
              value={emoji}
              onChangeText={setEmoji}
              maxLength={10}
              placeholderTextColor="#999"
            />
          </View>

          {/* Media Preview */}
          {renderMediaPreview()}

          {/* Modern Media Actions */}
          <View style={styles.mediaActions}>
            <TouchableOpacity 
              style={[styles.mediaButton, images.length >= MAX_IMAGES && styles.mediaButtonDisabled]} 
              onPress={pickImage}
              disabled={images.length >= MAX_IMAGES}
            >
              <View style={[styles.mediaButtonIcon, { backgroundColor: '#4CAF50' }]}>
                <Ionicons name="images" size={20} color="white" />
              </View>
              <View style={styles.mediaButtonContent}>
                <Text style={[styles.mediaButtonText, images.length >= MAX_IMAGES && styles.mediaButtonTextDisabled]}>
                  Photos
                </Text>
                <Text style={styles.mediaButtonCount}>{images.length}/{MAX_IMAGES}</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.mediaButton, videos.length >= (postType === 'spotlight' ? 1 : MAX_VIDEOS) && styles.mediaButtonDisabled]} 
              onPress={pickVideo}
              disabled={videos.length >= (postType === 'spotlight' ? 1 : MAX_VIDEOS)}
            >
              <View style={[styles.mediaButtonIcon, { backgroundColor: postType === 'spotlight' ? '#FF6B35' : '#FF5722' }]}>
                <Ionicons name={postType === 'spotlight' ? 'flash' : 'videocam'} size={20} color="white" />
              </View>
              <View style={styles.mediaButtonContent}>
                <Text style={[styles.mediaButtonText, videos.length >= (postType === 'spotlight' ? 1 : MAX_VIDEOS) && styles.mediaButtonTextDisabled]}>
                  {postType === 'spotlight' ? 'Spotlight Video' : 'Videos'}
                </Text>
                <Text style={styles.mediaButtonCount}>{videos.length}/{postType === 'spotlight' ? 1 : MAX_VIDEOS}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Modern Guidelines */}
          <View style={styles.guidelines}>
            <View style={styles.guidelinesHeader}>
              <Ionicons name="information-circle" size={20} color="#007AFF" />
              <Text style={styles.guidelinesTitle}>Posting Guidelines</Text>
            </View>
            <View style={styles.guidelinesList}>
              <View style={styles.guidelineItem}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.guidelineText}>Keep content respectful and appropriate</Text>
              </View>
              <View style={styles.guidelineItem}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.guidelineText}>Maximum {MAX_CONTENT_LENGTH} characters</Text>
              </View>
              <View style={styles.guidelineItem}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.guidelineText}>Up to {MAX_IMAGES} images and {MAX_VIDEOS} videos</Text>
              </View>
              <View style={styles.guidelineItem}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.guidelineText}>Videos limited to 60 seconds</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  userProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userCollege: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  textInputContainer: {
    marginBottom: 16,
  },
  textInput: {
    fontSize: 16,
    minHeight: 120,
    padding: 0,
    marginBottom: 8,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
  },
  emojiContainer: {
    marginBottom: 16,
  },
  emojiInput: {
    fontSize: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  mediaPreviewContainer: {
    marginBottom: 16,
  },
  mediaPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mediaPreviewTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediaPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  mediaCountBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mediaCountText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  mediaScrollView: {
    // Add any specific styles for the ScrollView if needed
  },
  mediaItem: {
    position: 'relative',
    marginRight: 12,
  },
  mediaPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  videoPreview: {
    position: 'relative',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  removeMediaButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  mediaTypeBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mediaTypeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  mediaActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginHorizontal: 16,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 120,
    justifyContent: 'center',
  },
  mediaButtonDisabled: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ccc',
  },
  mediaButtonIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaButtonContent: {
    marginLeft: 12,
  },
  mediaButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  mediaButtonTextDisabled: {
    color: '#ccc',
  },
  mediaButtonCount: {
    fontSize: 12,
    color: '#999',
  },
  guidelines: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  guidelinesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  guidelinesList: {
    marginTop: 8,
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  guidelineText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  postTypeSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  postTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  postTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  postTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  postTypeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  postTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 8,
  },
  postTypeButtonTextActive: {
    color: 'white',
  },
});

export default PostCreationModal; 