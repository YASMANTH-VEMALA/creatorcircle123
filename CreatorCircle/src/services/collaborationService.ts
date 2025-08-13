import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, onSnapshot, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { xpService } from './xpService';

export interface CollaborationRequest {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Timestamp;
  respondedAt?: Timestamp;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp: Timestamp;
  read: boolean;
  isEdited?: boolean;
  editedAt?: Timestamp;
  isDeleted?: boolean;
  deletedAt?: Timestamp;
}

class CollaborationService {
  /**
   * Send a collaboration request
   */
  async sendCollaborationRequest(
    senderId: string,
    receiverId: string,
    message: string
  ): Promise<void> {
    try {
      const requestId = `${senderId}_${receiverId}_${Date.now()}`;
      const requestRef = doc(db, 'collaborationRequests', requestId);

      const request: CollaborationRequest = {
        id: requestId,
        senderId,
        receiverId,
        message,
        status: 'pending',
        createdAt: Timestamp.now(),
      };

      await setDoc(requestRef, request);
      
      // Create notification for receiver using the new notification service
      const { notificationService } = await import('./notificationService');
      await notificationService.createCollaborationRequestNotification(
        senderId,
        receiverId,
        message
      );

      // XP: sender earns XP for sending request
      xpService.awardForCollabSent(senderId).catch(console.error);

      console.log('Collaboration request sent successfully');
    } catch (error) {
      console.error('Error sending collaboration request:', error);
      throw error;
    }
  }

  /**
   * Respond to a collaboration request
   */
  async respondToRequest(
    requestId: string,
    response: 'accepted' | 'rejected'
  ): Promise<void> {
    try {
      const requestRef = doc(db, 'collaborationRequests', requestId);
      const requestDoc = await getDoc(requestRef);

      if (!requestDoc.exists()) {
        throw new Error('Request not found');
      }

      const request = requestDoc.data() as CollaborationRequest;

      // Update request status
      await updateDoc(requestRef, {
        status: response,
        respondedAt: Timestamp.now(),
      });

      // Create notification for sender using the new notification service
      const { notificationService } = await import('./notificationService');
      
      if (response === 'accepted') {
        await notificationService.createRequestAcceptedNotification(
          request.receiverId,
          request.senderId
        );
        // XP: both users gain XP on acceptance
        xpService.awardForCollabAccepted(request.senderId).catch(console.error);
        xpService.awardForCollabAccepted(request.receiverId).catch(console.error);
      } else {
        await notificationService.createRequestRejectedNotification(
          request.receiverId,
          request.senderId
        );
      }

      console.log(`Request ${response} successfully`);
    } catch (error) {
      console.error('Error responding to request:', error);
      throw error;
    }
  }

  /**
   * Get pending requests for a user
   */
  listenToPendingRequests(
    userId: string,
    onRequestsUpdate: (requests: CollaborationRequest[]) => void
  ): () => void {
    try {
      const q = query(
        collection(db, 'collaborationRequests'),
        where('receiverId', '==', userId),
        where('status', '==', 'pending')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const requests: CollaborationRequest[] = [];
        snapshot.forEach((doc) => {
          requests.push(doc.data() as CollaborationRequest);
        });

        // Sort by creation time (newest first) with safe timestamp handling
        requests.sort((a, b) => {
          const getTimestamp = (timestamp: any) => {
            if (!timestamp) return 0;
            if (timestamp && typeof timestamp.toMillis === 'function') {
              return timestamp.toMillis();
            }
            if (timestamp && typeof timestamp.toDate === 'function') {
              return timestamp.toDate().getTime();
            }
            if (timestamp instanceof Date) {
              return timestamp.getTime();
            }
            if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
              return timestamp.seconds * 1000;
            }
            return 0;
          };
          
          return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
        });
        onRequestsUpdate(requests);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error listening to pending requests:', error);
      return () => {};
    }
  }

  /**
   * Get accepted collaborations for a user
   */
  listenToAcceptedCollaborations(
    userId: string,
    onCollaborationsUpdate: (collaborations: CollaborationRequest[]) => void
  ): () => void {
    try {
      const q = query(
        collection(db, 'collaborationRequests'),
        where('status', '==', 'accepted'),
        where('senderId', '==', userId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const collaborations: CollaborationRequest[] = [];
        snapshot.forEach((doc) => {
          collaborations.push(doc.data() as CollaborationRequest);
        });

        onCollaborationsUpdate(collaborations);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error listening to accepted collaborations:', error);
      return () => {};
    }
  }

  /**
   * Send a chat message
   */
  async sendChatMessage(
    senderId: string,
    receiverId: string,
    message: string
  ): Promise<void> {
    try {
      console.log('Sending chat message:', { senderId, receiverId, message: message.substring(0, 50) + '...' });
      
      const messageId = `${senderId}_${receiverId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const messageRef = doc(db, 'chatMessages', messageId);

      const chatMessage: ChatMessage = {
        id: messageId,
        senderId,
        receiverId,
        message,
        timestamp: Timestamp.now(),
        read: false,
        isEdited: false,
        isDeleted: false,
      };

      await setDoc(messageRef, chatMessage);
      console.log('Chat message saved to Firestore:', messageId);
        
      // Create notification for receiver
      try {
      await this.createNotification(receiverId, {
        type: 'chat_message',
        title: 'New Message',
        body: message.length > 50 ? message.substring(0, 50) + '...' : message,
        data: { senderId, messageId },
      });
        console.log('Notification created for receiver');
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Don't throw here, as the message was sent successfully
      }

      console.log('Chat message sent successfully');
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  }

  /**
   * Edit an existing chat message (sender only)
   */
  async editChatMessage(messageId: string, editorId: string, newText: string): Promise<void> {
    const ref = doc(db, 'chatMessages', messageId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Message not found');
    const data = snap.data() as ChatMessage;
    if (data.senderId !== editorId) throw new Error('Only the sender can edit this message');
    if (data.isDeleted) throw new Error('Cannot edit a deleted message');
    await updateDoc(ref, {
      message: newText,
      isEdited: true,
      editedAt: serverTimestamp(),
    });
  }

  /**
   * Delete a chat message for both users (soft delete)
   */
  async deleteChatMessage(messageId: string, requesterId: string): Promise<void> {
    const ref = doc(db, 'chatMessages', messageId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as ChatMessage;
    if (data.senderId !== requesterId) throw new Error('Only the sender can delete this message');
    await updateDoc(ref, {
      message: 'This message has been deleted',
      isDeleted: true,
      deletedAt: serverTimestamp(),
    });
  }

  /**
   * Listen to chat messages between two users
   */
  listenToChatMessages(
    userId1: string,
    userId2: string,
    onMessagesUpdate: (messages: ChatMessage[]) => void
  ): () => void {
    try {
      console.log('Setting up chat listener for users:', userId1, userId2);
      
      // Create a query that gets messages in both directions
      const q = query(
        collection(db, 'chatMessages'),
        where('senderId', 'in', [userId1, userId2]),
        where('receiverId', 'in', [userId1, userId2])
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages: ChatMessage[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Only include messages between these two users
          if ((data.senderId === userId1 && data.receiverId === userId2) ||
              (data.senderId === userId2 && data.receiverId === userId1)) {
            messages.push({
              id: doc.id,
              senderId: data.senderId,
              receiverId: data.receiverId,
              message: data.message,
              timestamp: data.timestamp,
              read: data.read || false,
              isEdited: !!data.isEdited,
              editedAt: data.editedAt,
              isDeleted: !!data.isDeleted,
              deletedAt: data.deletedAt,
            } as ChatMessage);
          }
          });

          // Sort by timestamp with safe timestamp handling
          messages.sort((a, b) => {
            const getTimestamp = (timestamp: any) => {
              if (!timestamp) return 0;
              if (timestamp && typeof timestamp.toMillis === 'function') {
                return timestamp.toMillis();
              }
              if (timestamp && typeof timestamp.toDate === 'function') {
                return timestamp.toDate().getTime();
              }
              if (timestamp instanceof Date) {
                return timestamp.getTime();
              }
              if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
                return timestamp.seconds * 1000;
              }
              return 0;
            };
            
            return getTimestamp(a.timestamp) - getTimestamp(b.timestamp);
          });

        console.log('Chat messages updated:', messages.length, 'messages');
          onMessagesUpdate(messages);
      }, (error) => {
        console.error('Error in chat listener:', error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up chat listener:', error);
      return () => {};
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(
    senderId: string,
    receiverId: string
  ): Promise<void> {
    try {
    const q = query(
        collection(db, 'chatMessages'),
        where('senderId', '==', senderId),
        where('receiverId', '==', receiverId),
        where('read', '==', false)
    );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return; // No unread messages to mark
      }

      const updatePromises = snapshot.docs.map((doc) =>
        updateDoc(doc.ref, { read: true, readAt: serverTimestamp() })
      );

      await Promise.all(updatePromises);
      console.log('Messages marked as read');
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  /**
   * Create a notification
   */
  private async createNotification(
    userId: string,
    notification: {
      type: string;
      title: string;
      body: string;
      data?: any;
    }
  ): Promise<void> {
    try {
      const notificationId = `${userId}_${Date.now()}`;
      const notificationRef = doc(db, 'notifications', notificationId);

      await setDoc(notificationRef, {
        id: notificationId,
        userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        read: false,
        createdAt: Timestamp.now(),
        });

      console.log('Notification created successfully');
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  /**
   * Listen to notifications for a user
   */
  listenToNotifications(
    userId: string,
    onNotificationsUpdate: (notifications: any[]) => void
  ): () => void {
    try {
    const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId)
    );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifications: any[] = [];
      snapshot.forEach((doc) => {
          notifications.push(doc.data());
        });

        // Sort by creation time (newest first) with safe timestamp handling
        notifications.sort((a, b) => {
          const getTimestamp = (timestamp: any) => {
            if (!timestamp) return 0;
            if (timestamp && typeof timestamp.toMillis === 'function') {
              return timestamp.toMillis();
            }
            if (timestamp && typeof timestamp.toDate === 'function') {
              return timestamp.toDate().getTime();
            }
            if (timestamp instanceof Date) {
              return timestamp.getTime();
            }
            if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
              return timestamp.seconds * 1000;
            }
            return 0;
          };
          
          return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
        });
        onNotificationsUpdate(notifications);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error listening to notifications:', error);
      return () => {};
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
      console.log('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Check if two users have collaborated
   */
  async haveUsersCollaborated(userId1: string, userId2: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'collaborationRequests'),
        where('senderId', 'in', [userId1, userId2]),
        where('receiverId', 'in', [userId1, userId2]),
        where('status', '==', 'accepted')
      );
      
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking collaboration status:', error);
      return false;
    }
  }

  /**
   * Get existing collaboration request between two users
   */
  async getExistingRequest(userId1: string, userId2: string): Promise<CollaborationRequest | null> {
    try {
      const q = query(
        collection(db, 'collaborationRequests'),
        where('senderId', 'in', [userId1, userId2]),
        where('receiverId', 'in', [userId1, userId2]),
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as CollaborationRequest;
      }
      return null;
    } catch (error) {
      console.error('Error getting existing request:', error);
      return null;
    }
  }
}

export const collaborationService = new CollaborationService(); 