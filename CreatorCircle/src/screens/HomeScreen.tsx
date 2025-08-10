import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { Post } from '../types';
import { PostService } from '../services/postService';
import PostCard from '../components/PostCard';
import NotificationIndicator from '../components/NotificationIndicator';
import { useNavigation } from '@react-navigation/native';
import { ProfileValidationService } from '../services/profileValidationService';
import CreatorCircleLoading from '../components/CreatorCircleLoading';
import { FirebaseUtils } from '../utils/firebaseUtils';
import { RealtimeMigrationService } from '../services/realtimeMigrationService';
import { useScroll } from '../contexts/ScrollContext';

const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { notifyScroll } = useScroll();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPosts();
    testFirebaseConnection();
    startRealtimeMonitoring();
  }, []);

  const loadPosts = useCallback(() => {
    console.log('📱 Loading posts...');
    
    const unsubscribe = PostService.subscribeToPosts((loadedPosts) => {
      console.log(`Posts loaded in HomeScreen: ${loadedPosts.length}`);
      setPosts(loadedPosts);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const startRealtimeMonitoring = () => {
    try {
      console.log('🔍 Starting real-time monitoring for local files...');
      RealtimeMigrationService.startMonitoring();
    } catch (error) {
      console.error('Error starting real-time monitoring:', error);
    }
  };

  const testFirebaseConnection = async () => {
    try {
      const isConnected = await FirebaseUtils.testFirebaseConnection();
      if (isConnected) {
        const projectValidation = await FirebaseUtils.validateFirebaseProject();
        console.log('Firebase project validation:', projectValidation);
      }
    } catch (error) {
      console.error('Firebase connection test failed:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Create post functionality removed - users can create posts from other screens

  const handlePostCreated = () => {
    console.log('Post created successfully');
  };

  const handlePostUpdate = () => {
    console.log('Post updated successfully');
  };

  const handleSearch = () => {
    navigation.navigate('FindPeople' as never);
  };

  const handleMessage = () => {
    navigation.navigate('ChatList' as never);
  };

  const handleNotifications = () => {
    console.log('🔔 Notification button pressed, navigating to Notifications screen');
    try {
      navigation.navigate('Notifications' as never);
      console.log('✅ Navigation to Notifications successful');
    } catch (error) {
      console.error('❌ Error navigating to Notifications:', error);
    }
  };

  const renderPost = ({ item }: { item: Post }) => {
    console.log('Rendering post:', item.id, item.content?.substring(0, 30) + '...');
    return (
      <PostCard 
        post={item} 
        onPostUpdate={handlePostUpdate}
        showUserProfile={true}
        isInProfile={false}
      />
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No posts yet</Text>
      <Text style={styles.emptySubtitle}>Be the first to share something!</Text>
      <TouchableOpacity style={styles.createPostButton} onPress={handleCreatePost}>
        <Ionicons name="add" size={20} color="white" />
        <Text style={styles.createPostButtonText}>Create Post</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <CreatorCircleLoading />
      <Text style={styles.loadingText}>Loading posts...</Text>
    </View>
  );

  if (loading) {
    return renderLoadingState();
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>
            <Text style={styles.creatorText}>Creator</Text>
            <Text style={styles.circleText}>Circle</Text>
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton} onPress={handleSearch}>
            <Ionicons name="search" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleMessage}>
            <Ionicons name="chatbubbles-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleNotifications}>
            <View style={styles.notificationContainer}>
              <Ionicons name="notifications-outline" size={24} color="#007AFF" />
              <NotificationIndicator size="small" showCount={false} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Posts List */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.postsList}
        onScroll={(event) => {
          const scrollY = event.nativeEvent.contentOffset.y;
          notifyScroll(scrollY);
        }}
        scrollEventThrottle={16}
      />

      {/* Create Post Button - Removed for cleaner UI */}

      {/* Create Post Modal - Removed from HomeScreen */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  creatorText: {
    color: '#333',
  },
  circleText: {
    color: '#FFD700', // Yellow color
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 16,
  },
  notificationContainer: {
    position: 'relative',
  },
  postsList: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  createPostButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default HomeScreen; 