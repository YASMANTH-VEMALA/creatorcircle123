import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import PostTextComponent from './PostTextComponent';

interface Post {
  id: string;
  author: {
    name: string;
    avatar: string;
    username: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
}

interface PostCardExampleProps {
  post: Post;
  onLikePress?: (postId: string) => void;
  onCommentPress?: (postId: string) => void;
  onSharePress?: (postId: string) => void;
}

const PostCardExample: React.FC<PostCardExampleProps> = ({
  post,
  onLikePress,
  onCommentPress,
  onSharePress,
}) => {
  const handleHashtagPress = (hashtag: string) => {
    Alert.alert('Hashtag Tapped', `You tapped on ${hashtag}`);
    // Navigate to hashtag page or search results
  };

  const handleMentionPress = (mention: string) => {
    Alert.alert('Mention Tapped', `You tapped on ${mention}`);
    // Navigate to user profile
  };

  const handleLike = () => {
    if (onLikePress) {
      onLikePress(post.id);
    }
  };

  const handleComment = () => {
    if (onCommentPress) {
      onCommentPress(post.id);
    }
  };

  const handleShare = () => {
    if (onSharePress) {
      onSharePress(post.id);
    }
  };

  return (
    <View style={styles.postCard}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <Image
          source={{ uri: post.author.avatar }}
          style={styles.avatar}
          defaultSource={require('../../assets/icon.png')}
        />
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{post.author.name}</Text>
          <Text style={styles.username}>@{post.author.username}</Text>
          <Text style={styles.timestamp}>{post.timestamp}</Text>
        </View>
      </View>

      {/* Post Content */}
      <View style={styles.postContent}>
        <PostTextComponent
          content={post.content}
          maxLines={3}
          maxCharacters={120}
          onHashtagPress={handleHashtagPress}
          onMentionPress={handleMentionPress}
          style={styles.postText}
        />
      </View>

      {/* Post Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Text style={styles.actionIcon}>❤️</Text>
          <Text style={styles.actionText}>{post.likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionText}>{post.comments}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Text style={styles.actionIcon}>📤</Text>
          <Text style={styles.actionText}>{post.shares}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },
  postContent: {
    marginBottom: 16,
  },
  postText: {
    lineHeight: 22,
  },
  postActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  actionText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
});

export default PostCardExample; 