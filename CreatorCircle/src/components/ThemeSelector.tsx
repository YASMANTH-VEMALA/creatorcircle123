import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Local interface for chat themes (will be updated when new chat system is built)
interface ChatTheme {
  backgroundType: string;
  backgroundColor: string;
  textColor: string;
  bubbleColor: string;
  bubbleTextColor: string;
}

const { width } = Dimensions.get('window');

interface ThemeSelectorProps {
  visible: boolean;
  onClose: () => void;
  onThemeSelect: (theme: ChatTheme) => void;
  currentTheme: ChatTheme;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  visible,
  onClose,
  onThemeSelect,
  currentTheme,
}) => {
  const [selectedBackgroundType, setSelectedBackgroundType] = useState(currentTheme.backgroundType);
  const [selectedTextColor, setSelectedTextColor] = useState(currentTheme.textColor);
  const [selectedBubbleColor, setSelectedBubbleColor] = useState(currentTheme.bubbleColor);

  const backgroundOptions = [
    { type: 'light', name: 'Light', color: '#FFFFFF', icon: 'sunny' },
    { type: 'dark', name: 'Dark', color: '#1A1A1A', icon: 'moon' },
    { type: 'gradient', name: 'Gradient', color: '#E3F2FD', icon: 'color-palette' },
    { type: 'abstract', name: 'Abstract', color: '#F3E5F5', icon: 'brush' },
    { type: 'custom', name: 'Custom', color: '#FFF3E0', icon: 'settings' },
  ];

  const textColors = [
    { color: '#000000', name: 'Black' },
    { color: '#FFFFFF', name: 'White' },
    { color: '#666666', name: 'Gray' },
    { color: '#007AFF', name: 'Blue' },
    { color: '#4CAF50', name: 'Green' },
    { color: '#FF6B35', name: 'Orange' },
  ];

  const bubbleColors = [
    { color: '#007AFF', name: 'Blue' },
    { color: '#4CAF50', name: 'Green' },
    { color: '#FF6B35', name: 'Orange' },
    { color: '#9C27B0', name: 'Purple' },
    { color: '#E31B23', name: 'Red' },
    { color: '#F39C12', name: 'Yellow' },
  ];

  const handleThemeSelect = () => {
    const newTheme: ChatTheme = {
      backgroundType: selectedBackgroundType,
      backgroundColor: getBackgroundColor(selectedBackgroundType),
      textColor: selectedTextColor,
      bubbleColor: selectedBubbleColor,
      bubbleTextColor: getBubbleTextColor(selectedBubbleColor),
    };

    onThemeSelect(newTheme);
    onClose();
  };

  const getBackgroundColor = (type: string): string => {
    switch (type) {
      case 'light': return '#FFFFFF';
      case 'dark': return '#1A1A1A';
      case 'gradient': return '#E3F2FD';
      case 'abstract': return '#F3E5F5';
      case 'custom': return '#FFF3E0';
      default: return '#FFFFFF';
    }
  };

  const getBubbleTextColor = (bubbleColor: string): string => {
    // Return white for dark bubble colors, black for light ones
    const darkColors = ['#1A1A1A', '#9C27B0', '#E31B23', '#007AFF'];
    return darkColors.includes(bubbleColor) ? '#FFFFFF' : '#000000';
  };

  const renderBackgroundOption = (option: any) => (
    <TouchableOpacity
      key={option.type}
      style={[
        styles.backgroundOption,
        {
          backgroundColor: option.color,
          borderColor: selectedBackgroundType === option.type ? '#007AFF' : '#E0E0E0',
          borderWidth: selectedBackgroundType === option.type ? 3 : 1,
        },
      ]}
      onPress={() => setSelectedBackgroundType(option.type)}
    >
      <Ionicons
        name={option.icon as any}
        size={24}
        color={option.type === 'dark' ? '#FFFFFF' : '#000000'}
      />
      <Text
        style={[
          styles.backgroundOptionText,
          { color: option.type === 'dark' ? '#FFFFFF' : '#000000' },
        ]}
      >
        {option.name}
      </Text>
    </TouchableOpacity>
  );

  const renderColorOption = (option: any, selectedColor: string, onSelect: (color: string) => void) => (
    <TouchableOpacity
      key={option.color}
      style={[
        styles.colorOption,
        {
          backgroundColor: option.color,
          borderColor: selectedColor === option.color ? '#007AFF' : '#E0E0E0',
          borderWidth: selectedColor === option.color ? 3 : 1,
        },
      ]}
      onPress={() => onSelect(option.color)}
    >
      {selectedColor === option.color && (
        <View style={styles.checkmark}>
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        </View>
      )}
      <Text style={styles.colorOptionText}>{option.name}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Chat Theme</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Background Type Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Background Style</Text>
              <View style={styles.backgroundOptions}>
                {backgroundOptions.map(renderBackgroundOption)}
              </View>
            </View>

            {/* Text Color Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Text Color</Text>
              <View style={styles.colorOptions}>
                {textColors.map((option) =>
                  renderColorOption(option, selectedTextColor, setSelectedTextColor)
                )}
              </View>
            </View>

            {/* Bubble Color Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Message Bubble Color</Text>
              <View style={styles.colorOptions}>
                {bubbleColors.map((option) =>
                  renderColorOption(option, selectedBubbleColor, setSelectedBubbleColor)
                )}
              </View>
            </View>

            {/* Preview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preview</Text>
              <View
                style={[
                  styles.previewContainer,
                  { backgroundColor: getBackgroundColor(selectedBackgroundType) },
                ]}
              >
                <View
                  style={[
                    styles.previewBubble,
                    { backgroundColor: selectedBubbleColor },
                  ]}
                >
                  <Text
                    style={[
                      styles.previewBubbleText,
                      { color: getBubbleTextColor(selectedBubbleColor) },
                    ]}
                  >
                    Sample message
                  </Text>
                </View>
                <Text style={[styles.previewText, { color: selectedTextColor }]}>
                  Preview text
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleThemeSelect}>
              <Text style={styles.applyButtonText}>Apply Theme</Text>
            </TouchableOpacity>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
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
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
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
  backgroundOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  backgroundOption: {
    width: (width - 100) / 3,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backgroundOptionText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: (width - 100) / 3,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  previewContainer: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 100,
    justifyContent: 'center',
  },
  previewBubble: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    marginBottom: 12,
    maxWidth: '80%',
  },
  previewBubbleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  previewText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  applyButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ThemeSelector; 