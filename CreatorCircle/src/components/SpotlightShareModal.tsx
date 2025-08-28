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

interface SpotlightShareModalProps {
  visible: boolean;
  onClose: () => void;
  post: SpotlightPostWithUser | null;
}

const SpotlightShareModal: React.FC<SpotlightShareModalProps> = ({ visible, onClose, post }) => {
  const { user } = useAuth();
  const [chatUsers, setChatUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [message, setMessage] = useState('');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (visible && user?.uid) {
      loadChatUsers();
    }
  }, [visible, user]);

  const loadChatUsers = async () => {
    try {
      setLoading(true);
      // Get all users for now (you can implement chat-specific user loading)
      const users = await UserService.getAllUsers();
      // Filter out current user
      const filteredUsers = users.filter(u => u.uid !== user?.uid);
      setChatUsers(filteredUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (user: Profile) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.uid === user.uid);
      if (isSelected) {
        return prev.filter(u => u.uid !== user.uid);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleShare = async () => {
    if (!post || selectedUsers.length === 0) return;

    try {
      setSharing(true);
      
      // Share to each selected user
      for (const selectedUser of selectedUsers) {
        await SpotlightService.shareSpotlightPost(post.id, user!.uid, selectedUser.uid, message.trim() || undefined);
      }

      Alert.alert(
        'Success',
        `Shared with ${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''}`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      console.error('Error sharing spotlight:', error);
      Alert.alert('Error', 'Failed to share spotlight');
    } finally {
      setSharing(false);
    }
  };

  const filteredUsers = chatUsers.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderUserItem = ({ item }: { item: Profile }) => {
    const isSelected = selectedUsers.some(u => u.uid === item.uid);
    
    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.userItemSelected]}
        onPress={() => toggleUserSelection(item)}
      >
        <Image
          source={{ uri: item.profilePhotoUrl || 'https://via.placeholder.com/40x40/007AFF/FFFFFF?text=U' }}
          style={styles.userAvatar}
          defaultSource={require('../../assets/icon.png')}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userUsername}>@{item.username || item.name.split(' ')[0]}</Text>
        </View>
        <View style={styles.selectionIndicator}>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
          )}
        </View>
      </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Share to Chat</Text>
          <TouchableOpacity
            style={[styles.shareButton, selectedUsers.length === 0 && styles.shareButtonDisabled]}
            onPress={handleShare}
            disabled={selectedUsers.length === 0 || sharing}
          >
            {sharing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.shareButtonText}>Share</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Post Preview */}
        <View style={styles.postPreview}>
          <View style={styles.postPreviewHeader}>
            <Image
              source={{ uri: post.creator.profilePhotoUrl || 'https://via.placeholder.com/40x40/007AFF/FFFFFF?text=U' }}
              style={styles.postCreatorAvatar}
              defaultSource={require('../../assets/icon.png')}
            />
            <View style={styles.postCreatorInfo}>
              <Text style={styles.postCreatorName}>{post.creator.name}</Text>
              <Text style={styles.postCaption} numberOfLines={2}>
                {post.caption}
              </Text>
            </View>
            <View style={styles.postTypeIndicator}>
              <Ionicons name="flash" size={20} color="#FF6B35" />
            </View>
          </View>
        </View>

        {/* Message Input */}
        <View style={styles.messageContainer}>
          <Text style={styles.messageLabel}>Add a message (optional):</Text>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Say something about this reel..."
            multiline
            maxLength={200}
            placeholderTextColor="#999"
          />
          <Text style={styles.messageCount}>{message.length}/200</Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search users..."
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Users List */}
        <View style={styles.usersContainer}>
          <Text style={styles.sectionTitle}>
            Select Users ({selectedUsers.length} selected)
          </Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading users...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.uid}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No users found</Text>
                </View>
              }
            />
          )}
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
  shareButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  shareButtonDisabled: {
    backgroundColor: '#ccc',
  },
  shareButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  postPreview: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  postPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postCreatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postCreatorInfo: {
    flex: 1,
  },
  postCreatorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  postCaption: {
    fontSize: 14,
    color: '#666',
  },
  postTypeIndicator: {
    marginLeft: 12,
  },
  messageContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  messageCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  usersContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
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
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  userItemSelected: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#007AFF',
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
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: '#666',
  },
  selectionIndicator: {
    width: 24,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
});

export default SpotlightShareModal; 