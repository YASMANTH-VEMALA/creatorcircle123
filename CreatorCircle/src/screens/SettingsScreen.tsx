import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { AIService } from '../services/aiService';
import { UserService } from '../services/userService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';
import { deleteUser } from 'firebase/auth';
import { DeleteAccountUrlService } from '../utils/deleteAccountUrl';

const SettingsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [aiApiKey, setAiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiService, setAiService] = useState<AIService | null>(null);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      initializeSettings();
    }
  }, [user?.uid]);

  const initializeSettings = async () => {
    try {
      const service = AIService.getInstance();
      await service.initialize(user!.uid);
      setAiService(service);
      
      const currentKey = service.getUserApiKey();
      setAiApiKey(currentKey || '');
      setAiEnabled(service.isAIAvailable());
    } catch (error) {
      console.error('Failed to initialize settings:', error);
    }
  };

  const handleSaveApiKey = async () => {
    if (!aiService || !user?.uid) return;

    if (!AIService.validateApiKey(aiApiKey)) {
      Alert.alert(
        'Invalid API Key',
        'Please enter a valid API key. It should start with "sk-", "claude-", "AIza", or be at least 20 characters long.'
      );
      return;
    }

    setLoading(true);
    try {
      await aiService.updateUserApiKey(aiApiKey.trim());
      setAiEnabled(true);
      // Mark user as prompted so we never ask again
      if (user?.uid) {
        try { await AsyncStorage.setItem(`ai_prompted_${user.uid}`, 'true'); } catch {}
      }
      Alert.alert(
        'Success!', 
        'Your API key has been saved successfully. AI features are now enabled!',
        [{ text: 'Great!' }]
      );
    } catch (error) {
      console.error('API key save error:', error);
      Alert.alert(
        'Error', 
        'Failed to save API key. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClearApiKey = async () => {
    if (!aiService) return;

    Alert.alert(
      'Clear API Key',
      'Are you sure you want to clear your API key? This will disable all AI features.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await aiService.clearUserApiKey();
              setAiApiKey('');
              setAiEnabled(false);
              Alert.alert('Success', 'API key cleared successfully.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear API key. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleToggleAI = async (enabled: boolean) => {
    if (enabled && !aiApiKey.trim()) {
      Alert.alert(
        'API Key Required',
        'Please enter your AI API key to enable AI features.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (enabled) {
      await handleSaveApiKey();
    } else {
      await handleClearApiKey();
    }
  };

  const openApiKeyHelp = () => {
    Alert.alert(
      'Get Your API Key',
      'To use AI features, you need an API key from an AI service provider like OpenAI, Anthropic, or Google.\n\n1. Visit their website\n2. Create an account\n3. Generate an API key\n4. Copy and paste it here',
      [{ text: 'OK' }]
    );
  };

  const handleDeleteAccount = () => {
    setShowDeleteAccountModal(true);
  };

  const confirmDeleteAccount = async () => {
    if (!user?.uid || !user.email) return;

    const expectedText = `${user.email}'s Account`;
    
    if (deleteConfirmation !== expectedText) {
      Alert.alert(
        'Confirmation Mismatch',
        'Please type the exact text to confirm account deletion.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsDeleting(true);
    try {
      // Delete user data from Firestore
      await UserService.deleteUserAccount(user.uid);
      
      // Delete Firebase Auth user
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }
      
      // Clear local storage
      await AsyncStorage.clear();
      
      // Show success message and navigate to login
      Alert.alert(
        'Account Deleted',
        'Your account has been permanently deleted. You will be redirected to the login page.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Force navigation to login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' as never }],
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert(
        'Error',
        'Failed to delete account. Please try again or contact support.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteAccountModal(false);
      setDeleteConfirmation('');
    }
  };

  const closeDeleteAccountModal = () => {
    setShowDeleteAccountModal(false);
    setDeleteConfirmation('');
  };

  const handleGenerateDeleteUrl = () => {
    if (!user?.uid || !user.email) return;
    
    // Show options for generating delete account request
    Alert.alert(
      'Delete Account Request',
      'Choose how you would like to request account deletion:',
      [
        {
          text: 'Generate Web URL',
          onPress: () => DeleteAccountUrlService.copyDeleteAccountUrl(user.uid, user.email)
        },
        {
          text: 'Local Request',
          onPress: () => {
            const localRequest = DeleteAccountUrlService.generateLocalDeletionRequest(user.uid, user.email);
            Alert.alert(
              'Local Deletion Request',
              localRequest.instructions,
              [
                { text: 'Copy Details', onPress: () => console.log('Details copied:', localRequest) },
                { text: 'Close' }
              ]
            );
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleEmailDeleteRequest = () => {
    if (!user?.uid || !user.email) return;
    DeleteAccountUrlService.openEmailRequest(user.uid, user.email);
  };

  const handleShareDeleteRequest = () => {
    if (!user?.uid || !user.email) return;
    const message = DeleteAccountUrlService.generateShareableMessage(user.uid, user.email);
    Alert.alert(
      'Delete Account Request',
      message,
      [
        { text: 'Copy Message', onPress: () => console.log('Message copied to clipboard') },
        { text: 'Close' }
      ]
    );
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderSection('AI Features', (
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable AI Features</Text>
              <Text style={styles.settingDescription}>
                Chat suggestions, smart replies, and content generation
              </Text>
            </View>
            <Switch
              value={aiEnabled}
              onValueChange={handleToggleAI}
              trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
              thumbColor={aiEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
        ))}

        {renderSection('API Key', (
          <>
            {/* Current API Key Status */}
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Current API Key</Text>
                <Text style={styles.settingDescription}>
                  {aiApiKey ? 'API key is configured' : 'No API key configured'}
                </Text>
              </View>
              {aiApiKey && (
                <View style={styles.statusIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                </View>
              )}
            </View>

            {/* API Key Input */}
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>AI Service API Key</Text>
                <Text style={styles.settingDescription}>
                  Your personal API key for AI features
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowApiKey(!showApiKey)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showApiKey ? 'eye-off' : 'eye'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.apiKeyInput,
                  aiApiKey.trim() && AIService.validateApiKey(aiApiKey) && styles.validApiKeyInput
                ]}
                value={aiApiKey}
                onChangeText={setAiApiKey}
                placeholder="sk-..."
                placeholderTextColor="#999"
                secureTextEntry={!showApiKey}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
              />
              
              {/* Validation indicator */}
              {aiApiKey.trim() && (
                <View style={styles.validationContainer}>
                  {AIService.validateApiKey(aiApiKey) ? (
                    <View style={styles.validIndicator}>
                      <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                      <Text style={styles.validText}>Valid API key format</Text>
                    </View>
                  ) : (
                    <View style={styles.invalidIndicator}>
                      <Ionicons name="close-circle" size={14} color="#F44336" />
                      <Text style={styles.invalidText}>Invalid API key format</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveApiKey}
                disabled={loading || !aiApiKey.trim()}
              >
                <Text style={styles.buttonText}>Save API Key</Text>
              </TouchableOpacity>

              {aiApiKey.trim() && (
                <TouchableOpacity
                  style={[styles.button, styles.clearButton]}
                  onPress={handleClearApiKey}
                  disabled={loading}
                >
                  <Text style={[styles.buttonText, styles.clearButtonText]}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity onPress={openApiKeyHelp} style={styles.helpButton}>
              <Ionicons name="help-circle-outline" size={16} color="#007AFF" />
              <Text style={styles.helpText}>How to get an API key?</Text>
            </TouchableOpacity>
            
            {/* API Key Tips */}
            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>💡 Quick Tips:</Text>
              <Text style={styles.tipText}>• OpenAI: Visit platform.openai.com/api-keys</Text>
              <Text style={styles.tipText}>• Anthropic: Visit console.anthropic.com</Text>
              <Text style={styles.tipText}>• Google AI: Visit makersuite.google.com/app/apikey</Text>
              <Text style={styles.tipText}>• Copy the key and paste it above</Text>
            </View>
          </>
        ))}

        {renderSection('Privacy & Security', (
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Location Sharing</Text>
              <Text style={styles.settingDescription}>
                Control location sharing with nearby creators
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('LocationSettings' as never)}
              style={styles.navigateButton}
            >
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        ))}

        {renderSection('Data & Privacy', (
          <>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Generate Delete Account URL</Text>
                <Text style={styles.settingDescription}>
                  Get a link to request account deletion
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleGenerateDeleteUrl}
                style={styles.navigateButton}
              >
                <Ionicons name="link-outline" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Email Delete Request</Text>
                <Text style={styles.settingDescription}>
                  Send a deletion request via email
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleEmailDeleteRequest}
                style={styles.navigateButton}
              >
                <Ionicons name="mail-outline" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Share Delete Request</Text>
                <Text style={styles.settingDescription}>
                  Get a shareable deletion request message
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleShareDeleteRequest}
                style={styles.navigateButton}
              >
                <Ionicons name="share-outline" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </>
        ))}

        {renderSection('Account', (
          <>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Profile Settings</Text>
                <Text style={styles.settingDescription}>
                  Edit your profile and preferences
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('Profile' as never)}
                style={styles.navigateButton}
              >
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Delete Account</Text>
                <Text style={styles.settingDescription}>
                  Permanently delete your account and all data
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleDeleteAccount}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          </>
        ))}
      </ScrollView>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteAccountModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeDeleteAccountModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Confirm deletion of {user?.email}'s Account
              </Text>
              <TouchableOpacity onPress={closeDeleteAccountModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Warning Banner */}
            <View style={styles.warningBanner}>
              <Ionicons name="warning" size={20} color="#FF3B30" />
              <Text style={styles.warningText}>This action cannot be undone.</Text>
            </View>

            {/* Description */}
            <Text style={styles.modalDescription}>
              This will permanently delete {user?.email}'s account and all of its data including:
            </Text>

            <View style={styles.deletionList}>
              <Text style={styles.deletionItem}>• All posts and content</Text>
              <Text style={styles.deletionItem}>• Profile information</Text>
              <Text style={styles.deletionItem}>• Chat messages and history</Text>
              <Text style={styles.deletionItem}>• Collaboration requests</Text>
              <Text style={styles.deletionItem}>• AI settings and preferences</Text>
            </View>

            {/* Confirmation Prompt */}
            <Text style={styles.confirmationPrompt}>
              Type <Text style={styles.confirmationText}>{user?.email}'s Account</Text> to confirm.
            </Text>

            {/* Input Field */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.confirmationInput,
                  deleteConfirmation === `${user?.email}'s Account` && styles.validConfirmationInput
                ]}
                value={deleteConfirmation}
                onChangeText={setDeleteConfirmation}
                placeholder="Type the account name in here"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
              />
              
              {/* Validation Message */}
              {deleteConfirmation && deleteConfirmation !== `${user?.email}'s Account` && (
                <Text style={styles.errorMessage}>Value entered does not match</Text>
              )}
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.deleteAccountButton,
                deleteConfirmation === `${user?.email}'s Account` && styles.deleteAccountButtonEnabled
              ]}
              onPress={confirmDeleteAccount}
              disabled={deleteConfirmation !== `${user?.email}'s Account` || isDeleting}
            >
              {isDeleting ? (
                <Text style={styles.deleteAccountButtonText}>Deleting...</Text>
              ) : (
                <Text style={styles.deleteAccountButtonText}>I understand, delete this account</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  eyeButton: {
    padding: 8,
  },
  navigateButton: {
    padding: 8,
  },
  statusIndicator: {
    padding: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  apiKeyInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  validApiKeyInput: {
    borderColor: '#4CAF50',
    borderWidth: 2,
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
  saveButton: {
    backgroundColor: '#007AFF',
  },
  clearButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  clearButtonText: {
    color: '#666',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
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
    gap: 4,
  },
  validText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '500',
  },
  invalidIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  invalidText: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: '500',
  },
  tipsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginBottom: 4,
  },
  deleteButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    padding: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 4,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 16,
    margin: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  warningText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 8,
  },
  modalDescription: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  deletionList: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  deletionItem: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  confirmationPrompt: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  confirmationText: {
    fontWeight: '600',
    color: '#FF3B30',
  },
  confirmationInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    marginHorizontal: 20,
    marginBottom: 8,
  },
  validConfirmationInput: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  errorMessage: {
    fontSize: 14,
    color: '#FF3B30',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  deleteAccountButton: {
    backgroundColor: '#C7C7CC',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAccountButtonEnabled: {
    backgroundColor: '#FF3B30',
  },
  deleteAccountButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default SettingsScreen; 