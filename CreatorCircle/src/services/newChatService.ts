import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  addDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Types
export interface ChatUser {
  id: string;
  name: string;
  profilePic: string;
  college: string;
  isVerified: boolean;
  isOnline: boolean;
  lastSeen: Timestamp;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: Timestamp;
  isEdited: boolean;
  editedAt?: Timestamp;
  isDeleted: boolean;
  deletedAt?: Timestamp;
  messageType: 'text' | 'image' | 'video' | 'file';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: Timestamp;
  lastSenderId?: string;
  isArchived: { [userId: string]: boolean };
  isDeleted: { [userId: string]: boolean };
  unreadCount: { [userId: string]: number };
  typingUsers: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ChatTheme {
  id: string;
  backgroundColor: string;
  primaryColor: string;
  textColor: string;
  bubbleColor: string;
  bubbleTextColor: string;
  name: string;
}

export class NewChatService {
  // Generate chat ID from two user IDs
  private static generateChatId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_');
  }

  // Create or get existing chat
  static async createOrGetChat(userId1: string, userId2: string): Promise<string> {
    try {
      const chatId = this.generateChatId(userId1, userId2);
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);

      if (!chatDoc.exists()) {
        // Create new chat
        const newChat: Chat = {
          id: chatId,
          participants: [userId1, userId2],
          isArchived: { [userId1]: false, [userId2]: false },
          isDeleted: { [userId1]: false, [userId2]: false },
          unreadCount: { [userId1]: 0, [userId2]: 0 },
          typingUsers: [],
          createdAt: serverTimestamp() as Timestamp,
          updatedAt: serverTimestamp() as Timestamp,
        };

        await setDoc(chatRef, newChat);
        console.log('✅ New chat created:', chatId);
      }

      return chatId;
    } catch (error) {
      console.error('❌ Error creating/getting chat:', error);
      throw error;
    }
  }

  // Send message
  static async sendMessage(
    chatId: string,
    senderId: string,
    receiverId: string,
    text: string,
    messageType: 'text' | 'image' | 'video' | 'file' = 'text',
    mediaUrl?: string,
    fileName?: string,
    fileSize?: number
  ): Promise<string> {
    try {
      console.log('🔍 Debug: sendMessage called with:', {
        chatId,
        senderId,
        receiverId,
        text,
        messageType,
        mediaUrl,
        fileName,
        fileSize
      });

      const messageRef = doc(collection(db, 'chats', chatId, 'messages'));
      
      // Create message object with only defined fields
      const messageData: any = {
        id: messageRef.id,
        chatId,
        senderId,
        receiverId,
        text,
        timestamp: serverTimestamp() as Timestamp,
        isEdited: false,
        isDeleted: false,
        messageType,
      };

      // Only add mediaUrl if it's defined
      if (mediaUrl !== undefined && mediaUrl !== null) {
        messageData.mediaUrl = mediaUrl;
        console.log('✅ Added mediaUrl:', mediaUrl);
      } else {
        console.log('⚠️ mediaUrl is undefined/null, not adding to message');
      }

      // Only add fileName if it's defined
      if (fileName !== undefined && fileName !== null) {
        messageData.fileName = fileName;
        console.log('✅ Added fileName:', fileName);
      } else {
        console.log('⚠️ fileName is undefined/null, not adding to message');
      }

      // Only add fileSize if it's defined
      if (fileSize !== undefined && fileSize !== null) {
        messageData.fileSize = fileSize;
        console.log('✅ Added fileSize:', fileSize);
      } else {
        console.log('⚠️ fileSize is undefined/null, not adding to message');
      }

      console.log('🔍 Final messageData:', messageData);

      // Use batch for atomic operations
      const batch = writeBatch(db);
      
      // Add message
      batch.set(messageRef, messageData);
      
      // Update chat metadata
      const chatRef = doc(db, 'chats', chatId);
      batch.update(chatRef, {
        lastMessage: messageType === 'text' ? text : `📎 ${fileName || 'Media'}`,
        lastMessageTime: serverTimestamp(),
        lastSenderId: senderId,
        [`unreadCount.${receiverId}`]: 1, // Reset for receiver
        [`unreadCount.${senderId}`]: 0, // Reset for sender
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      console.log('✅ Message sent successfully:', messageRef.id);
      return messageRef.id;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  }

  // Edit message
  static async editMessage(chatId: string, messageId: string, newText: string): Promise<void> {
    try {
      const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
      await updateDoc(messageRef, {
        text: newText,
        isEdited: true,
        editedAt: serverTimestamp(),
      });
      console.log('✅ Message edited:', messageId);
    } catch (error) {
      console.error('❌ Error editing message:', error);
      throw error;
    }
  }

  // Delete message
  static async deleteMessage(chatId: string, messageId: string): Promise<void> {
    try {
      const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
      await updateDoc(messageRef, {
        isDeleted: true,
        deletedAt: serverTimestamp(),
      });
      console.log('✅ Message deleted:', messageId);
    } catch (error) {
      console.error('❌ Error deleting message:', error);
      throw error;
    }
  }

  // Get user's chats
  static subscribeToUserChats(
    userId: string,
    onChatsUpdate: (chats: Chat[]) => void
  ): () => void {
    try {
      // Try with the optimized query first
      const q = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
      );

      return onSnapshot(q, (snapshot) => {
        const chats: Chat[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as Chat;
          // Only include chats that aren't deleted for this user
          if (!data.isDeleted?.[userId]) {
            chats.push({ ...data, id: doc.id });
          }
        });
        onChatsUpdate(chats);
      }, (error) => {
        console.warn('⚠️ Index query failed, using fallback:', error.message);
        
        // Fallback: query without orderBy
        const fallbackQuery = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', userId)
        );

        return onSnapshot(fallbackQuery, (snapshot) => {
          const chats: Chat[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as Chat;
            if (!data.isDeleted?.[userId]) {
              chats.push({ ...data, id: doc.id });
            }
          });
          
          // Client-side sorting as fallback
          chats.sort((a, b) => {
            const timeA = a.updatedAt?.toMillis?.() || 0;
            const timeB = b.updatedAt?.toMillis?.() || 0;
            return timeB - timeA;
          });
          
          onChatsUpdate(chats);
        });
      });
    } catch (error) {
      console.error('❌ Error subscribing to chats:', error);
      
      // Final fallback: simple query
      try {
        const simpleQuery = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', userId)
        );
        
        return onSnapshot(simpleQuery, (snapshot) => {
          const chats: Chat[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as Chat;
            if (!data.isDeleted?.[userId]) {
              chats.push({ ...data, id: doc.id });
            }
          });
          
          // Client-side sorting
          chats.sort((a, b) => {
            const timeA = a.updatedAt?.toMillis?.() || 0;
            const timeB = b.updatedAt?.toMillis?.() || 0;
            return timeB - timeA;
          });
          
          onChatsUpdate(chats);
        });
      } catch (fallbackError) {
        console.error('❌ Fallback query also failed:', fallbackError);
        onChatsUpdate([]);
        return () => {};
      }
    }
  }

  // Get archived chats
  static subscribeToArchivedChats(
    userId: string,
    onChatsUpdate: (chats: Chat[]) => void
  ): () => void {
    try {
      // Try with the optimized query first
      const q = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
      );

      return onSnapshot(q, (snapshot) => {
        const chats: Chat[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as Chat;
          // Only include archived chats that aren't deleted
          if (data.isArchived?.[userId] && !data.isDeleted?.[userId]) {
            chats.push({ ...data, id: doc.id });
          }
        });
        onChatsUpdate(chats);
      }, (error) => {
        console.warn('⚠️ Archived chats index query failed, using fallback:', error.message);
        
        // Fallback: query without orderBy
        const fallbackQuery = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', userId)
        );

        return onSnapshot(fallbackQuery, (snapshot) => {
          const chats: Chat[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as Chat;
            if (data.isArchived?.[userId] && !data.isDeleted?.[userId]) {
              chats.push({ ...data, id: doc.id });
            }
          });
          
          // Client-side sorting as fallback
          chats.sort((a, b) => {
            const timeA = a.updatedAt?.toMillis?.() || 0;
            const timeB = b.updatedAt?.toMillis?.() || 0;
            return timeB - timeA;
          });
          
          onChatsUpdate(chats);
        });
      });
    } catch (error) {
      console.error('❌ Error subscribing to archived chats:', error);
      
      // Final fallback: simple query
      try {
        const simpleQuery = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', userId)
        );
        
        return onSnapshot(simpleQuery, (snapshot) => {
          const chats: Chat[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as Chat;
            if (data.isArchived?.[userId] && !data.isDeleted?.[userId]) {
              chats.push({ ...data, id: doc.id });
            }
          });
          
          // Client-side sorting
          chats.sort((a, b) => {
            const timeA = a.updatedAt?.toMillis?.() || 0;
            const timeB = b.updatedAt?.toMillis?.() || 0;
            return timeB - timeA;
          });
          
          onChatsUpdate(chats);
        });
      } catch (fallbackError) {
        console.error('❌ Fallback archived query also failed:', fallbackError);
        onChatsUpdate([]);
        return () => {};
      }
    }
  }

  // Subscribe to messages in a chat
  static subscribeToMessages(
    chatId: string,
    onMessagesUpdate: (messages: ChatMessage[]) => void
  ): () => void {
    try {
      // Try with the optimized query first
      const q = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('timestamp', 'asc')
      );

      return onSnapshot(q, (snapshot) => {
        const messages: ChatMessage[] = [];
        snapshot.forEach((doc) => {
          messages.push({ ...doc.data(), id: doc.id } as ChatMessage);
        });
        onMessagesUpdate(messages);
      }, (error) => {
        console.warn('⚠️ Messages index query failed, using fallback:', error.message);
        
        // Fallback: simple query without orderBy
        const fallbackQuery = collection(db, 'chats', chatId, 'messages');
        
        return onSnapshot(fallbackQuery, (snapshot) => {
          const messages: ChatMessage[] = [];
          snapshot.forEach((doc) => {
            messages.push({ ...doc.data(), id: doc.id } as ChatMessage);
          });
          
          // Client-side sorting as fallback
          messages.sort((a, b) => {
            const timeA = a.timestamp?.toMillis?.() || 0;
            const timeB = b.timestamp?.toMillis?.() || 0;
            return timeA - timeB;
          });
          
          onMessagesUpdate(messages);
        });
      });
    } catch (error) {
      console.error('❌ Error subscribing to messages:', error);
      
      // Final fallback: simple query
      try {
        const fallbackQuery = collection(db, 'chats', chatId, 'messages');
        
        return onSnapshot(fallbackQuery, (snapshot) => {
          const messages: ChatMessage[] = [];
          snapshot.forEach((doc) => {
            messages.push({ ...doc.data(), id: doc.id } as ChatMessage);
          });
          
          // Client-side sorting
          messages.sort((a, b) => {
            const timeA = a.timestamp?.toMillis?.() || 0;
            const timeB = b.timestamp?.toMillis?.() || 0;
            return timeA - timeB;
          });
          
          onMessagesUpdate(messages);
        });
      } catch (fallbackError) {
        console.error('❌ Fallback messages query also failed:', fallbackError);
        onMessagesUpdate([]);
        return () => {};
      }
    }
  }

  // Archive chat
  static async archiveChat(chatId: string, userId: string): Promise<void> {
    try {
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        [`isArchived.${userId}`]: true,
        updatedAt: serverTimestamp(),
      });
      console.log('✅ Chat archived:', chatId);
    } catch (error) {
      console.error('❌ Error archiving chat:', error);
      throw error;
    }
  }

  // Unarchive chat
  static async unarchiveChat(chatId: string, userId: string): Promise<void> {
    try {
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        [`isArchived.${userId}`]: false,
        updatedAt: serverTimestamp(),
      });
      console.log('✅ Chat unarchived:', chatId);
    } catch (error) {
      console.error('❌ Error unarchiving chat:', error);
      throw error;
    }
  }

  // Delete chat
  static async deleteChat(chatId: string, userId: string): Promise<void> {
    try {
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        [`isDeleted.${userId}`]: true,
        updatedAt: serverTimestamp(),
      });
      console.log('✅ Chat deleted for user:', chatId, userId);
    } catch (error) {
      console.error('❌ Error deleting chat:', error);
      throw error;
    }
  }

  // Clear all messages in chat
  static async clearChat(chatId: string): Promise<void> {
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const snapshot = await getDocs(messagesRef);
      
      const batch = writeBatch(db);
      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Update chat metadata
      const chatRef = doc(db, 'chats', chatId);
      batch.update(chatRef, {
        lastMessage: '',
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      console.log('✅ Chat cleared:', chatId);
    } catch (error) {
      console.error('❌ Error clearing chat:', error);
      throw error;
    }
  }

  // Set typing status
  static async setTyping(chatId: string, userId: string, isTyping: boolean): Promise<void> {
    try {
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);
      
      if (chatDoc.exists()) {
        const data = chatDoc.data() as Chat;
        let typingUsers = data.typingUsers || [];
        
        if (isTyping && !typingUsers.includes(userId)) {
          typingUsers.push(userId);
        } else if (!isTyping) {
          typingUsers = typingUsers.filter(id => id !== userId);
        }
        
        await updateDoc(chatRef, {
          typingUsers,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('❌ Error setting typing status:', error);
    }
  }

  // Mark messages as read
  static async markAsRead(chatId: string, userId: string): Promise<void> {
    try {
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        [`unreadCount.${userId}`]: 0,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('❌ Error marking as read:', error);
    }
  }

  // Get user profile for chat
  static async getUserProfile(userId: string): Promise<ChatUser | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          id: userId,
          name: data.name || 'Unknown User',
          profilePic: data.profilePhotoUrl || '',
          college: data.college || '',
          isVerified: data.verifiedBadge !== 'none',
          isOnline: data.isOnline || false,
          lastSeen: data.lastSeen || serverTimestamp() as Timestamp,
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting user profile:', error);
      return null;
    }
  }

  // Search messages in chat
  static async searchMessages(chatId: string, searchText: string): Promise<ChatMessage[]> {
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const snapshot = await getDocs(messagesRef);
      
      const messages: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const message = { ...doc.data(), id: doc.id } as ChatMessage;
        if (message.text.toLowerCase().includes(searchText.toLowerCase()) && !message.isDeleted) {
          messages.push(message);
        }
      });
      
      return messages.sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());
    } catch (error) {
      console.error('❌ Error searching messages:', error);
      return [];
    }
  }

  // Get shared media
  static async getSharedMedia(chatId: string): Promise<ChatMessage[]> {
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const snapshot = await getDocs(messagesRef);
      
      const mediaMessages: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const message = { ...doc.data(), id: doc.id } as ChatMessage;
        if (message.messageType !== 'text' && !message.isDeleted) {
          mediaMessages.push(message);
        }
      });
      
      return mediaMessages.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
    } catch (error) {
      console.error('❌ Error getting shared media:', error);
      return [];
    }
  }

  // Report user
  static async reportUser(
    reporterId: string,
    reportedUserId: string,
    chatId: string,
    reason: string,
    details: string
  ): Promise<void> {
    try {
      const reportRef = doc(collection(db, 'reports'));
      const report = {
        id: reportRef.id,
        reporterId,
        reportedUserId,
        chatId,
        reason,
        details,
        timestamp: serverTimestamp(),
        status: 'pending',
        type: 'chat_user',
      };

      await setDoc(reportRef, report);
      console.log('✅ User reported:', reportRef.id);
    } catch (error) {
      console.error('❌ Error reporting user:', error);
      throw error;
    }
  }

  // Default chat themes
  static getDefaultThemes(): ChatTheme[] {
    return [
      {
        id: 'default',
        name: 'Default',
        backgroundColor: '#FFFFFF',
        primaryColor: '#007AFF',
        textColor: '#000000',
        bubbleColor: '#007AFF',
        bubbleTextColor: '#FFFFFF',
      },
      {
        id: 'dark',
        name: 'Dark',
        backgroundColor: '#1C1C1E',
        primaryColor: '#0A84FF',
        textColor: '#FFFFFF',
        bubbleColor: '#0A84FF',
        bubbleTextColor: '#FFFFFF',
      },
      {
        id: 'green',
        name: 'Green',
        backgroundColor: '#F0F8F0',
        primaryColor: '#34C759',
        textColor: '#000000',
        bubbleColor: '#34C759',
        bubbleTextColor: '#FFFFFF',
      },
      {
        id: 'purple',
        name: 'Purple',
        backgroundColor: '#F8F0FF',
        primaryColor: '#AF52DE',
        textColor: '#000000',
        bubbleColor: '#AF52DE',
        bubbleTextColor: '#FFFFFF',
      },
      {
        id: 'orange',
        name: 'Orange',
        backgroundColor: '#FFF8F0',
        primaryColor: '#FF9500',
        textColor: '#000000',
        bubbleColor: '#FF9500',
        bubbleTextColor: '#FFFFFF',
      },
    ];
  }
} 