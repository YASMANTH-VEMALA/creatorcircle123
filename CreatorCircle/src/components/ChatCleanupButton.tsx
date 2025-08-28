import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { ChatDataCleanup } from '../utils/chatDataCleanup';

interface ChatCleanupButtonProps {
  style?: any;
  textStyle?: any;
}

const ChatCleanupButton: React.FC<ChatCleanupButtonProps> = ({ style, textStyle }) => {
  const [isCleaning, setIsCleaning] = useState(false);

  const handleCleanup = async () => {
    // First get stats
    const stats = await ChatDataCleanup.getChatDataStats();
    const totalItems = stats.chats + stats.chatMessages + stats.chatSettings;

    if (totalItems === 0) {
      Alert.alert('ℹ️ No Data Found', 'There is no chat data to delete.');
      return;
    }

    Alert.alert(
      '🚨 Delete All Chat Data',
      `This will permanently delete ALL chat data:\n\n• ${stats.chats} chats\n• ${stats.chatMessages} messages\n• ${stats.chatSettings} settings\n\nThis action cannot be undone. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            setIsCleaning(true);
            try {
              console.log('🚨 Starting chat data deletion...');
              await ChatDataCleanup.deleteAllChatData();
              Alert.alert('✅ Success', 'All chat data has been deleted successfully.');
            } catch (error) {
              console.error('❌ Error during cleanup:', error);
              Alert.alert('❌ Error', 'Failed to delete chat data. Check the console for details.');
            } finally {
              setIsCleaning(false);
            }
          }
        }
      ]
    );
  };

  return (
    <TouchableOpacity 
      style={[styles.button, style]} 
      onPress={handleCleanup}
      disabled={isCleaning}
    >
      {isCleaning ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={[styles.buttonText, textStyle]}>
          🗑️ Delete Chat Data
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ChatCleanupButton; 