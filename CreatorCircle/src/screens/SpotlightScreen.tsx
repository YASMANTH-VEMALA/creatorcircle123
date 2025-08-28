import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { SpotlightService } from '../services/spotlightService';
import { SpotlightPostWithUser } from '../types/spotlight';
import SpotlightReelItem from '../components/SpotlightReelItem';
import SpotlightEmptyState from '../components/SpotlightEmptyState';
import SpotlightLoadingState from '../components/SpotlightLoadingState';
import SpotlightShareModal from '../components/SpotlightShareModal';
import SpotlightCommentsModal from '../components/SpotlightCommentsModal';
import { Ionicons } from '@expo/vector-icons';

const { height: screenHeight } = Dimensions.get('window');

const SpotlightScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { initialPostId } = (route.params as { initialPostId?: string }) || {};
  const [posts, setPosts] = useState<SpotlightPostWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<SpotlightPostWithUser | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<SpotlightPostWithUser | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const currentVisibleIndex = useRef(0);

  // Load initial posts
  useEffect(() => {
    loadPosts();
  }, []);

  // Scroll to specific post if initialPostId is provided
  useEffect(() => {
    if (initialPostId && posts.length > 0 && flatListRef.current) {
      const targetIndex = posts.findIndex(post => post.id === initialPostId);
      if (targetIndex !== -1) {
        setTimeout(() => {
          try {
            flatListRef.current?.scrollToIndex({
              index: targetIndex,
              animated: true,
            });
          } catch (error) {
            console.log('Failed to scroll to specific post, using offset instead');
            // Fallback to scrollToOffset if scrollToIndex fails
            flatListRef.current?.scrollToOffset({
              offset: targetIndex * screenHeight,
              animated: true,
            });
          }
        }, 500); // Small delay to ensure FlatList is ready
      }
    }
  }, [initialPostId, posts]);

  // Set up real-time listener when screen is focused
  useFocusEffect(
    useCallback(() => {
      let unsubscribe: (() => void) | undefined;

      const setupListener = async () => {
        try {
          unsubscribe = SpotlightService.listenToSpotlightPosts(
            (updatedPosts) => {
              setPosts(updatedPosts);
              setLoading(false);
            },
            20
          );
        } catch (error) {
          console.error('Error setting up spotlight listener:', error);
          setLoading(false);
        }
      };

      setupListener();

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }, [])
  );

  const loadPosts = async () => {
    try {
      setLoading(true);
      const fetchedPosts = await SpotlightService.getSpotlightPosts(20);
      setPosts(fetchedPosts);
      setHasMorePosts(fetchedPosts.length === 20);
    } catch (error) {
      console.error('Error loading spotlight posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (loadingMore || !hasMorePosts || posts.length === 0) return;

    try {
      setLoadingMore(true);
      const lastPost = posts[posts.length - 1];
      const morePosts = await SpotlightService.getSpotlightPosts(10, lastPost.id);
      
      if (morePosts.length > 0) {
        setPosts(prev => [...prev, ...morePosts]);
        setHasMorePosts(morePosts.length === 10);
      } else {
        setHasMorePosts(false);
      }
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const handleViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      const previousIndex = currentVisibleIndex.current;
      currentVisibleIndex.current = index;
      
      // Increment view count for the currently visible post
      if (posts[index]) {
        SpotlightService.incrementViewCount(posts[index].id);
      }
      
      // Force re-render to update video visibility
      setPosts(prev => [...prev]);
    }
  }, [posts]);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 1000,
  };

  const renderReelItem = ({ item, index }: { item: SpotlightPostWithUser; index: number }) => (
    <SpotlightReelItem
      post={item}
      index={index}
      isVisible={index === currentVisibleIndex.current}
      onLikeToggle={handleLikeToggle}
      onCommentPress={handleCommentPress}
      onSharePress={handleSharePress}
      onProfilePress={handleProfilePress}
      onMorePress={handleMorePress}
    />
  );

  const handleLikeToggle = async (postId: string, isLiked: boolean) => {
    if (!user?.uid) return;

    try {
      if (isLiked) {
        await SpotlightService.unlikeSpotlightPost(postId, user.uid);
      } else {
        await SpotlightService.likeSpotlightPost(postId, user.uid);
      }

      // Update local state
      setPosts(prev => 
        prev.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                isLiked: !isLiked,
                likesCount: isLiked ? post.likesCount - 1 : post.likesCount + 1 
              }
            : post
        )
      );
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleCommentPress = (postId: string) => {
    // Find the post and show comments modal
    const post = posts.find(p => p.id === postId);
    if (post) {
      setSelectedPostForComments(post);
      setShowCommentsModal(true);
    }
  };

  const handleSharePress = (postId: string) => {
    // Find the post and show share modal
    const post = posts.find(p => p.id === postId);
    if (post) {
      setSelectedPost(post);
      setShowShareModal(true);
    }
  };

  const handleProfilePress = (userId: string) => {
    // Navigate to user profile
    console.log('Navigate to profile:', userId);
  };

  const handleMorePress = (postId: string) => {
    // Open more options modal (report, block, etc.)
    console.log('More options for post:', postId);
  };

  const handleCreateSpotlight = () => {
    navigation.navigate('CreateSpotlight' as never);
  };

  const getItemLayout = (_: any, index: number) => ({
    length: screenHeight,
    offset: screenHeight * index,
    index,
  });

  if (loading) {
    return <SpotlightLoadingState />;
  }

  if (posts.length === 0) {
    return <SpotlightEmptyState onRefresh={onRefresh} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="flash" size={28} color="#FFD700" />
          <Text style={styles.headerTitle}>Spotlight</Text>
        </View>
      </View>
      
      <FlatList
        ref={flatListRef}
        data={posts}
        renderItem={renderReelItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={screenHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        style={styles.flatList}
        contentContainerStyle={styles.flatListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
            colors={['#ffffff']}
          />
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="large" color="#ffffff" />
            </View>
          ) : null
        }
              />
        
        {/* Share Modal */}
        <SpotlightShareModal
          visible={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setSelectedPost(null);
          }}
          post={selectedPost}
        />

        {/* Comments Modal */}
        <SpotlightCommentsModal
          visible={showCommentsModal}
          onClose={() => {
            setShowCommentsModal(false);
            setSelectedPostForComments(null);
          }}
          post={selectedPostForComments}
        />
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  flatList: {
    flex: 1,
  },
  flatListContent: {
    flexGrow: 1,
  },
  loadingMoreContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
  },



});

export default SpotlightScreen; 