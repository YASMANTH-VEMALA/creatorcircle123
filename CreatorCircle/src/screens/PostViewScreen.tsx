import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Post } from '../types';
import { PostService } from '../services/postService';
import PostCard from '../components/PostCard';

const PostViewScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { postId } = route.params as { postId: string };
  
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPost = useCallback(async () => {
    try {
      setLoading(true);
      // Use a more efficient method to get a single post
      const foundPost = await PostService.getPost(postId);
      
      if (foundPost) {
        setPost(foundPost);
      } else {
        console.log('Post not found');
      }
    } catch (error) {
      console.error('Error loading post:', error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPost();
    setRefreshing(false);
  }, [loadPost]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const handlePostUpdate = useCallback(() => {
    // Refresh the post
    loadPost();
  }, [loadPost]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading post...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="document-outline" size={64} color="#ccc" />
          <Text style={styles.errorTitle}>Post Not Found</Text>
          <Text style={styles.errorSubtitle}>
            The post you're looking for doesn't exist or has been deleted.
          </Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Post Content */}
        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <PostCard 
            post={post} 
            onPostUpdate={handlePostUpdate}
            showUserProfile={true}
            isInProfile={false}
            key={post.id} // Prevent unnecessary re-renders
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
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
    width: 40,
  },
  content: {
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
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#f5f5f5',
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
    marginBottom: 24,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PostViewScreen; 