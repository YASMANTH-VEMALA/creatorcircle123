import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Image,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../types';
import { PostService } from '../services/postService';
import { Avatar } from './ui/Avatar';
import { ImageUtils } from '../utils/imageUtils';
import PostTextComponent from './PostTextComponent';

const { width, height } = Dimensions.get('window');

interface NotificationPostModalProps {
  isVisible: boolean;
  postId?: string;
  onClose: () => void;
}

const NotificationPostModal: React.FC<NotificationPostModalProps> = ({
  isVisible,
  postId,
  onClose,
}) => {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (isVisible && postId) {
      loadPost();
    }
  }, [isVisible, postId]);

  const loadPost = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading post for modal:', postId);
      
      if (!postId) {
        console.log('No post ID provided');
        setLoading(false);
        return;
      }
      
      const foundPost = await PostService.getPost(postId);
      console.log('Post loaded:', foundPost);
      
      if (foundPost) {
        setPost(foundPost);
      } else {
        console.log('Post not found');
      }
    } catch (error) {
      console.error('Error loading post for notification:', error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  const handleImagePress = useCallback((index: number) => {
    setCurrentImageIndex(index);
  }, []);

  const formatTimestamp = useCallback((timestamp: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return timestamp.toLocaleDateString();
  }, []);

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post Preview</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading post...</Text>
            </View>
          ) : post ? (
            <View style={styles.postContainer}>
              {/* User Info */}
              <View style={styles.userInfo}>
                <Avatar
                  source={post.userAvatar}
                  size="large"
                  style={styles.userAvatar}
                />
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{post.userName}</Text>
                  {post.userCollege && (
                    <Text style={styles.userCollege}>{post.userCollege}</Text>
                  )}
                  <Text style={styles.timestamp}>{formatTimestamp(post.createdAt)}</Text>
                </View>
              </View>

              {/* Post Content */}
              {post.content && (
                <PostTextComponent
                  content={post.content}
                  maxLines={3}
                  maxCharacters={120}
                  style={styles.postContent}
                  onHashtagPress={(hashtag) => {
                    console.log('Hashtag tapped:', hashtag);
                  }}
                  onMentionPress={(mention) => {
                    const username = mention.substring(1);
                    console.log('Mention tapped:', username);
                  }}
                />
              )}

              {/* Post Images */}
              {post.images && post.images.length > 0 && (
                <View style={styles.imagesContainer}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled
                    onMomentumScrollEnd={(event) => {
                      const index = Math.round(event.nativeEvent.contentOffset.x / (width - 40));
                      setCurrentImageIndex(index);
                    }}
                  >
                    {post.images.map((image, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.imageWrapper}
                        onPress={() => handleImagePress(index)}
                        activeOpacity={0.9}
                      >
                        <Image
                          source={{ uri: image }}
                          style={styles.postImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  
                  {/* Image Indicators */}
                  {post.images.length > 1 && (
                    <View style={styles.imageIndicators}>
                      {post.images.map((_, index) => (
                        <View
                          key={index}
                          style={[
                            styles.indicator,
                            index === currentImageIndex && styles.indicatorActive
                          ]}
                        />
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Post Stats */}
              <View style={styles.postStats}>
                <View style={styles.statItem}>
                  <Ionicons name="heart" size={16} color="#FF3B30" />
                  <Text style={styles.statText}>{post.likes || 0}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="chatbubble" size={16} color="#007AFF" />
                  <Text style={styles.statText}>{post.comments || 0}</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="heart-outline" size={24} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="chatbubble-outline" size={24} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="share-outline" size={24} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.errorContainer}>
              <Ionicons name="document-outline" size={64} color="#ccc" />
              <Text style={styles.errorTitle}>Post Not Found</Text>
              <Text style={styles.errorSubtitle}>
                The post you're looking for doesn't exist or has been deleted.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  headerSpacer: {
    width: 40, // Adjust as needed for spacing
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  postContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
    padding: 20,
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
  userAvatar: {
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userCollege: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  postContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 16,
  },
  imagesContainer: {
    marginBottom: 16,
  },
  imageWrapper: {
    width: width - 40,
    height: 300,
    marginRight: 0,
  },
  postImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  indicatorActive: {
    backgroundColor: '#007AFF',
  },
  postStats: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  statText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
  },
  actionButton: {
    marginRight: 32,
    padding: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default NotificationPostModal; 