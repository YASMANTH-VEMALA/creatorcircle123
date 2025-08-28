import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import UserTagInput from './UserTagInput';
import PostTextComponent from './PostTextComponent';
import { Profile } from '../types';

const PostCreationWithTags: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [postText, setPostText] = useState('');
  const [taggedUsers, setTaggedUsers] = useState<Profile[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Combine post text with tagged users to create the final content
  const getFinalPostContent = () => {
    let content = postText;
    
    // Add tagged users to the content if they're not already mentioned
    taggedUsers.forEach(user => {
      const mention = `@${user.name.split(' ')[0]}`;
      if (!content.includes(mention)) {
        content += ` ${mention}`;
      }
    });
    
    return content.trim();
  };

  const handlePostSubmit = () => {
    const finalContent = getFinalPostContent();
    
    if (!finalContent.trim()) {
      Alert.alert('Empty Post', 'Please write something before posting.');
      return;
    }

    // Here you would typically save the post to your database
    Alert.alert(
      'Post Created!',
      `Post: "${finalContent}"\nTagged Users: ${taggedUsers.map(u => `@${u.name.split(' ')[0]}`).join(', ')}`,
      [
        {
          text: 'OK',
          onPress: () => {
            setPostText('');
            setTaggedUsers([]);
            setShowPreview(false);
          }
        }
      ]
    );
  };

  const handleTagsChange = (users: Profile[]) => {
    setTaggedUsers(users);
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  const handleHashtagPress = (hashtag: string) => {
    Alert.alert('Hashtag Tapped', `You tapped on ${hashtag}`);
    // Navigate to hashtag page or search results
    // navigation.navigate('HashtagSearch', { hashtag });
  };

  const handleMentionPress = (mention: string) => {
    const username = mention.substring(1); // Remove @ symbol
    Alert.alert('Mention Tapped', `You tapped on ${username}`);
    
    // Find the tagged user and navigate to their profile
    const taggedUser = taggedUsers.find(u => 
      u.name.split(' ')[0].toLowerCase() === username.toLowerCase()
    );
    
    if (taggedUser) {
      // Navigate to user profile
      navigation.navigate('UserProfile' as never, { userId: taggedUser.uid } as never);
    }
  };

  const finalContent = getFinalPostContent();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create New Post</Text>
          <TouchableOpacity onPress={togglePreview} style={styles.previewButton}>
            <Text style={styles.previewButtonText}>
              {showPreview ? 'Edit' : 'Preview'}
            </Text>
          </TouchableOpacity>
        </View>

        {showPreview ? (
          /* Preview Mode */
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Post Preview</Text>
            
            {/* Preview of how the post will look */}
            <View style={styles.previewPost}>
              <PostTextComponent
                content={finalContent}
                maxLines={10}
                maxCharacters={500}
                style={styles.previewText}
                onHashtagPress={handleHashtagPress}
                onMentionPress={handleMentionPress}
              />
            </View>

            {/* Tagged Users Preview */}
            {taggedUsers.length > 0 && (
              <View style={styles.taggedUsersPreview}>
                <Text style={styles.taggedUsersTitle}>Tagged Users:</Text>
                <View style={styles.taggedUsersList}>
                  {taggedUsers.map(user => (
                    <TouchableOpacity
                      key={user.uid}
                      style={styles.taggedUserItem}
                      onPress={() => {
                        navigation.navigate('UserProfile' as never, { userId: user.uid } as never);
                      }}
                    >
                      <Text style={styles.taggedUsername}>@{user.name.split(' ')[0]}</Text>
                      <Text style={styles.taggedUserName}> - {user.name}</Text>
                      <Ionicons name="chevron-forward" size={16} color="#6b7280" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={handlePostSubmit}
              style={styles.submitButton}
            >
              <Text style={styles.submitButtonText}>Post Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Edit Mode */
          <View style={styles.editContainer}>
            {/* User Tagging Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tag People</Text>
              <UserTagInput
                onTagsChange={handleTagsChange}
                placeholder="Search and tag people..."
                maxTags={5}
                currentUserId={user?.uid}
              />
            </View>

            {/* Post Text Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Write Your Post</Text>
              <TextInput
                style={styles.postInput}
                value={postText}
                onChangeText={setPostText}
                placeholder="What's on your mind? Use @ to mention people..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            {/* Character Count */}
            <Text style={styles.characterCount}>
              {postText.length}/500 characters
            </Text>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickActionButton}>
                <Ionicons name="camera" size={20} color="#3b82f6" />
                <Text style={styles.quickActionText}>Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.quickActionButton}>
                <Ionicons name="videocam" size={20} color="#3b82f6" />
                <Text style={styles.quickActionText}>Video</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.quickActionButton}>
                <Ionicons name="location" size={20} color="#3b82f6" />
                <Text style={styles.quickActionText}>Location</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  previewButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  previewButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  editContainer: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  postInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: 'white',
    minHeight: 120,
  },
  characterCount: {
    textAlign: 'right',
    color: '#6b7280',
    fontSize: 14,
    marginBottom: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  quickActionButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: 80,
  },
  quickActionText: {
    marginTop: 4,
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  previewContainer: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  previewPost: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  previewText: {
    fontSize: 16,
    lineHeight: 24,
  },
  taggedUsersPreview: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  taggedUsersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  taggedUsersList: {
    gap: 8,
  },
  taggedUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  taggedUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444', // Red color for mentions
  },
  taggedUserName: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default PostCreationWithTags; 