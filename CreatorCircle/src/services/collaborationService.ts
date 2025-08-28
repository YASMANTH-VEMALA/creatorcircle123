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

// Chat-related interfaces removed - will be re-implemented later

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

  // Chat-related methods removed - will be re-implemented later

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
   * Get comprehensive collaboration status between two users
   */
  async getCollaborationStatus(userId1: string, userId2: string): Promise<{
    status: 'none' | 'pending' | 'accepted' | 'rejected';
    requestId?: string;
    isSender?: boolean;
    message?: string;
  }> {
    try {
      const q = query(
        collection(db, 'collaborationRequests'),
        where('senderId', 'in', [userId1, userId2]),
        where('receiverId', 'in', [userId1, userId2])
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return { status: 'none' };
      }
      
      const request = snapshot.docs[0].data() as CollaborationRequest;
      const isSender = request.senderId === userId1;
      
      return {
        status: request.status,
        requestId: request.id,
        isSender,
        message: request.message
      };
    } catch (error) {
      console.error('Error getting collaboration status:', error);
      return { status: 'none' };
    }
  }

  /**
   * Check if two users have collaborated (accepted status)
   */
  async haveUsersCollaborated(userId1: string, userId2: string): Promise<boolean> {
    try {
      const status = await this.getCollaborationStatus(userId1, userId2);
      return status.status === 'accepted';
    } catch (error) {
      console.error('Error checking collaboration status:', error);
      return false;
    }
  }

  /**
   * Get existing collaboration request between two users (pending only)
   */
  async getExistingRequest(userId1: string, userId2: string): Promise<CollaborationRequest | null> {
    try {
      const status = await this.getCollaborationStatus(userId1, userId2);
      if (status.status === 'pending' && status.requestId) {
        const requestRef = doc(db, 'collaborationRequests', status.requestId);
        const requestDoc = await getDoc(requestRef);
        if (requestDoc.exists()) {
          return { id: requestDoc.id, ...requestDoc.data() } as CollaborationRequest;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting existing request:', error);
      return null;
    }
  }

  /**
   * Get all collaboration statuses for multiple users at once
   */
  async getCollaborationStatusesForUsers(
    currentUserId: string, 
    targetUserIds: string[]
  ): Promise<{[userId: string]: {
    status: 'none' | 'pending' | 'accepted' | 'rejected';
    requestId?: string;
    isSender?: boolean;
    message?: string;
  }}> {
    try {
      const statuses: {[userId: string]: any} = {};
      
      // Process in batches to avoid overwhelming Firestore
      const batchSize = 10;
      for (let i = 0; i < targetUserIds.length; i += batchSize) {
        const batch = targetUserIds.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (targetUserId) => {
          if (targetUserId === currentUserId) {
            statuses[targetUserId] = { status: 'none' };
            return;
          }
          
          const status = await this.getCollaborationStatus(currentUserId, targetUserId);
          statuses[targetUserId] = status;
        });
        
        await Promise.all(batchPromises);
      }
      
      return statuses;
    } catch (error) {
      console.error('Error getting collaboration statuses for users:', error);
      return {};
    }
  }
}

export const collaborationService = new CollaborationService(); 