import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Alert, 
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { roomService, Room, RoomMessage, RoomMember } from '../services/roomService';
import { Image as ExpoImage } from 'expo-image';
import { UserService } from '../services/userService';
import { Profile } from '../types';

interface RouteParams {
  roomId: string;
  roomName: string;
}

const RoomChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { roomId, roomName } = route.params as RouteParams;
  const { user } = useAuth();

  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<Profile[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadRoomData();
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [roomId]);

  const loadRoomData = async () => {
    try {
      setLoading(true);
      
      // Subscribe to room updates
      const unsubRoom = roomService.subscribeToRoom(roomId, (roomData) => {
        setRoom(roomData);
        setLoading(false);
      });

      // Subscribe to messages
      const unsubMessages = roomService.subscribeToRoomMessages(roomId, (messagesData) => {
        setMessages(messagesData);
      });

      // Subscribe to members
      const unsubMembers = roomService.subscribeToRoomMembers(roomId, (membersData) => {
        setMembers(membersData);
        loadMemberProfiles(membersData);
      });

      return () => {
        unsubRoom();
        unsubMessages();
        unsubMembers();
      };
    } catch (error) {
      console.error('Error loading room data:', error);
      setLoading(false);
    }
  };

  const loadMemberProfiles = async (membersData: RoomMember[]) => {
    try {
      const profiles = await Promise.all(
        membersData.map(member => UserService.getUserProfile(member.uid))
      );
      setMemberProfiles(profiles.filter(Boolean) as Profile[]);
    } catch (error) {
      console.error('Error loading member profiles:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadRoomData();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.uid) return;

    try {
      setSending(true);
      await roomService.sendMessage(roomId, user.uid, newMessage.trim());
      setNewMessage('');
      setIsTyping(false);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', error?.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (!user?.uid) return;
    
    setIsTyping(true);
    roomService.setTypingStatus(roomId, user.uid, true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    const timeoutId = setTimeout(() => {
      setIsTyping(false);
      roomService.setTypingStatus(roomId, user!.uid, false);
    }, 3000);
    
    typingTimeoutRef.current = timeoutId;
  };

  const handleLeaveRoom = async () => {
    if (!user?.uid) return;

    Alert.alert(
      'Leave Room',
      'Are you sure you want to leave this room? You can rejoin later if it\'s public.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await roomService.leaveRoom(roomId, user.uid);
              navigation.goBack();
            } catch (error: any) {
              console.error('Error leaving room:', error);
              Alert.alert('Error', error?.message || 'Failed to leave room. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteRoom = async () => {
    if (!user?.uid || !room) return;

    // Check if user is admin
    if (!room.admins.includes(user.uid)) {
      Alert.alert('Permission Denied', 'Only room admins can delete rooms.');
      return;
    }

    Alert.alert(
      'Delete Room',
      'Are you sure you want to delete this room? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await roomService.deleteRoom(roomId);
              navigation.goBack();
            } catch (error: any) {
              console.error('Error deleting room:', error);
              Alert.alert('Error', error?.message || 'Failed to delete room. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderMessage = ({ item }: { item: RoomMessage }) => {
    const isOwnMessage = item.senderId === user?.uid;
    const senderProfile = memberProfiles.find(p => p.uid === item.senderId);
    const isAdmin = room?.admins.includes(item.senderId);

    return (
      <View style={[styles.messageContainer, isOwnMessage && styles.ownMessage]}>
        {!isOwnMessage && (
          <View style={styles.messageHeader}>
            <ExpoImage
              source={{ 
                uri: senderProfile?.profilePhotoUrl || 'https://via.placeholder.com/40'
              }}
              style={styles.messageAvatar}
              contentFit="cover"
              cachePolicy="disk"
            />
            <View style={styles.messageInfo}>
              <View style={styles.messageSenderRow}>
                <Text style={styles.messageSender}>
                  {senderProfile?.name || 'Unknown User'}
                </Text>
                {isAdmin && (
                  <View style={styles.adminBadge}>
                    <Ionicons name="shield-checkmark" size={12} color="#fff" />
                    <Text style={styles.adminBadgeText}>Admin</Text>
                  </View>
                )}
              </View>
              <Text style={styles.messageTime}>
                {(() => {
                  try {
                    const timestamp = item.timestamp?.toMillis?.() || item.timestamp;
                    if (timestamp) {
                      return new Date(timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                    }
                    return 'Unknown';
                  } catch (error) {
                    return 'Unknown';
                  }
                })()}
              </Text>
            </View>
          </View>
        )}
        
        <View style={[styles.messageBubble, isOwnMessage && styles.ownMessageBubble]}>
          <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
            {item.text}
          </Text>
        </View>
        
        {isOwnMessage && (
          <Text style={styles.ownMessageTime}>
            {(() => {
              try {
                const timestamp = item.timestamp?.toMillis?.() || item.timestamp;
                if (timestamp) {
                  return new Date(timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                }
                return 'Unknown';
              } catch (error) {
                return 'Unknown';
              }
            })()}
          </Text>
        )}
    </View>
  );
  };

  const renderMember = ({ item }: { item: RoomMember }) => {
    const profile = memberProfiles.find(p => p.uid === item.uid);
    const isAdmin = room?.admins.includes(item.uid);
    const isCurrentUser = item.uid === user?.uid;

    return (
      <View style={styles.memberItem}>
        <ExpoImage
          source={{ 
            uri: profile?.profilePhotoUrl || 'https://via.placeholder.com/40'
          }}
          style={styles.memberAvatar}
          contentFit="cover"
          cachePolicy="disk"
        />
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={[styles.memberName, isCurrentUser && styles.currentUserText]}>
              {profile?.name || 'Unknown User'}
              {isCurrentUser && ' (You)'}
            </Text>
            {isAdmin && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#fff" />
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            )}
          </View>
          <Text style={styles.memberRole}>
            {item.role === 'admin' ? 'Administrator' : 'Member'}
          </Text>
          <Text style={styles.memberJoined}>
            Joined {(() => {
              try {
                const timestamp = item.joinedAt?.toMillis?.() || item.joinedAt;
                if (timestamp) {
                  return new Date(timestamp).toLocaleDateString();
                }
                return 'Unknown';
              } catch (error) {
                return 'Unknown';
              }
            })()}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading room...</Text>
      </SafeAreaView>
    );
  }

  if (!room) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
        <Text style={styles.errorTitle}>Room Not Found</Text>
        <Text style={styles.errorMessage}>
          The room you're looking for doesn't exist or you don't have access to it.
        </Text>
        <TouchableOpacity 
          style={styles.errorButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isExpired = roomService.isRoomExpired(room);
  const isAdmin = room.admins.includes(user?.uid || '');
  const canDelete = isAdmin && room.creatorId === user?.uid;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.roomInfo}
          onPress={() => setShowMembers(!showMembers)}
        >
          <View style={styles.roomHeader}>
            {room.logoUrl ? (
              <ExpoImage 
                source={{ uri: room.logoUrl }} 
                style={styles.roomLogo} 
                contentFit="cover"
                cachePolicy="disk"
              />
            ) : (
              <View style={[styles.roomLogo, styles.roomLogoFallback]}>
                <Text style={styles.roomLogoFallbackText}>
                  {room.name?.charAt(0).toUpperCase() || 'R'}
                </Text>
              </View>
            )}
            <View style={styles.roomDetails}>
              <Text style={styles.roomName}>{room.name}</Text>
              <Text style={styles.roomMeta}>
                {room.membersCount || 0} members
                {room.isPrivate && ' • Private'}
                {room.isTemporary && ' • Temporary'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowMembers(!showMembers)}
          >
            <Ionicons 
              name={showMembers ? "chatbubbles" : "people"} 
              size={24} 
              color="#007AFF" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => {
              Alert.alert(
                'Room Options',
                'Choose an action:',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Leave Room', style: 'destructive' as const, onPress: handleLeaveRoom },
                  ...(canDelete ? [{ text: 'Delete Room', style: 'destructive' as const, onPress: handleDeleteRoom }] : []),
                ]
              );
            }}
          >
            <Ionicons name="ellipsis-vertical" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Expired Warning */}
      {isExpired && (
        <View style={styles.expiredWarning}>
          <Ionicons name="time-outline" size={20} color="#fff" />
          <Text style={styles.expiredWarningText}>
            This room has expired and is read-only
          </Text>
        </View>
      )}

      {/* Content */}
      {showMembers ? (
        // Members List
        <FlatList
          data={members}
          keyExtractor={(item) => item.uid}
          renderItem={renderMember}
          contentContainerStyle={styles.membersList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
          ListHeaderComponent={
            <View style={styles.membersHeader}>
              <Text style={styles.membersTitle}>Room Members</Text>
              <Text style={styles.membersSubtitle}>
                {members.length} member{members.length !== 1 ? 's' : ''}
              </Text>
            </View>
          }
        />
      ) : (
        // Chat Messages
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
              <Text style={styles.emptyMessagesTitle}>No messages yet</Text>
              <Text style={styles.emptyMessagesSubtitle}>
                Be the first to start the conversation!
              </Text>
            </View>
          }
        />
      )}

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>
            {typingUsers.length === 1 
              ? `${typingUsers[0]} is typing...`
              : `${typingUsers.length} people are typing...`
            }
          </Text>
        </View>
      )}

      {/* Message Input */}
      {!isExpired && (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inputContainer}
        >
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={(text) => {
              setNewMessage(text);
              handleTyping();
            }}
            placeholder="Type a message..."
            multiline
            maxLength={1000}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 24,
  },
  errorButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  roomInfo: {
    flex: 1,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  roomLogoFallback: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomLogoFallbackText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 18,
  },
  roomDetails: {
    flex: 1,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  roomMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 4,
  },
  expiredWarning: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  expiredWarningText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 8,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  messageInfo: {
    flex: 1,
  },
  messageSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  adminBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 2,
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
  },
  messageBubble: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ownMessageBubble: {
    backgroundColor: '#007AFF',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#222',
    lineHeight: 22,
  },
  ownMessageText: {
    color: 'white',
  },
  ownMessageTime: {
    fontSize: 10,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  membersList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  membersHeader: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 16,
  },
  membersTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
  },
  membersSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  currentUserText: {
    color: '#007AFF',
  },
  memberRole: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  memberJoined: {
    fontSize: 12,
    color: '#999',
  },
  emptyMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyMessagesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
  },
  emptyMessagesSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  typingIndicator: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  typingText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    maxHeight: 100,
    backgroundColor: '#fafafa',
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
});

export default RoomChatScreen; 