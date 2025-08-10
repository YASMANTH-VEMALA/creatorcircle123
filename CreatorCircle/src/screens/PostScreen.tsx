import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PostCreationModal from '../components/PostCreationModal';

const PostScreen: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(true);

  const handlePostCreated = () => {
    // Posts will automatically update via real-time subscription
    console.log('Post created successfully');
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    // Navigate back or show a different view
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Post</Text>
        <Text style={styles.subtitle}>Share your creativity with the community</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity 
          style={styles.createButton} 
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add-circle" size={48} color="#007AFF" />
          <Text style={styles.createButtonText}>Create New Post</Text>
          <Text style={styles.createButtonSubtext}>
            Share text, emojis, photos, or videos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Post Creation Modal */}
      <PostCreationModal
        visible={showCreateModal}
        onClose={handleCloseModal}
        onPostCreated={handlePostCreated}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  createButton: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  createButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  createButtonSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default PostScreen; 