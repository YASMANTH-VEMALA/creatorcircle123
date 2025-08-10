import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileCompletionStatus } from '../services/profileValidationService';

interface ProfileCompletionPromptProps {
  visible: boolean;
  onClose: () => void;
  onCompleteProfile: () => void;
  completionStatus: ProfileCompletionStatus;
  actionName?: string;
}

const ProfileCompletionPrompt: React.FC<ProfileCompletionPromptProps> = ({
  visible,
  onClose,
  onCompleteProfile,
  completionStatus,
  actionName = 'access this feature'
}) => {
  const getActionMessage = () => {
    switch (actionName) {
      case 'send_collaboration_request':
        return 'send collaboration requests';
      case 'create_post':
        return 'create posts';
      case 'comment_on_post':
        return 'comment on posts';
      default:
        return actionName;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Ionicons name="person-circle-outline" size={48} color="#007AFF" />
            <Text style={styles.title}>Complete Your Profile</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.message}>
              You need to complete your profile to {getActionMessage()}.
            </Text>

            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                Profile Completion: {completionStatus.completionPercentage}%
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${completionStatus.completionPercentage}%` }
                  ]} 
                />
              </View>
            </View>

            <View style={styles.missingFieldsContainer}>
              <Text style={styles.missingFieldsTitle}>Missing Information:</Text>
              {completionStatus.missingFields.map((field, index) => (
                <View key={index} style={styles.missingFieldItem}>
                  <Ionicons name="alert-circle-outline" size={16} color="#FF3B30" />
                  <Text style={styles.missingFieldText}>{field}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Maybe Later</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.completeButton} onPress={onCompleteProfile}>
              <Text style={styles.completeButtonText}>Complete Profile</Text>
            </TouchableOpacity>
          </View>
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
    padding: 20,
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  content: {
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  missingFieldsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  missingFieldsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  missingFieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  missingFieldText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  completeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});

export default ProfileCompletionPrompt; 