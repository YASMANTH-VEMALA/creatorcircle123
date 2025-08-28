import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { SpotlightService } from '../services/spotlightService';
import PostTextComponent from '../components/PostTextComponent';
import UserTagInput from '../components/UserTagInput';
import { Profile } from '../types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CreateSpotlightScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [taggedUsers, setTaggedUsers] = useState<Profile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const videoRef = useRef<Video>(null);

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        aspect: [9, 16], // Vertical video aspect ratio
        quality: 0.8,
        videoMaxDuration: 60, // Max 60 seconds
      });

      if (!result.canceled && result.assets[0]) {
        setVideoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const recordVideo = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to record videos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets[0]) {
        setVideoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error recording video:', error);
      Alert.alert('Error', 'Failed to record video');
    }
  };

  const handleVideoLoad = (data: any) => {
    if (data.durationMillis) {
      setVideoDuration(Math.floor(data.durationMillis / 1000));
    }
  };

  const handleCaptionChange = (text: string) => {
    setCaption(text);
  };

  const handleTagsChange = (users: Profile[]) => {
    setTaggedUsers(users);
  };

  const createSpotlightPost = async () => {
    if (!videoUri) {
      Alert.alert('Error', 'Please select a video first');
      return;
    }

    if (!caption.trim()) {
      Alert.alert('Error', 'Please add a caption to your reel');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      setIsUploading(true);

      // TODO: Upload video to Firebase Storage and get URL
      // For now, we'll use the local URI
      const videoURL = videoUri;

      // Extract hashtags and mentions from caption
      const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
      const mentionRegex = /@[\w\u0590-\u05ff]+/g;
      
      const hashtags = Array.from(caption.matchAll(hashtagRegex)).map(match => match[0]);
      const mentions = Array.from(caption.matchAll(mentionRegex)).map(match => match[0]);

      // Create the spotlight post
      const postId = await SpotlightService.createSpotlightPost({
        userId: user.uid,
        videoURL,
        caption: caption.trim(),
        duration: videoDuration,
        isPublic: true,
        tags: hashtags,
        mentions: mentions,
      });

      Alert.alert(
        'Success!',
        'Your spotlight post has been created successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error creating spotlight post:', error);
      Alert.alert('Error', 'Failed to create spotlight post. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const getPreviewContent = () => {
    let content = caption;
    
    // Add tagged users to the content if they're not already mentioned
    taggedUsers.forEach(user => {
      const mention = `@${user.name.split(' ')[0]}`;
      if (!content.includes(mention)) {
        content += ` ${mention}`;
      }
    });
    
    return content.trim();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Ionicons name="flash" size={24} color="#FF6B35" />
            <Text style={styles.headerTitle}>Create Spotlight</Text>
          </View>
          <TouchableOpacity
            style={[styles.postButton, (!videoUri || !caption.trim() || isUploading) && styles.postButtonDisabled]}
            onPress={createSpotlightPost}
            disabled={!videoUri || !caption.trim() || isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Video Section */}
        <View style={styles.videoSection}>
          {videoUri ? (
            <View style={styles.videoContainer}>
              <Video
                ref={videoRef}
                source={{ uri: videoUri }}
                style={styles.video}
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
                isLooping={false}
                onLoad={handleVideoLoad}
              />
              <View style={styles.videoOverlay}>
                <TouchableOpacity style={styles.playButton} onPress={() => videoRef.current?.playAsync()}>
                  <Ionicons name="play" size={32} color="white" />
                </TouchableOpacity>
              </View>
              <View style={styles.videoInfo}>
                <Text style={styles.videoDuration}>{formatDuration(videoDuration)}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.videoPlaceholder}>
              <Ionicons name="videocam-outline" size={80} color="#666" />
              <Text style={styles.placeholderText}>No video selected</Text>
              <Text style={styles.placeholderSubtext}>Choose a video to create your reel</Text>
            </View>
          )}

          {/* Video Action Buttons */}
          <View style={styles.videoActions}>
            <TouchableOpacity style={styles.videoActionButton} onPress={pickVideo}>
              <Ionicons name="images-outline" size={24} color="white" />
              <Text style={styles.videoActionText}>Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.videoActionButton} onPress={recordVideo}>
              <Ionicons name="camera" size={24} color="white" />
              <Text style={styles.videoActionText}>Record</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Caption Section */}
        <View style={styles.captionSection}>
          <Text style={styles.sectionTitle}>Caption</Text>
          <TextInput
            style={styles.captionInput}
            value={caption}
            onChangeText={handleCaptionChange}
            placeholder="Write a caption for your reel... Use #hashtags and @mentions"
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>
            {caption.length}/500 characters
          </Text>
        </View>

        {/* User Tagging Section */}
        <View style={styles.taggingSection}>
          <Text style={styles.sectionTitle}>Tag People</Text>
          <UserTagInput
            onTagsChange={handleTagsChange}
            placeholder="Search and tag people..."
            maxTags={5}
            currentUserId={user?.uid}
          />
        </View>

        {/* Preview Section */}
        {caption.trim() && (
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Preview</Text>
            <View style={styles.previewContainer}>
              <PostTextComponent
                content={getPreviewContent()}
                maxLines={5}
                maxCharacters={200}
                style={styles.previewText}
              />
            </View>
          </View>
        )}

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Tips for Great Reels</Text>
          <Text style={styles.tipText}>• Keep videos under 60 seconds</Text>
          <Text style={styles.tipText}>• Use engaging captions with hashtags</Text>
          <Text style={styles.tipText}>• Tag relevant people and brands</Text>
          <Text style={styles.tipText}>• Choose vertical (9:16) aspect ratio</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#333',
  },
  postButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  videoSection: {
    padding: 16,
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: screenWidth * (16 / 9), // 9:16 aspect ratio
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 40,
    padding: 16,
  },
  videoInfo: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  videoDuration: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  videoPlaceholder: {
    width: '100%',
    height: screenWidth * (16 / 9),
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  placeholderText: {
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  placeholderSubtext: {
    color: '#999',
    fontSize: 14,
    marginTop: 4,
  },
  videoActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  videoActionButton: {
    flex: 1,
    backgroundColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  videoActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  captionSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
  },
  captionInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: 'white',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#333',
  },
  characterCount: {
    textAlign: 'right',
    color: '#666',
    fontSize: 12,
    marginTop: 8,
  },
  taggingSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  previewSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  previewContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  previewText: {
    color: 'white',
  },
  tipsSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    marginBottom: 32,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
  },
  tipText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
});

export default CreateSpotlightScreen; 