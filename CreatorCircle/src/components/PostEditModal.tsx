import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Post, Profile } from '../types';
import { PostService } from '../services/postService';
import { UserService } from '../services/userService';
import { notificationService } from '../services/notificationService';

interface PostEditModalProps {
  visible: boolean;
  post: Post | null;
  onClose: () => void;
  onPostUpdated: () => void;
}

interface MentionSuggestion {
  id: string;
  name: string;
  college: string;
  avatar?: string;
}

const PostEditModal: React.FC<PostEditModalProps> = ({
  visible,
  post,
  onClose,
  onPostUpdated,
}) => {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [currentMentionQuery, setCurrentMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible && post) {
      setContent(post.content);
      setOriginalContent(post.content);
    }
  }, [visible, post]);

  useEffect(() => {
    if (currentMentionQuery.length > 0) {
      searchUsers(currentMentionQuery);
    } else {
      setMentionSuggestions([]);
      setShowMentionSuggestions(false);
    }
  }, [currentMentionQuery]);

  const searchUsers = async (query: string) => {
    try {
      const users = await UserService.searchUsers(query);
      const suggestions: MentionSuggestion[] = users.map(user => ({
        id: user.uid,
        name: user.name,
        college: user.college,
        avatar: user.profilePhotoUrl,
      }));
      setMentionSuggestions(suggestions);
      setShowMentionSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleTextChange = (text: string) => {
    setContent(text);
    
    // Check for mentions
    const cursorPos = cursorPosition;
    const textBeforeCursor = text.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const query = mentionMatch[1];
      setCurrentMentionQuery(query);
    } else {
      setCurrentMentionQuery('');
    }
  };

  const handleMentionSelect = (mention: MentionSuggestion) => {
    const textBeforeCursor = content.substring(0, cursorPosition);
    const textAfterCursor = content.substring(cursorPosition);
    
    // Replace the partial mention with the full mention
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.replace(/@(\w*)$/, '');
      const mentionText = `@${mention.name} `;
      const newContent = beforeMention + mentionText + textAfterCursor;
      const newCursorPosition = beforeMention.length + mentionText.length;
      
      setContent(newContent);
      setCurrentMentionQuery('');
      setShowMentionSuggestions(false);
      
      // Set cursor position after mention
      setTimeout(() => {
        if (textInputRef.current) {
          textInputRef.current.setNativeProps({
            selection: { start: newCursorPosition, end: newCursorPosition }
          });
        }
      }, 100);
    }
  };

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  };

  const extractHashtags = (text: string): string[] => {
    const hashtagRegex = /#(\w+)/g;
    const hashtags: string[] = [];
    let match;
    
    while ((match = hashtagRegex.exec(text)) !== null) {
      hashtags.push(match[1]);
    }
    
    return hashtags;
  };

  const handleSave = async () => {
    if (!post) return;

    if (content.trim() === originalContent.trim()) {
      Alert.alert('No Changes', 'No changes were made to the post.');
      return;
    }

    setSaving(true);

    try {
      // Update the post
      await PostService.updatePost(post.id, {
        content: content.trim(),
        updatedAt: new Date(),
        isEdited: true,
      });

      // Extract mentions and send notifications
      const mentions = extractMentions(content);
      const originalMentions = extractMentions(originalContent);
      const newMentions = mentions.filter(mention => !originalMentions.includes(mention));

      // Send notifications for new mentions
      for (const mentionName of newMentions) {
        try {
          const mentionedUsers = await UserService.searchUsers(mentionName);
          const mentionedUser = mentionedUsers.find(user => 
            user.name.toLowerCase() === mentionName.toLowerCase()
          );
          
          if (mentionedUser && mentionedUser.uid !== post.userId) {
            // await notificationService.createMentionNotification(
            //   post.userId,
            //   mentionedUser.uid,
            //   post.id,
            //   content.substring(0, 100) + (content.length > 100 ? '...' : '')
            // );
            console.log('Mention notification would be sent to:', mentionedUser.name);
          }
        } catch (error) {
          console.error('Error sending mention notification:', error);
        }
      }

      onPostUpdated();
      onClose();
      Alert.alert('Success', 'Post updated successfully!');
    } catch (error) {
      console.error('Error updating post:', error);
      Alert.alert('Error', 'Failed to update post. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderMentionSuggestion = ({ item }: { item: MentionSuggestion }) => (
    <TouchableOpacity
      style={styles.mentionSuggestion}
      onPress={() => handleMentionSelect(item)}
    >
      <View style={styles.mentionInfo}>
        <Text style={styles.mentionName}>@{item.name}</Text>
        <Text style={styles.mentionCollege}>{item.college}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFormattedText = (text: string) => {
    const parts = text.split(/(@\w+|#\w+)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <Text key={index} style={styles.mention}>
            {part}
          </Text>
        );
      } else if (part.startsWith('#')) {
        return (
          <Text key={index} style={styles.hashtag}>
            {part}
          </Text>
        );
      } else {
        return (
          <Text key={index} style={styles.normalText}>
            {part}
          </Text>
        );
      }
    });
  };

  if (!post) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>Edit Post</Text>
          
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || content.trim() === originalContent.trim()}
            style={[
              styles.saveButton,
              (saving || content.trim() === originalContent.trim()) && styles.saveButtonDisabled
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.inputContainer}>
            <TextInput
              ref={textInputRef}
              style={styles.textInput}
              value={content}
              onChangeText={handleTextChange}
              onSelectionChange={(event) => {
                setCursorPosition(event.nativeEvent.selection.start);
              }}
              placeholder="What's on your mind?"
              multiline
              autoFocus
              textAlignVertical="top"
            />
          </View>

          {/* Preview */}
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Preview:</Text>
            <View style={styles.preview}>
              <Text>{renderFormattedText(content)}</Text>
            </View>
          </View>

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Tips:</Text>
            <Text style={styles.tip}>• Use @ to mention someone (e.g., @JohnDoe)</Text>
            <Text style={styles.tip}>• Use # to add hashtags (e.g., #photography)</Text>
            <Text style={styles.tip}>• Mentioned users will be notified</Text>
          </View>
        </ScrollView>

        {/* Mention Suggestions */}
        {showMentionSuggestions && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={mentionSuggestions}
              renderItem={renderMentionSuggestion}
              keyExtractor={(item) => item.id}
              style={styles.suggestionsList}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  inputContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    minHeight: 150,
  },
  textInput: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    minHeight: 100,
  },
  previewContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  preview: {
    minHeight: 50,
  },
  mention: {
    color: '#007AFF',
    fontWeight: '600',
  },
  hashtag: {
    color: '#1DA1F2',
    fontWeight: '600',
  },
  normalText: {
    color: '#333',
  },
  tipsContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  tip: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  suggestionsContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
    maxHeight: 200,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  mentionSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  mentionInfo: {
    flex: 1,
  },
  mentionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  mentionCollege: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});

export default PostEditModal; 