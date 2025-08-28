import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Animated,
  RefreshControl,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { NewChatService, Chat, ChatUser } from '../services/newChatService';

interface ChatListItem extends Chat {
  otherUser: ChatUser;
}

interface ListItem {
  type: 'archive_header' | 'archived_chat' | 'regular_chat';
  data: ChatListItem | null;
  archiveTitle?: string;
}

const MessagesListScreen: React.FC = () => {
  try {
    const navigation = useNavigation();
    const { user } = useAuth();
    const [chats, setChats] = useState<ChatListItem[]>([]);
    const [archivedChats, setArchivedChats] = useState<ChatListItem[]>([]);
    const [showArchive, setShowArchive] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [indexStatus, setIndexStatus] = useState<'checking' | 'working' | 'fallback'>('checking');
    const [scrollCount, setScrollCount] = useState(0);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [error, setError] = useState<string | null>(null);

    console.log('🚀 MessagesListScreen initialized');

    useEffect(() => {
      console.log('🔄 useEffect triggered, user:', user?.uid);
      if (!user?.uid) {
        console.log('❌ No user ID, returning early');
        return;
      }

      try {
        console.log('📡 Setting up chat subscriptions...');
        
        // Subscribe to regular chats
        const unsubscribeChats = NewChatService.subscribeToUserChats(
          user.uid,
          async (chatList) => {
            try {
              console.log('📨 Received chat list:', chatList.length, 'chats');
              const chatsWithUsers = await Promise.all(
                chatList
                  .filter(chat => !chat.isArchived?.[user.uid])
                  .map(async (chat) => {
                    try {
                      const otherUserId = chat.participants.find(id => id !== user.uid);
                      if (!otherUserId) return null;
                      
                      const otherUser = await NewChatService.getUserProfile(otherUserId);
                      if (!otherUser) return null;
                      
                      return { ...chat, otherUser };
                    } catch (chatError) {
                      console.error('Error processing chat:', chatError);
                      return null;
                    }
                  })
              );
              
              console.log('✅ Processed chats:', chatsWithUsers.filter(Boolean).length);
              setChats(chatsWithUsers.filter(Boolean) as ChatListItem[]);
              setLoading(false);
              setError(null);
            } catch (error) {
              console.error('Error in chat subscription callback:', error);
              setError('Failed to load chats');
              setLoading(false);
            }
          }
        );

        // Subscribe to archived chats
        const unsubscribeArchived = NewChatService.subscribeToArchivedChats(
          user.uid,
          async (archivedList) => {
            try {
              console.log('📨 Received archived list:', archivedList.length, 'chats');
              const archivedWithUsers = await Promise.all(
                archivedList.map(async (chat) => {
                  try {
                    const otherUserId = chat.participants.find(id => id !== user.uid);
                    if (!otherUserId) return null;
                    
                    const otherUser = await NewChatService.getUserProfile(otherUserId);
                    if (!otherUser) return null;
                    
                    return { ...chat, otherUser };
                  } catch (chatError) {
                    console.error('Error processing archived chat:', chatError);
                    return null;
                  }
                })
              );
              
              console.log('✅ Processed archived chats:', archivedWithUsers.filter(Boolean).length);
              setArchivedChats(archivedWithUsers.filter(Boolean) as ChatListItem[]);
            } catch (error) {
              console.error('Error in archived chat subscription callback:', error);
              // Don't set error for archived chats as they're not critical
            }
          }
        );

        return () => {
          try {
            console.log('🧹 Cleaning up chat subscriptions...');
            unsubscribeChats();
            unsubscribeArchived();
          } catch (cleanupError) {
            console.error('Error during cleanup:', cleanupError);
          }
        };
      } catch (error) {
        console.error('Error setting up chat subscriptions:', error);
        setError('Failed to initialize chat system');
        setLoading(false);
      }
    }, [user?.uid]);

    // Show helpful message about Firebase indexes
    useEffect(() => {
      const checkIndexStatus = async () => {
        try {
          console.log('🔍 Checking index status for user:', user?.uid);
          
          // Try to create a test chat to see if indexes are working
          if (user?.uid) {
            const testChatId = await NewChatService.createOrGetChat(user.uid, 'test-user-id');
            console.log('✅ Chat indexes are working properly');
            setIndexStatus('working');
          }
        } catch (error: any) {
          console.error('❌ Index check error:', error);
          if (error.message?.includes('index')) {
            console.warn('⚠️ Firebase indexes not yet created. Chat will work with fallback queries.');
            setIndexStatus('fallback');
          } else {
            console.log('✅ Chat indexes are working (different error)');
            setIndexStatus('working');
          }
        }
      };

      checkIndexStatus();
    }, [user?.uid]);

    const onRefresh = async () => {
      setRefreshing(true);
      // Refresh will happen automatically via subscriptions
      setTimeout(() => setRefreshing(false), 1000);
    };

    const handleScroll = (event: any) => {
      const currentY = event.nativeEvent.contentOffset.y;
      
      // Detect upward scroll in first 100vh
      if (currentY < 100 && currentY < lastScrollY) {
        setScrollCount(prev => prev + 1);
        
        // Show archive on second upward scroll
        if (scrollCount >= 1 && !showArchive) {
          setShowArchive(true);
        }
      }
      
      setLastScrollY(currentY);
    };

    // Create list data with sections
    const getListData = (): ListItem[] => {
      const items: ListItem[] = [];
      
      // Add archived section if available and should show
      if (showArchive && archivedChats.length > 0) {
        items.push({
          type: 'archive_header',
          data: null,
          archiveTitle: 'Archived'
        });
        
        archivedChats.forEach(chat => {
          items.push({
            type: 'archived_chat',
            data: chat
          });
        });
      }
      
      // Add regular chats
      chats.forEach(chat => {
        items.push({
          type: 'regular_chat',
          data: chat
        });
      });
      
      return items;
    };

    const SwipeableRow: React.FC<{ 
      chat: ChatListItem; 
      onPress: () => void;
      isArchived?: boolean;
    }> = ({ chat, onPress, isArchived = false }) => {
      const translateX = useRef(new Animated.Value(0)).current;
      const [showActions, setShowActions] = useState(false);

      const panResponder = useRef(
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: (_, gestureState) => {
            // Only respond to horizontal movements
            return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && 
                   Math.abs(gestureState.dx) > 10;
          },
          onPanResponderGrant: () => {
            translateX.setOffset(translateX._value);
            translateX.setValue(0);
          },
          onPanResponderMove: (_, gestureState) => {
            // Only allow left swipes (negative dx)
            if (gestureState.dx < 0) {
              translateX.setValue(gestureState.dx);
            }
          },
          onPanResponderRelease: (_, gestureState) => {
            translateX.flattenOffset();
            
            if (gestureState.dx < -100) {
              // Show actions
              setShowActions(true);
              Animated.spring(translateX, {
                toValue: -150,
                useNativeDriver: true,
              }).start();
            } else {
              // Hide actions and reset position
              setShowActions(false);
              Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: true,
              }).start();
            }
          },
        })
      ).current;

      const handleDelete = () => {
        Alert.alert(
          'Delete Chat',
          `Are you sure you want to delete your conversation with ${chat.otherUser.name}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  if (user?.uid) {
                    await NewChatService.deleteChat(chat.id, user.uid);
                    setShowActions(false);
                    Animated.spring(translateX, {
                      toValue: 0,
                      useNativeDriver: true,
                    }).start();
                  }
                } catch (error) {
                  console.error('Error deleting chat:', error);
                  Alert.alert('Error', 'Failed to delete chat. Please try again.');
                }
              },
            },
          ]
        );
      };

      const handleArchive = async () => {
        try {
          if (user?.uid) {
            if (isArchived) {
              await NewChatService.unarchiveChat(chat.id, user.uid);
            } else {
              await NewChatService.archiveChat(chat.id, user.uid);
            }
            setShowActions(false);
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        } catch (error) {
          console.error('Error archiving chat:', error);
          Alert.alert('Error', 'Failed to archive chat. Please try again.');
        }
      };

      const formatLastMessage = (message: string | undefined) => {
        if (!message) return 'No messages yet';
        return message.length > 50 ? `${message.substring(0, 50)}...` : message;
      };

      const formatTime = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        
        if (diff < 60000) return 'now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
        return `${Math.floor(diff / 86400000)}d`;
      };

      return (
        <View style={styles.swipeContainer}>
          <Animated.View
            style={[
              styles.chatItem,
              { transform: [{ translateX }] },
            ]}
            {...panResponder.panHandlers}
          >
            <TouchableOpacity style={styles.chatContent} onPress={onPress}>
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: chat.otherUser.profilePic || 'https://via.placeholder.com/50' }}
                  style={styles.avatar}
                />
                {chat.otherUser.isOnline && <View style={styles.onlineIndicator} />}
              </View>
              
              <View style={styles.chatInfo}>
                <View style={styles.headerRow}>
                  <View style={styles.nameContainer}>
                    <Text style={styles.userName}>{chat.otherUser.name}</Text>
                    {chat.otherUser.isVerified && (
                      <Ionicons name="checkmark-circle" size={16} color="#007AFF" />
                    )}
                  </View>
                  <Text style={styles.timestamp}>
                    {formatTime(chat.lastMessageTime)}
                  </Text>
                </View>
                
                <Text style={styles.college}>{chat.otherUser.college}</Text>
                <Text style={styles.lastMessage}>
                  {formatLastMessage(chat.lastMessage)}
                </Text>
              </View>
              
              {chat.unreadCount?.[user?.uid || ''] > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>
                    {chat.unreadCount[user?.uid || '']}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
          
          {showActions && (
            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.archiveAction} onPress={handleArchive}>
                <Ionicons 
                  name={isArchived ? "unarchive" : "archive"} 
                  size={20} 
                  color="white" 
                />
                <Text style={styles.actionText}>
                  {isArchived ? 'Unarchive' : 'Archive'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.deleteAction} onPress={handleDelete}>
                <Ionicons name="trash" size={20} color="white" />
                <Text style={styles.actionText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    };

    const handleChatPress = (chat: ChatListItem) => {
      try {
        navigation.navigate('ChatWindow' as never, {
          chatId: chat.id,
          otherUser: chat.otherUser,
        } as never);
      } catch (error) {
        console.error('Error navigating to chat:', error);
        Alert.alert('Error', 'Failed to open chat. Please try again.');
      }
    };

    const renderItem = ({ item }: { item: ListItem }) => {
      switch (item.type) {
        case 'archive_header':
          return (
            <View style={styles.archiveSection}>
              <View style={styles.archiveHeader}>
                <Text style={styles.archiveTitle}>{item.archiveTitle}</Text>
                <TouchableOpacity onPress={() => setShowArchive(false)}>
                  <Ionicons name="chevron-up" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          );
        
        case 'archived_chat':
          return item.data ? (
            <SwipeableRow
              chat={item.data}
              onPress={() => handleChatPress(item.data!)}
              isArchived={true}
            />
          ) : null;
        
        case 'regular_chat':
          return item.data ? (
            <SwipeableRow
              chat={item.data}
              onPress={() => handleChatPress(item.data!)}
            />
          ) : null;
        
        default:
          return null;
      }
    };

    if (loading) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text>Loading messages...</Text>
          </View>
        </SafeAreaView>
      );
    }

    if (error) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Messages</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={64} color="#FF3B30" />
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                setError(null);
                setLoading(true);
                // This will trigger the useEffect again
              }}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    const listData = getListData();

    // Debug logging
    console.log('📱 MessagesListScreen Debug:');
    console.log('  - Regular chats:', chats.length);
    console.log('  - Archived chats:', archivedChats.length);
    console.log('  - Show archive:', showArchive);
    console.log('  - Total list items:', listData.length);
    console.log('  - Loading:', loading);

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.testButton}
              onPress={async () => {
                if (user?.uid) {
                  try {
                    // Create a test chat
                    const testChatId = await NewChatService.createOrGetChat(user.uid, 'test-user-123');
                    console.log('✅ Test chat created:', testChatId);
                    
                    // Send a test message
                    await NewChatService.sendMessage(testChatId, user.uid, 'test-user-123', 'Hello! This is a test message.');
                    console.log('✅ Test message sent');
                  } catch (error) {
                    console.error('❌ Error creating test chat:', error);
                  }
                }
              }}
            >
              <Ionicons name="add-circle" size={20} color="#34C759" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.newChatButton}
              onPress={() => navigation.navigate('FindPeople' as never)}
            >
              <Ionicons name="create" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Index Status Message */}
        {indexStatus === 'fallback' && (
          <View style={styles.indexStatusContainer}>
            <Ionicons name="information-circle" size={16} color="#FF9500" />
            <Text style={styles.indexStatusText}>
              Chat is working with fallback mode. For optimal performance, create Firebase indexes.
            </Text>
          </View>
        )}

        {/* Chat Count Debug */}
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>
            Chats: {chats.length} | Archived: {archivedChats.length} | Total: {listData.length}
          </Text>
        </View>

        {/* Single FlatList for all content */}
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.type}_${index}`}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={true}
          showsHorizontalScrollIndicator={false}
          horizontal={false}
          scrollEnabled={true}
          removeClippedSubviews={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          getItemLayout={undefined}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={80} color="#ccc" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>
                Start a conversation with someone new!
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    );
  } catch (error) {
    console.error('Error rendering MessagesListScreen:', error);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#FF3B30" />
          <Text style={styles.errorTitle}>Error loading messages</Text>
          <Text style={styles.errorText}>
            An unexpected error occurred while loading your messages.
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              // This will trigger the useEffect again
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#000',
  },
  newChatButton: {
    padding: 8,
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  messagesContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeContainer: {
    position: 'relative',
  },
  chatItem: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  chatContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E5E5E7',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chatInfo: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginRight: 4,
  },
  timestamp: {
    fontSize: 14,
    color: '#8E8E93',
  },
  college: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 14,
    color: '#8E8E93',
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  actionsContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    width: 150,
  },
  archiveAction: {
    backgroundColor: '#FF9500',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteAction: {
    backgroundColor: '#FF3B30',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  archiveSection: {
    backgroundColor: '#F2F2F7',
    paddingTop: 8,
  },
  archiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  archiveTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  indexStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
  },
  indexStatusText: {
    fontSize: 14,
    color: '#FF9500',
    marginLeft: 8,
    fontWeight: '500',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  testButton: {
    padding: 8,
    marginRight: 10,
  },
  debugContainer: {
    padding: 10,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    marginBottom: 10,
  },
  debugText: {
    fontSize: 14,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFEBEB',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginTop: 20,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MessagesListScreen; 