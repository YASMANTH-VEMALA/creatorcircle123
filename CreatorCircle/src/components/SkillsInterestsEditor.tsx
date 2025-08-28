import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { UserService } from '../services/userService';

interface SkillsInterestsEditorProps {
  visible: boolean;
  onClose: () => void;
  onSave: (skills: string[], interests: string[]) => void;
  initialSkills?: string[];
  initialInterests?: string[];
}

const SkillsInterestsEditor: React.FC<SkillsInterestsEditorProps> = ({
  visible,
  onClose,
  onSave,
  initialSkills = [],
  initialInterests = [],
}) => {
  const { user } = useAuth();
  const [skills, setSkills] = useState<string[]>(initialSkills);
  const [interests, setInterests] = useState<string[]>(initialInterests);
  const [customSkill, setCustomSkill] = useState('');
  const [customInterest, setCustomInterest] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'skills' | 'interests'>('skills');

  // Predefined suggestions
  const predefinedSkills = [
    'Coding', 'Design', 'UI/UX', 'Data Science', 'Marketing', 'Public Speaking',
    'Leadership', 'Project Management', 'Content Creation', 'Photography',
    'Video Editing', 'Graphic Design', 'Web Development', 'Mobile Development',
    'Data Analysis', 'Machine Learning', 'Digital Marketing', 'SEO',
    'Social Media Management', 'Copywriting', 'Research', 'Teaching',
    'Customer Service', 'Sales', 'Finance', 'Accounting', 'Legal',
    'Healthcare', 'Engineering', 'Architecture', 'Interior Design'
  ];

  const predefinedInterests = [
    'Gaming', 'Music', 'Fitness', 'Cooking', 'Travel', 'Sports',
    'Entrepreneurship', 'Blogging', 'Film Making', 'Psychology',
    'Volunteering', 'Reading', 'Writing', 'Art', 'Dance',
    'Photography', 'Hiking', 'Cycling', 'Swimming', 'Yoga',
    'Meditation', 'Gardening', 'Painting', 'Drawing', 'Sculpture',
    'Fashion', 'Beauty', 'Technology', 'Science', 'History',
    'Philosophy', 'Politics', 'Environment', 'Animals', 'Food'
  ];

  useEffect(() => {
    if (visible) {
      setSkills(initialSkills);
      setInterests(initialInterests);
      setCustomSkill('');
      setCustomInterest('');
    }
  }, [visible, initialSkills, initialInterests]);

  const handleAddSkill = (skill: string) => {
    const trimmedSkill = skill.trim();
    if (!trimmedSkill) return;
    
    if (skills.includes(trimmedSkill)) {
      Alert.alert('Duplicate Skill', 'This skill is already in your list.');
      return;
    }
    
    setSkills([...skills, trimmedSkill]);
    setCustomSkill('');
  };

  const handleAddInterest = (interest: string) => {
    const trimmedInterest = interest.trim();
    if (!trimmedInterest) return;
    
    if (interests.includes(trimmedInterest)) {
      Alert.alert('Duplicate Interest', 'This interest is already in your list.');
      return;
    }
    
    setInterests([...interests, trimmedInterest]);
    setCustomInterest('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleRemoveInterest = (interestToRemove: string) => {
    setInterests(interests.filter(interest => interest !== interestToRemove));
  };

  const handleSave = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      
      // Update user profile in Firebase
      await UserService.updateUserProfile(user.uid, {
        skills,
        interests,
      });

      // Call the onSave callback
      onSave(skills, interests);
      
      // Close the modal
      onClose();
      
      Alert.alert('Success', 'Skills & Interests updated successfully!');
    } catch (error: any) {
      console.error('Error updating skills & interests:', error);
      Alert.alert('Error', error?.message || 'Failed to update Skills & Interests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderChips = (items: string[], onRemove: (item: string) => void, emptyMessage: string) => (
    <View style={styles.chipsContainer}>
      {items.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {items.map((item, index) => (
            <View key={index} style={styles.chip}>
              <Text style={styles.chipText}>{item}</Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => onRemove(item)}
              >
                <Ionicons name="close-circle" size={16} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.emptyMessage}>{emptyMessage}</Text>
      )}
    </View>
  );

  const renderSuggestions = (suggestions: string[], onAdd: (item: string) => void, customValue: string, setCustomValue: (value: string) => void, placeholder: string) => (
    <View style={styles.suggestionsContainer}>
      <Text style={styles.sectionTitle}>Add {activeTab === 'skills' ? 'Skills' : 'Interests'}</Text>
      
      {/* Custom Input */}
      <View style={styles.customInputContainer}>
        <TextInput
          style={styles.customInput}
          value={customValue}
          onChangeText={setCustomValue}
          placeholder={placeholder}
          onSubmitEditing={() => onAdd(customValue)}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addButton, !customValue.trim() && styles.addButtonDisabled]}
          onPress={() => onAdd(customValue)}
          disabled={!customValue.trim()}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Predefined Suggestions */}
      <Text style={styles.suggestionsTitle}>Popular Suggestions</Text>
      <ScrollView style={styles.suggestionsList} showsVerticalScrollIndicator={false}>
        <View style={styles.suggestionsGrid}>
          {suggestions.map((suggestion, index) => {
            const isSelected = activeTab === 'skills' 
              ? skills.includes(suggestion)
              : interests.includes(suggestion);
            
            return (
              <TouchableOpacity
                key={index}
                style={[styles.suggestionItem, isSelected && styles.suggestionItemSelected]}
                onPress={() => {
                  if (isSelected) {
                    if (activeTab === 'skills') {
                      handleRemoveSkill(suggestion);
                    } else {
                      handleRemoveInterest(suggestion);
                    }
                  } else {
                    if (activeTab === 'skills') {
                      handleAddSkill(suggestion);
                    } else {
                      handleAddInterest(suggestion);
                    }
                  }
                }}
              >
                <Text style={[styles.suggestionText, isSelected && styles.suggestionTextSelected]}>
                  {suggestion}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  if (!visible) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Skills & Interests</Text>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'skills' && styles.activeTab]}
          onPress={() => setActiveTab('skills')}
        >
          <Text style={[styles.tabText, activeTab === 'skills' && styles.activeTabText]}>
            Skills ({skills.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'interests' && styles.activeTab]}
          onPress={() => setActiveTab('interests')}
        >
          <Text style={[styles.tabText, activeTab === 'interests' && styles.activeTabText]}>
            Interests ({interests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Selected Items Display */}
        <View style={styles.selectedSection}>
          <Text style={styles.sectionTitle}>
            Your {activeTab === 'skills' ? 'Skills' : 'Interests'}
          </Text>
          {activeTab === 'skills' 
            ? renderChips(skills, handleRemoveSkill, 'No skills added yet. Add some from the suggestions below!')
            : renderChips(interests, handleRemoveInterest, 'No interests added yet. Add some from the suggestions below!')
          }
        </View>

        {/* Suggestions */}
        {activeTab === 'skills' 
          ? renderSuggestions(
              predefinedSkills,
              handleAddSkill,
              customSkill,
              setCustomSkill,
              'Add custom skill...'
            )
          : renderSuggestions(
              predefinedInterests,
              handleAddInterest,
              customInterest,
              setCustomInterest,
              'Add custom interest...'
            )
        }
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  selectedSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 16,
  },
  chipsContainer: {
    minHeight: 50,
  },
  chipsScroll: {
    paddingRight: 20,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginRight: 6,
  },
  removeButton: {
    padding: 2,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  suggestionsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  customInputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
    marginRight: 12,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  suggestionsList: {
    maxHeight: 300,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionItem: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionItemSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  suggestionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  suggestionTextSelected: {
    color: 'white',
  },
});

export default SkillsInterestsEditor; 