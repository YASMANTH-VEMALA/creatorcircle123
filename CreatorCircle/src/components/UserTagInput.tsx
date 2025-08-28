import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserService } from '../services/userService';
import { Profile } from '../types';

interface UserTagInputProps {
  onTagsChange: (tags: Profile[]) => void;
  placeholder?: string;
  style?: any;
  maxTags?: number;
  currentUserId?: string; // Exclude current user from suggestions
}

const UserTagInput: React.FC<UserTagInputProps> = ({
  onTagsChange,
  placeholder = "Tag people...",
  style,
  maxTags = 10,
  currentUserId,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedTags, setSelectedTags] = useState<Profile[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Load all users from your app
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const users = await UserService.getAllUsers();
      // Filter out current user and users without names
      const filteredUsers = users.filter(user => 
        user.uid !== currentUserId && 
        user.name && 
        user.name.trim().length > 0
      );
      setAllUsers(filteredUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users for tagging');
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on input text
  useEffect(() => {
    if (inputText.trim() === '') {
      setFilteredUsers([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = allUsers.filter(user => 
      user.name.toLowerCase().includes(inputText.toLowerCase()) ||
      (user.college && user.college.toLowerCase().includes(inputText.toLowerCase()))
    );

    // Remove already selected users
    const availableUsers = filtered.filter(user => 
      !selectedTags.some(tag => tag.uid === user.uid)
    );

    setFilteredUsers(availableUsers);
    setShowSuggestions(availableUsers.length > 0);
  }, [inputText, selectedTags, allUsers]);

  const handleUserSelect = (user: Profile) => {
    if (selectedTags.length >= maxTags) {
      Alert.alert('Maximum Tags Reached', `You can only tag up to ${maxTags} people.`);
      return;
    }

    setSelectedTags(prev => [...prev, user]);
    setInputText('');
    setShowSuggestions(false);
    onTagsChange([...selectedTags, user]);
    inputRef.current?.focus();
  };

  const removeTag = (userId: string) => {
    const updatedTags = selectedTags.filter(tag => tag.uid !== userId);
    setSelectedTags(updatedTags);
    onTagsChange(updatedTags);
  };

  const renderUserSuggestion = ({ item }: { item: Profile }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleUserSelect(item)}
    >
      <Image
        source={{ uri: item.profilePhotoUrl }}
        style={styles.suggestionAvatar}
        defaultSource={require('../../assets/icon.png')}
      />
      <View style={styles.suggestionInfo}>
        <Text style={styles.suggestionName}>{item.name}</Text>
        {item.college && (
          <Text style={styles.suggestionCollege}>{item.college}</Text>
        )}
        {item.verifiedBadge && item.verifiedBadge !== 'none' && (
          <View style={styles.verifiedBadge}>
            <Ionicons 
              name="checkmark-circle" 
              size={16} 
              color={item.verifiedBadge === 'gold' ? '#FFD700' : '#C0C0C0'} 
            />
            <Text style={styles.verifiedText}>
              {item.verifiedBadge === 'gold' ? 'Gold' : 'Silver'}
            </Text>
          </View>
        )}
      </View>
      <Ionicons name="add-circle-outline" size={24} color="#3b82f6" />
    </TouchableOpacity>
  );

  const renderTag = (user: Profile) => (
    <View key={user.uid} style={styles.tagContainer}>
      <Image
        source={{ uri: user.profilePhotoUrl }}
        style={styles.tagAvatar}
        defaultSource={require('../../assets/icon.png')}
      />
      <Text style={styles.tagText}>@{user.name.split(' ')[0]}</Text>
      <TouchableOpacity
        onPress={() => removeTag(user.uid)}
        style={styles.removeTagButton}
      >
        <Ionicons name="close-circle" size={16} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <View style={styles.tagsContainer}>
          {selectedTags.map(renderTag)}
        </View>
      )}

      {/* Input Field */}
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          onFocus={() => {
            if (inputText.trim() !== '' && filteredUsers.length > 0) {
              setShowSuggestions(true);
            }
          }}
        />
        {inputText.length > 0 && (
          <TouchableOpacity
            onPress={() => setInputText('')}
            style={styles.clearButton}
          >
            <Ionicons name="close" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      )}

      {/* User Suggestions */}
      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          {filteredUsers.length === 0 ? (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>No users found</Text>
              <Text style={styles.noResultsSubtext}>Try a different search term</Text>
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              renderItem={renderUserSuggestion}
              keyExtractor={(item) => item.uid}
              style={styles.suggestionsList}
              keyboardShouldPersistTaps="handled"
              maxHeight={200}
            />
          )}
        </View>
      )}

      {/* Tag Limit Info */}
      <Text style={styles.tagLimitText}>
        {selectedTags.length}/{maxTags} people tagged
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tagAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  tagText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginRight: 4,
  },
  removeTagButton: {
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginTop: 4,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#64748b',
  },
  suggestionsContainer: {
    maxHeight: 200,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  suggestionsList: {
    flex: 1,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  suggestionCollege: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  tagLimitText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 8,
  },
});

export default UserTagInput; 