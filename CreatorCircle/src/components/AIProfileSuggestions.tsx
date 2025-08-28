import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AIService } from '../services/aiService';
import { Profile } from '../types';

interface AIProfileSuggestionsProps {
  targetProfile: Profile;
  currentUserId: string;
  onMessageSelect: (message: string) => void;
}

export const AIProfileSuggestions: React.FC<AIProfileSuggestionsProps> = ({
  targetProfile,
  currentUserId,
  onMessageSelect,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiService, setAiService] = useState<AIService | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const initializeAI = async () => {
      try {
        const service = AIService.getInstance();
        await service.initialize(currentUserId);
        setAiService(service);
      } catch (error) {
        console.error('Failed to initialize AI service:', error);
      }
    };

    initializeAI();
  }, [currentUserId]);

  const generateProfileSuggestions = async () => {
    if (!aiService || !aiService.isAIAvailable()) {
      Alert.alert(
        'AI Suggestions Unavailable',
        'Please add your AI API key in Settings to enable profile suggestions.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => {} }
        ]
      );
      return;
    }

    setLoading(true);
    try {
      // Generate suggestions based on the target profile
      const profileSuggestions = await aiService.getProfileIntroductionSuggestions(targetProfile);
      setSuggestions(profileSuggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Failed to generate profile suggestions:', error);
      Alert.alert(
        'AI Error',
        'Failed to generate suggestions. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshSuggestions = async () => {
    if (!aiService || !aiService.isAIAvailable()) return;
    
    setLoading(true);
    try {
      const newSuggestions = await aiService.getProfileIntroductionSuggestions(targetProfile);
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Failed to refresh suggestions:', error);
      Alert.alert('Error', 'Failed to refresh suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const requestDifferentType = async (type: string) => {
    if (!aiService || !aiService.isAIAvailable()) return;
    
    setLoading(true);
    try {
      const newSuggestions = await aiService.getProfileIntroductionSuggestions(
        targetProfile,
        type
      );
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Failed to generate different type suggestions:', error);
      Alert.alert('Error', 'Failed to generate suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    onMessageSelect(suggestion);
    setShowSuggestions(false);
  };

  if (!aiService) {
    return null;
  }

  if (!aiService.isAIAvailable()) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.aiButtonDisabled}
          onPress={() => {
            Alert.alert(
              'AI Suggestions Unavailable',
              'Please add your AI API key in Settings to enable profile suggestions.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Go to Settings', onPress: () => {} }
              ]
            );
          }}
        >
          <Ionicons name="sparkles-outline" size={18} color="#999" />
          <Text style={styles.aiButtonTextDisabled}>AI Suggestions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!showSuggestions ? (
        <TouchableOpacity
          style={styles.aiButton}
          onPress={generateProfileSuggestions}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="sparkles" size={18} color="white" />
          )}
          <Text style={styles.aiButtonText}>
            {loading ? 'Generating...' : 'Introduce Yourself'}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.suggestionsContainer}>
          {/* Header */}
          <View style={styles.suggestionsHeader}>
            <View style={styles.headerLeft}>
              <Ionicons name="sparkles" size={20} color="#007AFF" />
              <Text style={styles.suggestionsTitle}>AI Introduction Suggestions</Text>
            </View>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowSuggestions(false)}
            >
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          
          {/* Suggestions List */}
          <ScrollView 
            style={styles.suggestionsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsContent}
          >
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionItem}
                onPress={() => handleSuggestionSelect(suggestion)}
                activeOpacity={0.7}
              >
                <View style={styles.suggestionContent}>
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                  <View style={styles.suggestionMeta}>
                    <Text style={styles.suggestionNumber}>#{index + 1}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#007AFF" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={refreshSuggestions}
              disabled={loading}
            >
              <Ionicons name="refresh" size={16} color="#007AFF" />
              <Text style={styles.actionButtonText}>Refresh</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => requestDifferentType('professional')}
              disabled={loading}
            >
              <Ionicons name="briefcase" size={16} color="#007AFF" />
              <Text style={styles.actionButtonText}>Professional</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => requestDifferentType('casual')}
              disabled={loading}
            >
              <Ionicons name="happy" size={16} color="#007AFF" />
              <Text style={styles.actionButtonText}>Casual</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => requestDifferentType('collaborative')}
              disabled={loading}
            >
              <Ionicons name="people" size={16} color="#007AFF" />
              <Text style={styles.actionButtonText}>Collaborative</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    marginHorizontal: 2,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  aiButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  aiButtonDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  aiButtonTextDisabled: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#999',
  },
  suggestionsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginLeft: 10,
  },
  closeButton: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: '#f1f3f4',
  },
  suggestionsList: {
    maxHeight: 280,
  },
  suggestionsContent: {
    padding: 16,
  },
  suggestionItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
  },
  suggestionContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: '#2c3e50',
    lineHeight: 22,
    fontWeight: '500',
    marginRight: 12,
  },
  suggestionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionNumber: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
}); 