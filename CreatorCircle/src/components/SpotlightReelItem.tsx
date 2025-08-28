import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { SpotlightPostWithUser } from '../types/spotlight';
import PostTextComponent from './PostTextComponent';
import { useNavigation } from '@react-navigation/native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SpotlightReelItemProps {
  post: SpotlightPostWithUser;
  index: number;
  isVisible: boolean;
  onLikeToggle: (postId: string, isLiked: boolean) => void;
  onCommentPress: (postId: string) => void;
  onSharePress: (postId: string) => void;
  onProfilePress: (userId: string) => void;
  onMorePress: (postId: string) => void;
}

const SpotlightReelItem: React.FC<SpotlightReelItemProps> = ({
  post,
  index,
  isVisible,
  onLikeToggle,
  onCommentPress,
  onSharePress,
  onProfilePress,
  onMorePress,
}) => {
  const navigation = useNavigation();
  const [videoStatus, setVideoStatus] = useState<any>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<Video>(null);

  // Auto-play/pause based on visibility
  useEffect(() => {
    if (isVisible) {
      playVideo();
    } else {
      pauseVideo();
    }
  }, [isVisible]);

  const playVideo = async () => {
    try {
      if (videoRef.current) {
        await videoRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing video:', error);
    }
  };

  const pauseVideo = async () => {
    try {
      if (videoRef.current) {
        await videoRef.current.pauseAsync();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Error pausing video:', error);
    }
  };

  const toggleMute = async () => {
    try {
      if (videoRef.current) {
        if (isMuted) {
          await videoRef.current.setIsMutedAsync(false);
          setIsMuted(false);
        } else {
          await videoRef.current.setIsMutedAsync(true);
          setIsMuted(true);
        }
      }
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  const handleVideoPress = () => {
    if (isPlaying) {
      pauseVideo();
    } else {
      playVideo();
    }
  };

  // Handle video play/pause based on visibility
  useEffect(() => {
    if (isVisible) {
      if (videoRef.current) {
        videoRef.current.playAsync();
      }
    } else {
      if (videoRef.current) {
        videoRef.current.pauseAsync();
      }
    }
  }, [isVisible]);

  const handleLikePress = () => {
    onLikeToggle(post.id, post.isLiked);
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Video Player */}
      <TouchableOpacity
        style={styles.videoContainer}
        onPress={handleVideoPress}
        activeOpacity={1}
      >
        <Video
          ref={videoRef}
          source={{ uri: post.videoURL }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isVisible}
          isLooping
          isMuted={isMuted}
          onPlaybackStatusUpdate={setVideoStatus}
          onError={(error) => {
            console.error('Video error:', error);
            Alert.alert('Error', 'Failed to load video');
          }}
          onLoadStart={() => {
            // Pause video when it starts loading if not visible
            if (!isVisible && videoRef.current) {
              videoRef.current.pauseAsync();
            }
          }}
        />
        
        {/* Video Overlay */}
        <View style={styles.videoOverlay}>
          {/* Play/Pause Icon */}
          {!isPlaying && (
            <View style={styles.playButton}>
              <Ionicons name="play" size={40} color="white" />
            </View>
          )}
          
          {/* Mute/Unmute Button */}
          <TouchableOpacity style={styles.muteButton} onPress={toggleMute}>
            <Ionicons 
              name={isMuted ? "volume-mute" : "volume-high"} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Right Side Action Buttons */}
      <View style={styles.rightActions}>
        {/* Creator Profile Picture */}
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('UserProfile' as never, { userId: post.creator.uid } as never)}
        >
          <Image
            source={{ uri: post.creator.profilePhotoUrl }}
            style={styles.profilePicture}
            defaultSource={require('../../assets/icon.png')}
          />
          {post.creator.verifiedBadge !== 'none' && (
            <View style={styles.verifiedBadge}>
              <Ionicons 
                name="checkmark-circle" 
                size={16} 
                color={post.creator.verifiedBadge === 'gold' ? '#FFD700' : '#C0C0C0'} 
              />
            </View>
          )}
        </TouchableOpacity>

        {/* Like Button */}
        <TouchableOpacity style={styles.actionButton} onPress={handleLikePress}>
          <Ionicons 
            name={post.isLiked ? "heart" : "heart-outline"} 
            size={32} 
            color={post.isLiked ? "#FF3B30" : "white"} 
          />
          <Text style={styles.actionCount}>{formatCount(post.likesCount)}</Text>
        </TouchableOpacity>

        {/* Comment Button */}
        <TouchableOpacity style={styles.actionButton} onPress={() => {
          // Directly open comments modal
          onCommentPress(post.id);
        }}>
          <Ionicons name="chatbubble-outline" size={32} color="white" />
          <Text style={styles.actionCount}>{formatCount(post.commentsCount)}</Text>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity style={styles.actionButton} onPress={() => {
          // Directly trigger share to chat
          onSharePress(post.id);
        }}>
          <Ionicons name="share-outline" size={32} color="white" />
          <Text style={styles.actionCount}>{formatCount(post.sharesCount)}</Text>
        </TouchableOpacity>

        {/* More Options Button */}
        <TouchableOpacity style={styles.actionButton} onPress={() => onMorePress(post.id)}>
          <Ionicons name="ellipsis-vertical" size={32} color="white" />
        </TouchableOpacity>
      </View>

      {/* Bottom Content */}
      <View style={styles.bottomContent}>
        {/* Creator Info Row */}
        <View style={styles.creatorInfoRow}>
          <TouchableOpacity 
            style={styles.creatorProfileButton}
            onPress={() => navigation.navigate('UserProfile' as never, { userId: post.creator.uid } as never)}
          >
            <Image
              source={{ uri: post.creator.profilePhotoUrl }}
              style={styles.creatorProfilePicture}
              defaultSource={require('../../assets/icon.png')}
            />
            <View style={styles.creatorTextInfo}>
              <Text style={styles.username}>@{post.creator.username}</Text>
              {post.creator.verifiedBadge !== 'none' && (
                <View style={styles.verifiedBadgeSmall}>
                  <Ionicons 
                    name="checkmark-circle" 
                    size={16} 
                    color={post.creator.verifiedBadge === 'gold' ? '#FFD700' : '#C0C0C0'} 
                  />
                </View>
              )}
            </View>
          </TouchableOpacity>
          
          {/* Follow Button */}
          <TouchableOpacity style={styles.followButton}>
            <Text style={styles.followButtonText}>Follow</Text>
          </TouchableOpacity>
        </View>

        {/* Caption */}
        {post.caption && (
          <View style={styles.captionContainer}>
            <PostTextComponent
              content={post.caption}
              maxLines={2}
              maxCharacters={80}
              style={styles.caption}
              onHashtagPress={(hashtag) => {
                console.log('Hashtag tapped:', hashtag);
              }}
              onMentionPress={(mention) => {
                console.log('Mention tapped:', mention);
              }}
            />
          </View>
        )}

        {/* Audio Info */}
        <View style={styles.audioInfo}>
          <Ionicons name="musical-notes" size={16} color="white" />
          <Text style={styles.audioText}>
            {post.audioInfo || 'Original audio'}
          </Text>
          <Text style={styles.duration}>
            {formatDuration(post.duration)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: screenWidth,
    height: screenHeight,
    backgroundColor: '#000000',
    position: 'relative',
    overflow: 'hidden',
    maxWidth: screenWidth,
    maxHeight: screenHeight,
  },
  videoContainer: {
    width: screenWidth,
    height: screenHeight,
    position: 'absolute',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: screenWidth,
    maxHeight: screenHeight,
  },
  video: {
    width: screenWidth,
    height: screenHeight,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    maxWidth: screenWidth,
    maxHeight: screenHeight,
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
    borderRadius: 50,
    padding: 20,
  },
  muteButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  rightActions: {
    position: 'absolute',
    right: 16,
    bottom: 200,
    alignItems: 'center',
    gap: 20,
  },
  profileButton: {
    position: 'relative',
    marginBottom: 10,
  },
  profilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'white',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomContent: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 100,
  },
  creatorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  creatorProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  creatorProfilePicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
    marginRight: 12,
  },
  creatorTextInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  verifiedBadgeSmall: {
    backgroundColor: 'white',
    borderRadius: 8,
  },
  followButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  followButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  captionContainer: {
    marginBottom: 12,
  },
  caption: {
    color: 'white',
    fontSize: 14,
    lineHeight: 18,
  },
  audioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  audioText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  duration: {
    color: 'white',
    fontSize: 12,
    opacity: 0.8,
  },
});

export default SpotlightReelItem; 