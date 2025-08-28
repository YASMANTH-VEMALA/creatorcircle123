import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { SpotlightService } from '../services/spotlightService';
import { UserService } from '../services/userService';
import { Profile } from '../types';
import { SpotlightPostWithUser } from '../types/spotlight';

interface Comment {
  id: string;
  postId: string;
  userId: string;
  commentText: string;
  parentId: string | null;
  createdAt: Date;
  user?: Profile;
}

interface SpotlightCommentsModalProps {
  visible: boolean;
  onClose: () => void;
  post: SpotlightPostWithUser | null;
}

const SpotlightCommentsModal: React.FC<SpotlightCommentsModalProps> = ({ visible, onClose, post }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    if (visible && post) {
      loadComments();
    }
  }, [visible, post]);

  const loadComments = async () => {
    if (!post) return;
    
    try {
      setLoading(true);
      const fetchedComments = await SpotlightService.getComments(post.id);
      
      // Fetch user profiles for each comment
      const commentsWithUsers = await Promise.all(
        fetchedComments.map(async (comment) => {
          try {
            const userProfile = await UserService.getUserProfile(comment.userId);
            return { ...comment, user: userProfile };
          } catch (error) {
            console.error('Error fetching user profile:', error);
            return comment;
          }
        })
      );
      
      setComments(commentsWithUsers);
    } catch (error) {
      console.error('Error loading comments:', error);
      Alert.alert('Error', 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!post || !user || !newComment.trim()) return;

    try {
      const commentData = {
        postId: post.id,
        userId: user.uid,
        commentText: newComment.trim(),
        parentId: replyingTo?.id || null,
      };

      await SpotlightService.addComment(commentData);
      setNewComment('');
      setReplyingTo(null);
      await loadComments(); // Reload comments
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const handleEditComment = async () => {
    if (!editingComment || !editText.trim()) return;

    try {
      await SpotlightService.updateComment(editingComment.id, editText.trim());
      setEditingComment(null);
      setEditText('');
      await loadComments(); // Reload comments
    } catch (error) {
      console.error('Error updating comment:', error);
      Alert.alert('Error', 'Failed to update comment');
    }
  };

  const handleDeleteComment = async (comment: Comment) => {
    if (!user || comment.userId !== user.uid) return;

    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await SpotlightService.deleteComment(comment.id);
              await loadComments(); // Reload comments
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment');
            }
          },
        },
      ]
    );
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  };

  const renderComment = ({ item }: { item: Comment }) => {
    const isOwner = user?.uid === item.userId;
    const isReply = item.parentId !== null;
    const isEditing = editingComment?.id === item.id;

    return (
      <View style={[styles.commentItem, isReply && styles.replyItem]}>
        <Image
          source={{ uri: item.user?.profilePhotoUrl || 'https://via.placeholder.com/32x32/007AFF/FFFFFF?text=U' }}
          style={styles.commentAvatar}
          defaultSource={require('../../assets/icon.png')}
        />
        
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <TouchableOpacity 
              style={styles.commentUserInfo}
              onPress={() => {
                // Navigate to user profile
                console.log('Navigate to profile:', item.userId);
              }}
            >
              <Text style={styles.commentUsername}>{item.user?.name || 'Anonymous'}</Text>
              <Text style={styles.commentTime}>{formatTimeAgo(item.createdAt)}</Text>
            </TouchableOpacity>
            
            {isOwner && (
              <View style={styles.commentActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    setEditingComment(item);
                    setEditText(item.commentText);
                  }}
                >
                  <Ionicons name="pencil" size={16} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteComment(item)}
                >
                  <Ionicons name="trash" size={16} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.editInput}
                value={editText}
                onChangeText={setEditText}
                multiline
                placeholder="Edit your comment..."
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.editActionButton}
                  onPress={() => {
                    setEditingComment(null);
                    setEditText('');
                  }}
                >
                  <Text style={styles.editActionText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editActionButton, styles.saveButton]}
                  onPress={handleEditComment}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={styles.commentText}>{item.commentText}</Text>
          )}

          {!isReply && (
            <TouchableOpacity
              style={styles.replyButton}
              onPress={() => setReplyingTo(item)}
            >
              <Text style={styles.replyButtonText}>Reply</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (!post) return null;

  return (
    <Modal
      visible={visible}
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
          <Text style={styles.headerTitle}>Comments</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Comments List */}
        <View style={styles.commentsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading comments...</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              renderItem={renderComment}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubble-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No comments yet</Text>
                  <Text style={styles.emptySubtext}>Be the first to comment!</Text>
                </View>
              }
            />
          )}
        </View>

        {/* Comment Input */}
        <View style={styles.inputContainer}>
          {replyingTo && (
            <View style={styles.replyingToContainer}>
              <Text style={styles.replyingToText}>
                Replying to {replyingTo.user?.name || 'Anonymous'}
              </Text>
              <TouchableOpacity
                style={styles.cancelReplyButton}
                onPress={() => setReplyingTo(null)}
              >
                <Ionicons name="close" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.inputRow}>
            <TextInput
              style={styles.commentInput}
              value={newComment}
              onChangeText={setNewComment}
              placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
              multiline
              maxLength={500}
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={[styles.postButton, !newComment.trim() && styles.postButtonDisabled]}
              onPress={handleAddComment}
              disabled={!newComment.trim()}
            >
              <Ionicons name="send" size={20} color={newComment.trim() ? "white" : "#ccc"} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSpacer: {
    width: 40,
  },
  commentsContainer: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  replyItem: {
    marginLeft: 32,
    marginBottom: 12,
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
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  commentUserInfo: {
    flex: 1,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
  },
  commentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  replyButton: {
    alignSelf: 'flex-start',
  },
  replyButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  editContainer: {
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  editActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  editActionText: {
    fontSize: 14,
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  saveButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  inputContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  replyingToContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  replyingToText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  cancelReplyButton: {
    padding: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  postButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
});

export default SpotlightCommentsModal; 