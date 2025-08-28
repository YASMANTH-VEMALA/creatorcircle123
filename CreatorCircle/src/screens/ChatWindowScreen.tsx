import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { NewChatService, ChatMessage, ChatUser, ChatTheme } from '../services/newChatService';
import { AIService } from '../services/aiService';

interface ChatWindowProps {
  chatId: string;
  otherUser: ChatUser;
}

const ChatWindowScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { chatId, otherUser } = route.params as ChatWindowProps;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ChatTheme>(NewChatService.getDefaultThemes()[0]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [editText, setEditText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [aiMode, setAiMode] = useState<'ai' | 'grammar'>('ai');
  
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!chatId) return;

    // Subscribe to messages
    const unsubscribe = NewChatService.subscribeToMessages(chatId, (messageList) => {
      setMessages(messageList);
    });

    // Mark as read when screen opens
    if (user?.uid) {
      NewChatService.markAsRead(chatId, user.uid);
    }

    return unsubscribe;
  }, [chatId, user?.uid]);

  useEffect(() => {
    // Monitor typing status
    const words = inputText.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    setAiMode(words.length > 5 ? 'grammar' : 'ai');

    if (inputText.trim() && !isTyping) {
      setIsTyping(true);
      NewChatService.setTyping(chatId, user?.uid || '', true);
    } else if (!inputText.trim() && isTyping) {
      setIsTyping(false);
      NewChatService.setTyping(chatId, user?.uid || '', false);
    }

    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    if (inputText.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        NewChatService.setTyping(chatId, user?.uid || '', false);
      }, 2000);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [inputText, chatId, user?.uid, isTyping]);

  const sendMessage = async () => {
    if (!inputText.trim() || !user?.uid) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsTyping(false);
    NewChatService.setTyping(chatId, user.uid, false);

    try {
      await NewChatService.sendMessage(
        chatId,
        user.uid,
        otherUser.id,
        messageText
      );
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const handleLongPress = (message: ChatMessage) => {
    if (message.senderId !== user?.uid) return;

    Alert.alert(
      'Message Options',
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Edit',
          onPress: () => {
            setEditingMessage(message);
            setEditText(message.text);
            setShowEditModal(true);
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMessage(message),
        },
      ]
    );
  };

  const deleteMessage = async (message: ChatMessage) => {
    try {
      await NewChatService.deleteMessage(chatId, message.id);
    } catch (error) {
      console.error('Error deleting message:', error);
      Alert.alert('Error', 'Failed to delete message');
    }
  };

  const editMessage = async () => {
    if (!editingMessage || !editText.trim()) return;

    try {
      await NewChatService.editMessage(chatId, editingMessage.id, editText.trim());
      setShowEditModal(false);
      setEditingMessage(null);
      setEditText('');
    } catch (error) {
      console.error('Error editing message:', error);
      Alert.alert('Error', 'Failed to edit message');
    }
  };

  const handleAIClick = async () => {
    const userProfile = await NewChatService.getUserProfile(user?.uid || '');
    if (!userProfile || !user?.uid) return;

    // Check if user has API key
    const hasApiKey = await AIService.hasValidApiKey(user.uid);
    
    if (!hasApiKey) {
      Alert.alert(
        'AI Features Unavailable',
        'You need a Google API key for AI features.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go to Settings',
            onPress: () => navigation.navigate('Settings' as never),
          },
        ]
      );
      return;
    }

    if (aiMode === 'grammar') {
      // Show grammar options
      Alert.alert(
        'Grammar Assistant',
        'How would you like to improve your message?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Fix Grammar', onPress: () => improveText('grammar') },
          { text: 'Make Funny', onPress: () => improveText('funny') },
          { text: 'Make Professional', onPress: () => improveText('professional') },
          { text: 'Make More Efficient', onPress: () => improveText('efficient') },
        ]
      );
    } else {
      // Show AI suggestions modal
      setShowAIModal(true);
    }
  };

  const improveText = async (style: string) => {
    if (!inputText.trim()) return;

    setAiLoading(true);
    try {
      // Use AI service to improve text
      const improved = await AIService.improveText(inputText, style);
      if (improved) {
        setInputText(improved);
      }
    } catch (error) {
      console.error('Error improving text:', error);
      Alert.alert('Error', 'Failed to improve text');
    } finally {
      setAiLoading(false);
    }
  };

  const getAISuggestions = async (type: 'analyze' | 'suggestions') => {
    setAiLoading(true);
    try {
      if (type === 'analyze') {
        // Analyze recent chat history
        const recentMessages = messages.slice(-20); // Last 20 messages
        const analysis = await AIService.analyzeChatHistory(recentMessages, otherUser);
        setAiSuggestions(analysis);
      } else {
        // Get general suggestions
        const suggestions = await AIService.getChatSuggestions(otherUser);
        setAiSuggestions(suggestions);
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      Alert.alert('Error', 'Failed to get AI suggestions');
    } finally {
      setAiLoading(false);
    }
  };

  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to delete all messages in this chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await NewChatService.clearChat(chatId);
              setShowMenu(false);
            } catch (error) {
              Alert.alert('Error', 'Failed to clear chat');
            }
          },
        },
      ]
    );
  };

  const reportUser = () => {
    setShowMenu(false);
    setShowReportModal(true);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMyMessage = item.senderId === user?.uid;
    const isDeleted = item.isDeleted;

    if (isDeleted) {
      return (
        <View style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.otherMessage]}>
          <View style={[styles.deletedBubble]}>
            <Text style={styles.deletedText}>This message has been deleted</Text>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.otherMessage]}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
      >
        <View style={[
          styles.messageBubble,
          isMyMessage 
            ? [styles.myBubble, { backgroundColor: currentTheme.bubbleColor }]
            : styles.otherBubble,
        ]}>
          <Text style={[
            styles.messageText,
            isMyMessage 
              ? { color: currentTheme.bubbleTextColor }
              : { color: currentTheme.textColor },
          ]}>
            {item.text}
          </Text>
          {item.isEdited && (
            <Text style={styles.editedLabel}>edited</Text>
          )}
        </View>
        <Text style={styles.timestamp}>
          {item.timestamp?.toDate().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </TouchableOpacity>
    );
  };

  const MenuModal = () => (
    <Modal
      visible={showMenu}
      transparent
      animationType="fade"
      onRequestClose={() => setShowMenu(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        onPress={() => setShowMenu(false)}
      >
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem} onPress={clearChat}>
            <Ionicons name="trash" size={20} color="#FF3B30" />
            <Text style={styles.menuText}>Clear Chat</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => {
              setShowMenu(false);
              setShowThemes(true);
            }}
          >
            <Ionicons name="color-palette" size={20} color="#007AFF" />
            <Text style={styles.menuText}>Edit Theme</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
            <Ionicons name="search" size={20} color="#007AFF" />
            <Text style={styles.menuText}>Search in Chat</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
            <Ionicons name="images" size={20} color="#007AFF" />
            <Text style={styles.menuText}>Shared Media</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={reportUser}>
            <Ionicons name="flag" size={20} color="#FF3B30" />
            <Text style={styles.menuText}>Report User</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const AIModal = () => (
    <Modal
      visible={showAIModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowAIModal(false)}
    >
      <View style={styles.aiModalOverlay}>
        <View style={styles.aiModalContainer}>
          <View style={styles.aiModalHeader}>
            <Text style={styles.aiModalTitle}>CreatorCircle AI</Text>
            <TouchableOpacity onPress={() => setShowAIModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.aiModalSubtitle}>
            AI can analyze your chat and provide suggestions
          </Text>
          
          <View style={styles.aiButtonContainer}>
            <TouchableOpacity 
              style={styles.aiButton}
              onPress={() => getAISuggestions('analyze')}
              disabled={aiLoading}
            >
              <Ionicons name="analytics" size={20} color="white" />
              <Text style={styles.aiButtonText}>Analyze Chat</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.aiButton}
              onPress={() => getAISuggestions('suggestions')}
              disabled={aiLoading}
            >
              <Ionicons name="bulb" size={20} color="white" />
              <Text style={styles.aiButtonText}>Get Suggestions</Text>
            </TouchableOpacity>
          </View>
          
          {aiLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>AI is thinking...</Text>
            </View>
          )}
          
          {aiSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Suggestions:</Text>
              {aiSuggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => {
                    setInputText(suggestion);
                    setShowAIModal(false);
                  }}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const ThemeModal = () => (
    <Modal
      visible={showThemes}
      transparent
      animationType="slide"
      onRequestClose={() => setShowThemes(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.themeModalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Theme</Text>
            <TouchableOpacity onPress={() => setShowThemes(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={NewChatService.getDefaultThemes()}
            horizontal
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  { backgroundColor: item.backgroundColor },
                  currentTheme.id === item.id && styles.selectedTheme,
                ]}
                onPress={() => {
                  setCurrentTheme(item);
                  setShowThemes(false);
                }}
              >
                <View 
                  style={[styles.themeBubble, { backgroundColor: item.bubbleColor }]}
                />
                <Text style={[styles.themeName, { color: item.textColor }]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.backgroundColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={currentTheme.textColor} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Image 
            source={{ uri: otherUser.profilePic || 'https://via.placeholder.com/40' }}
            style={styles.headerAvatar}
          />
          <View>
            <View style={styles.headerNameRow}>
              <Text style={[styles.headerName, { color: currentTheme.textColor }]}>
                {otherUser.name}
              </Text>
              {otherUser.isVerified && (
                <Ionicons name="checkmark-circle" size={16} color="#007AFF" />
              )}
            </View>
            <Text style={[styles.headerStatus, { color: currentTheme.textColor }]}>
              {otherUserTyping ? 'Typing...' : 
               otherUser.isOnline ? 'Active now' : 'Last seen recently'}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity onPress={() => setShowMenu(true)}>
          <Ionicons name="ellipsis-horizontal" size={24} color={currentTheme.textColor} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.textInput, { color: currentTheme.textColor }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#8E8E93"
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity 
            style={styles.aiButton}
            onPress={handleAIClick}
            disabled={aiLoading}
          >
            {aiLoading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Ionicons 
                name={aiMode === 'grammar' ? "create" : "sparkles"} 
                size={20} 
                color="#007AFF" 
              />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.sendButton, { backgroundColor: currentTheme.primaryColor }]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Modals */}
      <MenuModal />
      <AIModal />
      <ThemeModal />

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContainer}>
            <Text style={styles.modalTitle}>Edit Message</Text>
            <TextInput
              style={styles.editInput}
              value={editText}
              onChangeText={setEditText}
              multiline
              autoFocus
            />
            <View style={styles.editButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={editMessage}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  headerStatus: {
    fontSize: 12,
    opacity: 0.7,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 4,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: '#007AFF',
  },
  otherBubble: {
    backgroundColor: '#E5E5E7',
  },
  messageText: {
    fontSize: 16,
  },
  editedLabel: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.7,
    marginTop: 4,
  },
  deletedBubble: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: '80%',
  },
  deletedText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#8E8E93',
  },
  timestamp: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 4,
    marginHorizontal: 8,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
    backgroundColor: '#FFFFFF',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  aiButton: {
    padding: 8,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 200,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuText: {
    fontSize: 16,
    marginLeft: 12,
  },
  aiModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  aiModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  aiModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  aiModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  aiModalSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginVertical: 16,
  },
  aiButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  aiButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#8E8E93',
  },
  suggestionsContainer: {
    marginTop: 20,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  suggestionItem: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 14,
  },
  themeModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 20,
    maxWidth: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  themeOption: {
    width: 80,
    height: 100,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTheme: {
    borderColor: '#007AFF',
  },
  themeBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginBottom: 8,
  },
  themeName: {
    fontSize: 12,
    fontWeight: '600',
  },
  editModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    maxWidth: '90%',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    maxHeight: 120,
    marginVertical: 16,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#8E8E93',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChatWindowScreen; 