import { collection, doc, addDoc, updateDoc, query, where, onSnapshot, serverTimestamp, getDocs, getDoc, deleteDoc, writeBatch, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Message, Chat, Collaboration } from '../types';

export class MessagingService {
  // Create a new chat between two users
  static async createChat(userId1: string, userId2: string): Promise<string> {
    const participants = [userId1, userId2].sort();
    const chatData = {
      participants,
      unreadCount: 0,
      createdAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, 'chats'), chatData);
    return docRef.id;
  }

  // Get or create chat between two users
  static async getOrCreateChat(userId1: string, userId2: string): Promise<string> {
    const participants = [userId1, userId2].sort();
    
    // Check if chat already exists
    const q = query(
      collection(db, 'chats'),
      where('participants', '==', participants)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    }
    
    // Create new chat
    return this.createChat(userId1, userId2);
  }

  // Send a message
  static async sendMessage(chatId: string, senderId: string, receiverId: string, content: string, media?: string[]): Promise<void> {
    const messageData = {
      chatId,
      senderId,
      receiverId,
      content,
      media: media || [],
      timestamp: serverTimestamp(),
      isRead: false,
      seenBy: null,
      seenAt: null,
      isEdited: false,
      editedAt: null,
      isDeleted: false,
      deletedAt: null,
      replyToMessageId: null,
    };
    
    await addDoc(collection(db, 'messages'), messageData);
    
    // Update chat's last message
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessage: content,
      lastMessageTime: serverTimestamp(),
    });
  }

  // Subscribe to messages in a chat
  static subscribeToMessages(chatId: string, callback: (messages: Message[]) => void) {
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId)
    );
    
    return onSnapshot(q, (snapshot) => {
      const messages: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          senderId: data.senderId,
          receiverId: data.receiverId,
          content: data.content,
          media: data.media || [],
          timestamp: data.timestamp?.toDate() || new Date(),
          isRead: data.isRead,
          seenBy: data.seenBy,
          seenAt: data.seenAt?.toDate(),
          isEdited: data.isEdited || false,
          editedAt: data.editedAt?.toDate(),
          isDeleted: data.isDeleted || false,
          deletedAt: data.deletedAt?.toDate(),
          replyToMessageId: data.replyToMessageId,
        });
      });
      
      // Sort messages by timestamp in JavaScript instead of Firestore
      messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      callback(messages);
    });
  }

  // Subscribe to user's chats
  static subscribeToUserChats(userId: string, callback: (chats: Chat[]) => void) {
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId)
    );
    
    return onSnapshot(q, (snapshot) => {
      const chats: Chat[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        chats.push({
          id: doc.id,
          participants: data.participants,
          lastMessage: data.lastMessage,
          lastMessageTime: data.lastMessageTime?.toDate(),
          unreadCount: data.unreadCount || 0,
        });
      });
      
      // Sort chats by last message time in JavaScript instead of Firestore
      chats.sort((a, b) => {
        if (!a.lastMessageTime && !b.lastMessageTime) return 0;
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
      });
      
      callback(chats);
    });
  }

  // Mark messages as read - simplified to avoid complex indexes
  static async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    try {
      // First get all messages for this chat
      const q = query(
        collection(db, 'messages'),
        where('chatId', '==', chatId)
      );
      
      const querySnapshot = await getDocs(q);
      const updatePromises = querySnapshot.docs
        .filter(doc => {
          const data = doc.data();
          return data.receiverId === userId && !data.isRead;
        })
        .map((doc) => updateDoc(doc.ref, { isRead: true }));
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  // Clear all messages in a chat
  static async clearChat(chatId: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Get all messages in the chat
      const q = query(
        collection(db, 'messages'),
        where('chatId', '==', chatId)
      );
      
      const querySnapshot = await getDocs(q);
      
      // Delete all messages
      querySnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Update chat to clear last message
      const chatRef = doc(db, 'chats', chatId);
      batch.update(chatRef, {
        lastMessage: '',
        lastMessageTime: null,
        unreadCount: 0,
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error clearing chat:', error);
      throw error;
    }
  }

  // Block a user
  static async blockUser(blockerId: string, blockedUserId: string): Promise<void> {
    try {
      const blockData = {
        blockerId,
        blockedUserId,
        timestamp: serverTimestamp(),
      };
      
      await addDoc(collection(db, 'blocks'), blockData);
    } catch (error) {
      console.error('Error blocking user:', error);
      throw error;
    }
  }

  // Check if a user is blocked
  static async isUserBlocked(userId1: string, userId2: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'blocks'),
        where('blockerId', '==', userId1),
        where('blockedUserId', '==', userId2)
      );
      
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking if user is blocked:', error);
      return false;
    }
  }

  // Mute a chat
  static async muteChat(chatId: string, userId: string): Promise<void> {
    try {
      const muteData = {
        chatId,
        userId,
        timestamp: serverTimestamp(),
      };
      
      await addDoc(collection(db, 'mutedChats'), muteData);
    } catch (error) {
      console.error('Error muting chat:', error);
      throw error;
    }
  }

  // Unmute a chat
  static async unmuteChat(chatId: string, userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'mutedChats'),
        where('chatId', '==', chatId),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error unmuting chat:', error);
      throw error;
    }
  }

  // Check if a chat is muted
  static async isChatMuted(chatId: string, userId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'mutedChats'),
        where('chatId', '==', chatId),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking if chat is muted:', error);
      return false;
    }
  }

  // Report a user
  static async reportUser(reporterId: string, reportedUserId: string, reason: string): Promise<void> {
    try {
      const reportData = {
        reporterId,
        reportedUserId,
        reason,
        timestamp: serverTimestamp(),
      };
      
      await addDoc(collection(db, 'reports'), reportData);
    } catch (error) {
      console.error('Error reporting user:', error);
      throw error;
    }
  }

  // Check if users can chat (have collaborated)
  static async canUsersChat(userId1: string, userId2: string): Promise<boolean> {
    try {
      // Check both directions separately to avoid complex index requirements
      const q1 = query(
        collection(db, 'collaborations'),
        where('requesterId', '==', userId1),
        where('receiverId', '==', userId2),
        where('status', '==', 'accepted')
      );
      
      const q2 = query(
        collection(db, 'collaborations'),
        where('requesterId', '==', userId2),
        where('receiverId', '==', userId1),
        where('status', '==', 'accepted')
      );
      
      const [querySnapshot1, querySnapshot2] = await Promise.all([
        getDocs(q1),
        getDocs(q2)
      ]);
      
      return !querySnapshot1.empty || !querySnapshot2.empty;
    } catch (error) {
      console.error('Error checking if users can chat:', error);
      return false;
    }
  }

  // Get user profile for chat
  static async getUserProfile(userId: string) {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  }

  // Search messages in a chat
  static async searchMessages(chatId: string, query: string): Promise<Message[]> {
    try {
      const q = query(
        collection(db, 'messages'),
        where('chatId', '==', chatId)
      );
      
      const querySnapshot = await getDocs(q);
      const messages: Message[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.content.toLowerCase().includes(query.toLowerCase())) {
          messages.push({
            id: doc.id,
            senderId: data.senderId,
            receiverId: data.receiverId,
            content: data.content,
            media: data.media || [],
            timestamp: data.timestamp?.toDate() || new Date(),
            isRead: data.isRead,
          });
        }
      });
      
      return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  }

  // Get shared media in a chat
  static async getSharedMedia(chatId: string): Promise<string[]> {
    try {
      const q = query(
        collection(db, 'messages'),
        where('chatId', '==', chatId)
      );
      
      const querySnapshot = await getDocs(q);
      const media: string[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.media && data.media.length > 0) {
          media.push(...data.media);
        }
      });
      
      return media;
    } catch (error) {
      console.error('Error getting shared media:', error);
      return [];
    }
  }

  // Save chat settings for a specific chat
  static async saveChatSettings(
    userId: string, 
    chatId: string, 
    settings: {
      theme: string;
      isMuted: boolean;
      isBlocked: boolean;
    }
  ): Promise<void> {
    try {
      const settingsRef = doc(db, 'chatSettings', `${userId}_${chatId}`);
      await setDoc(settingsRef, {
        userId,
        chatId,
        theme: settings.theme,
        isMuted: settings.isMuted,
        isBlocked: settings.isBlocked,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Chat settings saved successfully');
    } catch (error) {
      console.error('❌ Error saving chat settings:', error);
      throw error;
    }
  }

  // Load chat settings for a specific chat
  static async loadChatSettings(userId: string, chatId: string): Promise<{
    theme: string;
    isMuted: boolean;
    isBlocked: boolean;
  } | null> {
    try {
      const settingsRef = doc(db, 'chatSettings', `${userId}_${chatId}`);
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        return {
          theme: data.theme || 'default',
          isMuted: data.isMuted || false,
          isBlocked: data.isBlocked || false
        };
      }
      
      // Return default settings if none exist
      return {
        theme: 'default',
        isMuted: false,
        isBlocked: false
      };
    } catch (error) {
      console.error('❌ Error loading chat settings:', error);
      // Return default settings on error
      return {
        theme: 'default',
        isMuted: false,
        isBlocked: false
      };
    }
  }

  // Subscribe to chat settings changes
  static subscribeToChatSettings(
    userId: string, 
    chatId: string, 
    callback: (settings: {
      theme: string;
      isMuted: boolean;
      isBlocked: boolean;
    }) => void
  ): () => void {
    try {
      const settingsRef = doc(db, 'chatSettings', `${userId}_${chatId}`);
      
      return onSnapshot(settingsRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          callback({
            theme: data.theme || 'default',
            isMuted: data.isMuted || false,
            isBlocked: data.isBlocked || false
          });
        } else {
          // Return default settings if document doesn't exist
          callback({
            theme: 'default',
            isMuted: false,
            isBlocked: false
          });
        }
      });
    } catch (error) {
      console.error('❌ Error subscribing to chat settings:', error);
      // Return default settings on error
      callback({
        theme: 'default',
        isMuted: false,
        isBlocked: false
      });
      return () => {};
    }
  }

  // Update user's online status
  static async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isOnline,
        lastSeen: serverTimestamp()
      });
      console.log(`✅ User ${userId} online status updated: ${isOnline}`);
    } catch (error) {
      console.error('❌ Error updating online status:', error);
      throw error;
    }
  }

  // Subscribe to user's online status
  static subscribeToUserStatus(
    userId: string, 
    callback: (status: { isOnline: boolean; lastSeen: Date | null }) => void
  ): () => void {
    try {
      const userRef = doc(db, 'users', userId);
      
      return onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          callback({
            isOnline: data.isOnline || false,
            lastSeen: data.lastSeen?.toDate() || null
          });
        } else {
          callback({
            isOnline: false,
            lastSeen: null
          });
        }
      });
    } catch (error) {
      console.error('❌ Error subscribing to user status:', error);
      callback({
        isOnline: false,
        lastSeen: null
      });
      return () => {};
    }
  }

  // Update message seen status
  static async markMessageAsSeen(messageId: string, seenBy: string): Promise<void> {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        seenBy: seenBy,
        seenAt: serverTimestamp()
      });
      console.log(`✅ Message ${messageId} marked as seen by ${seenBy}`);
    } catch (error) {
      console.error('❌ Error marking message as seen:', error);
      throw error;
    }
  }

  // Edit a message
  static async editMessage(messageId: string, newContent: string): Promise<void> {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        content: newContent,
        isEdited: true,
        editedAt: serverTimestamp()
      });
      console.log(`✅ Message ${messageId} edited successfully`);
    } catch (error) {
      console.error('❌ Error editing message:', error);
      throw error;
    }
  }

  // Delete a message
  static async deleteMessage(messageId: string): Promise<void> {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        content: 'This message was deleted',
        isDeleted: true,
        deletedAt: serverTimestamp()
      });
      console.log(`✅ Message ${messageId} deleted successfully`);
    } catch (error) {
      console.error('❌ Error deleting message:', error);
      throw error;
    }
  }

  // Reply to a message
  static async replyToMessage(
    chatId: string, 
    senderId: string, 
    receiverId: string, 
    content: string, 
    replyToMessageId: string
  ): Promise<void> {
    try {
      const messageData = {
        chatId,
        senderId,
        receiverId,
        content,
        replyToMessageId,
        timestamp: serverTimestamp(),
        isRead: false,
      };
      
      await addDoc(collection(db, 'messages'), messageData);
      
      // Update chat's last message
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        lastMessage: content,
        lastMessageTime: serverTimestamp(),
      });
      
      console.log(`✅ Reply message sent successfully`);
    } catch (error) {
      console.error('❌ Error sending reply message:', error);
      throw error;
    }
  }

  // Get typing status for a chat
  static subscribeToTypingStatus(
    chatId: string,
    callback: (typingUsers: { [userId: string]: boolean }) => void
  ): () => void {
    try {
      const typingRef = doc(db, 'typingStatus', chatId);
      
      return onSnapshot(typingRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          callback(data.typingUsers || {});
        } else {
          callback({});
        }
      });
    } catch (error) {
      console.error('❌ Error subscribing to typing status:', error);
      callback({});
      return () => {};
    }
  }

  // Update typing status
  static async updateTypingStatus(chatId: string, userId: string, isTyping: boolean): Promise<void> {
    try {
      const typingRef = doc(db, 'typingStatus', chatId);
      await setDoc(typingRef, {
        typingUsers: {
          [userId]: isTyping
        }
      }, { merge: true });
    } catch (error) {
      console.error('❌ Error updating typing status:', error);
      throw error;
    }
  }
} 