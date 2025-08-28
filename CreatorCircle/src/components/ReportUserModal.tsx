import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ReportUserModalProps {
  visible: boolean;
  onClose: () => void;
  onReportSubmit: (reason: string, category: string, details: string) => void;
  reportedUserName: string;
}

const ReportUserModal: React.FC<ReportUserModalProps> = ({
  visible,
  onClose,
  onReportSubmit,
  reportedUserName,
}) => {
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const reportCategories = [
    {
      id: 'harassment',
      title: 'Harassment or Bullying',
      description: 'Repeated unwanted contact, threats, or intimidation',
      icon: 'warning',
      color: '#FF3B30',
    },
    {
      id: 'inappropriate',
      title: 'Inappropriate Content',
      description: 'Offensive, vulgar, or NSFW content',
      icon: 'eye-off',
      color: '#FF9500',
    },
    {
      id: 'spam',
      title: 'Spam or Advertising',
      description: 'Unwanted promotional content or excessive messaging',
      icon: 'mail-unread',
      color: '#FF6B35',
    },
    {
      id: 'fake',
      title: 'Fake Profile or Scam',
      description: 'Impersonation, fraud, or deceptive behavior',
      icon: 'shield-checkmark',
      color: '#5856D6',
    },
    {
      id: 'hate',
      title: 'Hate Speech',
      description: 'Discriminatory, racist, or hateful language',
      icon: 'close-circle',
      color: '#E31B23',
    },
    {
      id: 'other',
      title: 'Other',
      description: 'Other violations not listed above',
      icon: 'ellipsis-horizontal',
      color: '#666',
    },
  ];

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setStep(2);
  };

  const handleSubmit = () => {
    if (!reason.trim() || reason.trim().length < 10) {
      Alert.alert(
        'Incomplete Report',
        'Please provide a detailed reason (at least 10 characters) for reporting this user.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!details.trim() || details.trim().length < 20) {
      Alert.alert(
        'Incomplete Report',
        'Please provide detailed information about what happened (at least 20 characters).',
        [{ text: 'OK' }]
      );
      return;
    }

    // Submit the report
    onReportSubmit(reason.trim(), selectedCategory, details.trim());
    
    // Reset form
    setStep(1);
    setSelectedCategory('');
    setReason('');
    setDetails('');
  };

  const handleClose = () => {
    // Reset form when closing
    setStep(1);
    setSelectedCategory('');
    setReason('');
    setDetails('');
    onClose();
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 1: Select Report Category</Text>
      <Text style={styles.stepDescription}>
        Choose the category that best describes the issue with {reportedUserName}
      </Text>
      
      <ScrollView style={styles.categoriesContainer} showsVerticalScrollIndicator={false}>
        {reportCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={styles.categoryItem}
            onPress={() => handleCategorySelect(category.id)}
          >
            <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
              <Ionicons name={category.icon as any} size={24} color={category.color} />
            </View>
            <View style={styles.categoryContent}>
              <Text style={styles.categoryTitle}>{category.title}</Text>
              <Text style={styles.categoryDescription}>{category.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderStep2 = () => (
    <KeyboardAvoidingView 
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepTitle}>Step 2: Provide Details</Text>
        <Text style={styles.stepDescription}>
          Help us understand what happened so we can take appropriate action
        </Text>
        
        <View style={styles.selectedCategory}>
          <Text style={styles.selectedCategoryText}>
            Category: {reportCategories.find(c => c.id === selectedCategory)?.title}
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Brief Summary *</Text>
          <TextInput
            style={styles.textInput}
            value={reason}
            onChangeText={setReason}
            placeholder="What happened? (e.g., 'User sent inappropriate messages')"
            placeholderTextColor="#999"
            multiline
            maxLength={200}
          />
          <Text style={styles.charCount}>{reason.length}/200</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Detailed Description *</Text>
          <TextInput
            style={[styles.textInput, styles.detailsInput]}
            value={details}
            onChangeText={setDetails}
            placeholder="Please provide specific details about the incident, including when it happened, what was said/done, and any other relevant information..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
          />
          <Text style={styles.charCount}>{details.length}/1000</Text>
        </View>

        {/* Add some extra padding at bottom for keyboard */}
        <View style={styles.bottomPadding} />
      </ScrollView>
      
      <View style={styles.fixedButtons}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
          <Ionicons name="arrow-back" size={20} color="#007AFF" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit Report</Text>
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Report User</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(step / 2) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>Step {step} of 2</Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {step === 1 ? renderStep1() : renderStep2()}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    paddingTop: 50, // Give some space at top
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '95%',
    minHeight: '80%',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 32,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  stepContainer: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  bottomPadding: {
    height: 100, // Extra space for keyboard
  },
  fixedButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: 'white',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
  },
  categoriesContainer: {
    flex: 1,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  selectedCategory: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  selectedCategoryText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#F9F9F9',
  },
  detailsInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  stepButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginRight: 8,
  },
});

export default ReportUserModal; 