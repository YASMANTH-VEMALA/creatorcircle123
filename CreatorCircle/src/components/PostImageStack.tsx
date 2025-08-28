import React, { useState, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Animated,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { ImageUtils } from '../utils/imageUtils';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');

interface PostImageStackProps {
  media: string[];
  onImagePress?: (uri: string, index: number) => void;
}

const PostImageStack: React.FC<PostImageStackProps> = ({ media, onImagePress }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState<{ [key: number]: boolean }>({});
  const [imageErrors, setImageErrors] = useState<{ [key: number]: boolean }>({});
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Early return for empty media
  if (!media || media.length === 0) {
    return null;
  }

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

  const handleImagePress = (uri: string, index: number) => {
    console.log('PostImageStack: Image pressed:', uri, 'at index:', index);
    if (onImagePress) {
      onImagePress(uri, index);
    }
  };

  const handleIndexChange = (newIndex: number) => {
    if (newIndex === currentIndex) return;

    // Fade out current image
    Animated.timing(fadeAnim, {
      toValue: 0.3,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex(newIndex);
      // Fade back in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleImageLoadStart = (index: number) => {
    const imageUrl = media[index];
    console.log(`🔄 PostImageStack: Loading image ${index}: ${imageUrl}`);
    
    // Validate URL before loading
    if (!ImageUtils.isValidImageUrl(imageUrl)) {
      console.error(`❌ PostImageStack: Invalid URL for image ${index}: ${imageUrl}`);
      handleImageError(index);
      return;
    }
    
    setImageLoading(prev => ({ ...prev, [index]: true }));
    setImageErrors(prev => ({ ...prev, [index]: false }));
  };

  const handleImageLoadEnd = (index: number) => {
    console.log(`✅ PostImageStack: Image ${index} loaded successfully`);
    setImageLoading(prev => ({ ...prev, [index]: false }));
  };

  const handleImageError = (index: number) => {
    console.error(`❌ PostImageStack: Image ${index} failed to load: ${media[index]}`);
    setImageLoading(prev => ({ ...prev, [index]: false }));
    setImageErrors(prev => ({ ...prev, [index]: true }));
    
    // Try to reload the image after a delay
    setTimeout(() => {
      setImageErrors(prev => ({ ...prev, [index]: false }));
      setImageLoading(prev => ({ ...prev, [index]: true }));
    }, 2000);
  };

  const renderMediaItem = (uri: string, index: number) => {
    if (isVideo(uri)) {
      return (
        <View style={styles.mediaContainer}>
          <Video
            source={{ uri }}
            style={styles.media}
            useNativeControls
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            onError={(error) => {
              console.error('Video error:', error);
              handleImageError(index);
            }}
            onLoad={() => handleImageLoadEnd(index)}
            onLoadStart={() => handleImageLoadStart(index)}
          />
          {imageLoading[index] && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading video...</Text>
            </View>
          )}
          <View style={styles.videoIndicator}>
            <Ionicons name="play-circle" size={24} color="white" />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.mediaContainer}>
        <Animated.View style={{ opacity: index === currentIndex ? fadeAnim : 1 }}>
          <Image
            source={{ uri }}
            style={[styles.media, { backgroundColor: '#f0f0f0' }]}
            contentFit="cover"
            onLoadStart={() => handleImageLoadStart(index)}
            onLoad={() => handleImageLoadEnd(index)}
            onError={() => handleImageError(index)}
            cachePolicy="disk"
            transition={200}
          />
        </Animated.View>
        
        {imageLoading[index] && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading image...</Text>
          </View>
        )}

        {imageErrors[index] && (
          <View style={styles.errorOverlay}>
            <Ionicons name="image-outline" size={32} color="#ccc" />
            <Text style={styles.errorText}>Failed to load</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={async () => {
                const imageUrl = media[index];
                console.log(`🔄 PostImageStack: Retrying image ${index}: ${imageUrl}`);
                
                setImageErrors(prev => ({ ...prev, [index]: false }));
                setImageLoading(prev => ({ ...prev, [index]: true }));
                
                // Try to preload the image to check if it's accessible
                const isAccessible = await ImageUtils.checkImageAccessibility(imageUrl);
                if (!isAccessible) {
                  console.error(`❌ PostImageStack: Image ${index} is not accessible: ${imageUrl}`);
                  setTimeout(() => handleImageError(index), 1000);
                }
              }}
            >
              <Ionicons name="refresh" size={16} color="#007AFF" />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (media.length === 1) {
    return (
      <TouchableOpacity 
        onPress={() => handleImagePress(media[0], 0)}
        activeOpacity={0.9}
      >
        {renderMediaItem(media[0], 0)}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={() => handleImagePress(media[currentIndex], currentIndex)}
        activeOpacity={0.9}
      >
        {renderMediaItem(media[currentIndex], currentIndex)}
      </TouchableOpacity>

      {/* Navigation Controls */}
      <View style={styles.controls}>
        {currentIndex > 0 && (
          <TouchableOpacity
            style={[styles.navButton, styles.leftButton]}
            onPress={() => handleIndexChange(currentIndex - 1)}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        )}

        {currentIndex < media.length - 1 && (
          <TouchableOpacity
            style={[styles.navButton, styles.rightButton]}
            onPress={() => handleIndexChange(currentIndex + 1)}
          >
            <Ionicons name="chevron-forward" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Pagination Dots */}
      {media.length > 1 && (
        <View style={styles.pagination}>
          {media.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.activeDot
              ]}
              onPress={() => handleIndexChange(index)}
            />
          ))}
        </View>
      )}

      {/* Counter */}
      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {currentIndex + 1} / {media.length}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  mediaContainer: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f0f0f0',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  controls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  navButton: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftButton: {
    left: 10,
  },
  rightButton: {
    right: 10,
  },
  pagination: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: 'white',
    width: 12,
    height: 8,
    borderRadius: 4,
  },
  counter: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  videoIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(248, 249, 250, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  retryText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
});

export default PostImageStack; 