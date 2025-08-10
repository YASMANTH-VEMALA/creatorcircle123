import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  AppState,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { collaborationService, ChatMessage } from '../services/collaborationService';
import { UserService } from '../services/userService';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Avatar } from '../components/ui/Avatar';
import { doc, onSnapshot, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const { width } = Dimensions.get('window');

interface ChatScreenRouteParams {
      otherUserId: string;
      otherUserName: string;
}

interface UserStatus {
  status: 'online' | 'offline' | 'typing';
  lastSeen: any;
}

const ChatScreen: React.FC = () => {
  const { user } = useAuth();
  const route = useRoute();
  const navigation = useNavigation();
  const { otherUserId, otherUserName } = route.params as ChatScreenRouteParams;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [otherUserProfile, setOtherUserProfile] = useState<any>(null);
  const [otherUserStatus, setOtherUserStatus] = useState<UserStatus>({ status: 'offline', lastSeen: null });
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (user?.uid && otherUserId) {
      loadChatMessages();
      loadOtherUserProfile();
      setupUserStatus();
      setupOtherUserStatusListener();
      setupTypingListener();
    }

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        updateUserStatus('online');
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App went to background
        updateUserStatus('offline');
      }
      appState.current = nextAppState;
    });
      
      return () => {
      subscription?.remove();
      updateUserStatus('offline');
    };
  }, [user?.uid, otherUserId]);

  const setupUserStatus = () => {
    if (user?.uid) {
      updateUserStatus('online');
    }
  };

  const updateUserStatus = async (status: 'online' | 'offline' | 'typing') => {
    if (!user?.uid) return;
    
    try {
      const userStatusRef = doc(db, 'userStatus', user.uid);
      await setDoc(userStatusRef, {
        status,
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const setupOtherUserStatusListener = () => {
    if (!otherUserId) return;

    const userStatusRef = doc(db, 'userStatus', otherUserId);
    const unsubscribe = onSnapshot(userStatusRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setOtherUserStatus({
          status: data?.status || 'offline',
          lastSeen: data?.lastSeen,
        });
      }
    });

    return unsubscribe;
  };

  const setupTypingListener = () => {
    if (!otherUserId) return;

    const userStatusRef = doc(db, 'userStatus', otherUserId);
    const unsubscribe = onSnapshot(userStatusRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data?.status === 'typing') {
          setIsTyping(true);
          // Clear typing indicator after 5 seconds
          setTimeout(() => setIsTyping(false), 5000);
      } else {
          setIsTyping(false);
        }
      }
    });

    return unsubscribe;
  };

  const handleTyping = () => {
    if (!user?.uid) return;

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set typing status
    updateUserStatus('typing');

    // Set timeout to clear typing status
    const timeout = setTimeout(() => {
      updateUserStatus('online');
    }, 3000);

    setTypingTimeout(timeout);
  };

  const loadChatMessages = () => {
    if (!user?.uid || !otherUserId) return;
      
    console.log('Loading chat messages for users:', user.uid, otherUserId);
    
    return collaborationService.listenToChatMessages(
      user.uid,
      otherUserId,
      (messages) => {
        console.log('Received messages:', messages.length);
        setMessages(messages);
        setLoading(false);
        
        // Scroll to bottom when new messages arrive
        setTimeout(() => {
          if (flatListRef.current && messages.length > 0) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
        
        // Mark messages as read
        collaborationService.markMessagesAsRead(otherUserId, user.uid);
      }
    );
  };

  const loadOtherUserProfile = async () => {
    try {
      const profile = await UserService.getUserProfile(otherUserId);
      setOtherUserProfile(profile);
    } catch (error) {
      console.error('Error loading other user profile:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!user?.uid || !otherUserId || !newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX

    try {
      setSending(true);
      console.log('Sending message to:', otherUserId);
      
      await collaborationService.sendChatMessage(
        user.uid,
        otherUserId,
        messageText
      );
      
      console.log('Message sent successfully');
      
      // Clear typing status
      updateUserStatus('online');
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore the message in input if sending failed
      setNewMessage(messageText);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatLastSeen = (lastSeen: any) => {
    if (!lastSeen) return 'Offline';
    
    const now = new Date();
    const lastSeenDate = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
    const diffInMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMyMessage = item.senderId === user?.uid;
    
    // Debug logging
    console.log('Rendering message:', {
      id: item.id,
      senderId: item.senderId,
      message: item.message.substring(0, 30) + '...',
      timestamp: item.timestamp,
      isMyMessage
    });
    
    // Safe timestamp handling
    let messageTime = '';
    try {
      const timestamp = item.timestamp;
      let date: Date;
      
      if (timestamp && typeof timestamp.toMillis === 'function') {
        // Firestore Timestamp
        date = new Date(timestamp.toMillis());
      } else if (timestamp && typeof timestamp.toDate === 'function') {
        // Firestore Timestamp
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        // JavaScript Date
        date = timestamp;
      } else if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
        // Firestore Timestamp object
        date = new Date(timestamp.seconds * 1000);
      } else {
        // Fallback
        date = new Date();
      }
      
      messageTime = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    } catch (error) {
      console.error('Error formatting message time:', error);
      messageTime = '--:--';
    }
      
      return (
      <View style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.otherMessage]}>
        <View style={[styles.messageBubble, isMyMessage ? styles.myBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
            {item.message}
                </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isMyMessage ? styles.myMessageTime : styles.otherMessageTime]}>
              {messageTime}
              </Text>
            {isMyMessage && (
              <View style={styles.readReceipt}>
                <Ionicons 
                  name={item.read ? "checkmark-done" : "checkmark"} 
                  size={14} 
                  color={item.read ? "#34C759" : "rgba(255, 255, 255, 0.7)"} 
                />
                          </View>
                        )}
                </View>
                  </View>
              </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
            <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>

            <TouchableOpacity 
        style={styles.userInfo}
              onPress={() => {
          navigation.navigate('UserProfile' as never, {
            userId: otherUserId,
            userName: otherUserName
          } as never);
        }}
      >
        <Avatar
          size="medium"
          source={otherUserProfile?.profilePhotoUrl}
          fallback={otherUserName.charAt(0).toUpperCase()}
          verified={otherUserProfile?.verifiedBadge !== 'none'}
        />

        <View style={styles.userDetails}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{otherUserName}</Text>
            {otherUserProfile?.verifiedBadge !== 'none' && (
              <Ionicons name="checkmark-circle" size={16} color="#007AFF" style={styles.verifiedBadge} />
            )}
          </View>
          <Text style={styles.userStatus}>
            {otherUserStatus.status === 'online' ? 'Active now' : 
             otherUserStatus.status === 'typing' ? 'Typing...' :
             formatLastSeen(otherUserStatus.lastSeen)}
              </Text>
        </View>
            </TouchableOpacity>

            <TouchableOpacity 
        style={styles.moreButton}
              onPress={() => {
                Alert.alert(
            'Chat Options',
            'What would you like to do?',
            [
              { text: 'View Profile', onPress: () => {
                navigation.navigate('UserProfile' as never, {
                  userId: otherUserId,
                  userName: otherUserName
                } as never);
              }},
              { text: 'View Location', onPress: () => {
                navigation.navigate('NearbyCreators' as never);
              }},
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }}
      >
        <Ionicons name="ellipsis-vertical" size={20} color="#007AFF" />
            </TouchableOpacity>
        </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
    <KeyboardAvoidingView 
        style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
        {renderHeader()}
        
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => {
          if (flatListRef.current && messages.length > 0) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }}
          showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={10}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No messages yet</Text>
              <Text style={styles.emptyStateSubtext}>Start a conversation!</Text>
            </View>
          }
        />

        <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={newMessage}
            onChangeText={(text) => {
              setNewMessage(text);
              handleTyping();
            }}
            placeholder="Type a message..."
              placeholderTextColor="#999"
              multiline
            maxLength={500}
            />
            
            <TouchableOpacity 
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="send" size={20} color="white" />
            )}
                  </TouchableOpacity>
                </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 4,
  },
  verifiedBadge: {
    marginLeft: 2,
  },
  userStatus: {
    fontSize: 13,
    color: '#666',
    marginTop: 1,
  },
  moreButton: {
    padding: 8,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '500',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
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
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 6,
  },
  otherBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: '#333',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: '#999',
  },
  readReceipt: {
    marginLeft: 4,
  },
  inputContainer: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 100,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default ChatScreen; 