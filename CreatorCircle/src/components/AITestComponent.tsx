import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AIService } from '../services/aiService';
import { useAuth } from '../contexts/AuthContext';

const AITestComponent: React.FC = () => {
  const { user } = useAuth();
  const [aiService, setAiService] = useState<AIService | null>(null);
  const [status, setStatus] = useState<string>('Initializing...');

  useEffect(() => {
    if (user?.uid) {
      testAIService();
    }
  }, [user?.uid]);

  const testAIService = async () => {
    try {
      setStatus('Testing AI Service...');
      const service = AIService.getInstance();
      await service.initialize(user!.uid);
      setAiService(service);
      
      const hasApiKey = service.getUserApiKey();
      const isAvailable = service.isAIAvailable();
      
      setStatus(`API Key: ${hasApiKey ? 'Set' : 'Not Set'}, Available: ${isAvailable}`);
    } catch (error) {
      setStatus(`Error: ${error}`);
    }
  };

  const testChatSuggestions = async () => {
    if (!aiService || !user?.uid) return;
    
    try {
      setStatus('Testing chat suggestions...');
      const suggestions = await aiService.getChatSuggestions('test-user-id');
      setStatus(`Got ${suggestions.length} suggestions: ${suggestions.join(', ')}`);
    } catch (error) {
      setStatus(`Error: ${error}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Service Test</Text>
      <Text style={styles.status}>{status}</Text>
      
      {aiService && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={testChatSuggestions}>
            <Text style={styles.buttonText}>Test Chat Suggestions</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={testAIService}>
            <Text style={styles.buttonText}>Refresh Status</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>User ID: {user?.uid || 'None'}</Text>
        <Text style={styles.infoText}>API Key: {aiService?.getUserApiKey() ? 'Set' : 'Not Set'}</Text>
        <Text style={styles.infoText}>AI Available: {aiService?.isAIAvailable() ? 'Yes' : 'No'}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f0f0f0',
    margin: 16,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  status: {
    fontSize: 14,
    marginBottom: 16,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    flex: 1,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 6,
  },
  infoText: {
    fontSize: 12,
    marginBottom: 4,
    color: '#333',
  },
});

export default AITestComponent; 