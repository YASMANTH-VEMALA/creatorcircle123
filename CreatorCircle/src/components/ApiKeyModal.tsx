import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AIService } from '../services/aiService';

interface ApiKeyModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  visible,
  onClose,
  onSuccess,
  userId,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter your API key');
      return;
    }

    if (!AIService.validateApiKey(apiKey)) {
      Alert.alert(
        'Invalid API Key',
        'Please enter a valid API key. It should start with "sk-", "claude-", "AIza", or be at least 20 characters long.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Get API Key', onPress: () => openApiKeyHelp() }
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const aiService = AIService.getInstance();
      await aiService.initialize(userId);
      await aiService.updateUserApiKey(apiKey.trim());
      setLoading(false);
      
      // Show success message before closing
      Alert.alert(
        'Success!',
        'Your API key has been saved successfully. AI features are now enabled!',
        [
          {
            text: 'Great!',
            onPress: () => {
              onSuccess();
              onClose();
              setApiKey('');
            }
          }
        ]
      );
    } catch (error) {
      setLoading(false);
      console.error('API key save error:', error);
      Alert.alert(
        'Error',
        'Failed to save API key. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const openApiKeyHelp = () => {
    Alert.alert(
      'Get Your API Key',
      'To use AI features, you need an API key from an AI service provider like OpenAI, Anthropic, or Google.\n\n1. Visit their website\n2. Create an account\n3. Generate an API key\n4. Copy and paste it here',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Learn More', onPress: () => {
          // Open in a controlled way without automatic navigation
          Linking.openURL('https://platform.openai.com/api-keys').catch(() => {
            Alert.alert('Error', 'Could not open the website. Please visit https://platform.openai.com/api-keys manually.');
          });
        }}
      ]
    );
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip API Key',
      'You can still use the app without AI features. You can add your API key later in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip for Now', style: 'default', onPress: onClose }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Enter Your AI API Key</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            To use AI features like chat suggestions, smart replies, and content generation, 
            you need to provide your AI service API key.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>API Key</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[
                  styles.input,
                  apiKey.trim() && AIService.validateApiKey(apiKey) && styles.validInput
                ]}
                value={apiKey}
                onChangeText={(text) => {
                  setApiKey(text);
                  // Auto-validate as user types
                  if (text.trim() && AIService.validateApiKey(text)) {
                    // API key looks valid, could auto-save or show validation indicator
                  }
                }}
                placeholder="sk-..."
                placeholderTextColor="#999"
                secureTextEntry={!showKey}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                autoFocus={true}
              />
              <TouchableOpacity
                onPress={() => setShowKey(!showKey)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showKey ? 'eye-off' : 'eye'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
            
            {/* Validation indicator */}
            {apiKey.trim() && (
              <View style={styles.validationContainer}>
                {AIService.validateApiKey(apiKey) ? (
                  <View style={styles.validIndicator}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.validText}>Valid API key format</Text>
                  </View>
                ) : (
                  <View style={styles.invalidIndicator}>
                    <Ionicons name="close-circle" size={16} color="#F44336" />
                    <Text style={styles.invalidText}>Invalid API key format</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.skipButton]}
              onPress={handleSkip}
            >
              <Text style={styles.skipButtonText}>Skip for Now</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.saveButton, !apiKey.trim() && styles.disabledButton]}
              onPress={handleSave}
              disabled={!apiKey.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.saveButtonText}>Save & Enable AI</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={openApiKeyHelp} style={styles.helpButton}>
            <Ionicons name="help-circle-outline" size={16} color="#007AFF" />
            <Text style={styles.helpText}>How to get an API key?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  validInput: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  eyeButton: {
    padding: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  helpText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  validationContainer: {
    marginTop: 8,
  },
  validIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  validText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '500',
  },
  invalidIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  invalidText: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default ApiKeyModal; 