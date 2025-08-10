import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  updateDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserService } from './userService';

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'collab_request' | 'request_accepted' | 'request_rejected' | 'report_warning';
  senderId: string;
  senderName: string;
  senderProfilePic?: string;
  senderVerified: boolean;
  relatedPostId?: string;
  commentText?: string;
  timestamp: Timestamp;
  read: boolean;
  message?: string;
}

class NotificationService {
  private async sendExpoPush(pushToken: string, title: string, body: string, data?: any) {
    try {
      const payload = [{
        to: pushToken,
        sound: 'default',
        title,
        body,
        data: data || {},
        priority: 'high',
      }];

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Error sending Expo push:', error);
    }
  }

  /**
   * Create a notification
   */
  async createNotification(
    receiverId: string,
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'>
  ): Promise<void> {
    try {
      const notificationId = `${receiverId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const notificationRef = doc(db, 'users', receiverId, 'notifications', notificationId);

      await setDoc(notificationRef, {
        ...notification,
        id: notificationId,
        timestamp: serverTimestamp(),
        read: false,
      });

      // Attempt device push using Expo if pushToken is available
      const receiverProfile = await UserService.getUserProfile(receiverId);
      if (receiverProfile?.pushToken) {
        const titleMap: Record<Notification['type'], string> = {
          like: 'New Like',
          comment: 'New Comment',
          collab_request: 'Collaboration Request',
          request_accepted: 'Request Accepted',
          request_rejected: 'Request Rejected',
          report_warning: 'Report Warning',
        };
        const title = titleMap[notification.type] || 'Notification';
        const body = notification.message || `${notification.senderName} sent you a notification`;
        await this.sendExpoPush(receiverProfile.pushToken, title, body, {
          type: notification.type,
          senderId: notification.senderId,
          relatedPostId: notification.relatedPostId,
        });
      }

      console.log('Notification created successfully');
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  /**
   * Listen to user's notifications
   */
  listenToNotifications(
    userId: string,
    onNotificationsUpdate: (notifications: Notification[]) => void
  ): () => void {
    try {
      const q = query(
        collection(db, 'users', userId, 'notifications'),
        orderBy('timestamp', 'desc'),
        limit(30)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifications: Notification[] = [];
        snapshot.forEach((doc) => {
          notifications.push({ id: doc.id, ...doc.data() } as Notification);
        });

        // Sort by timestamp (newest first) with safe timestamp handling
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
          
          return getTimestamp(b.timestamp) - getTimestamp(a.timestamp);
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
  async markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
      console.log('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'users', userId, 'notifications'),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await onSnapshot(q, (snapshot) => {
        const updatePromises = snapshot.docs.map((doc) =>
          updateDoc(doc.ref, { read: true })
        );
        return Promise.all(updatePromises);
      });

      console.log('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
      await deleteDoc(notificationRef);
      console.log('Notification deleted successfully');
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'users', userId, 'notifications'),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await onSnapshot(q, (snapshot) => {
        const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
        return Promise.all(deletePromises);
      });

      console.log('All notifications cleared');
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'users', userId, 'notifications'),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await onSnapshot(q, (snapshot) => {
        return snapshot.docs.filter(doc => !doc.data().read).length;
      });

      return snapshot;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Create like notification
   */
  async createLikeNotification(
    senderId: string,
    receiverId: string,
    postId: string
  ): Promise<void> {
    try {
      const senderProfile = await UserService.getUserProfile(senderId);
      
      await this.createNotification(receiverId, {
        type: 'like',
        senderId,
        senderName: senderProfile.name,
        senderProfilePic: senderProfile.profilePhotoUrl,
        senderVerified: senderProfile.verified || false,
        relatedPostId: postId,
        message: `${senderProfile.name} liked your post.`
      });
    } catch (error) {
      console.error('Error creating like notification:', error);
    }
  }

  /**
   * Create comment notification
   */
  async createCommentNotification(
    senderId: string,
    receiverId: string,
    postId: string,
    commentText: string
  ): Promise<void> {
    try {
      const senderProfile = await UserService.getUserProfile(senderId);
      const shortComment = commentText.length > 50 ? commentText.substring(0, 50) + '...' : commentText;
      
      await this.createNotification(receiverId, {
        type: 'comment',
        senderId,
        senderName: senderProfile.name,
        senderProfilePic: senderProfile.profilePhotoUrl,
        senderVerified: senderProfile.verified || false,
        relatedPostId: postId,
        commentText: shortComment,
        message: `${senderProfile.name} commented: '${shortComment}' on your post.`
      });
    } catch (error) {
      console.error('Error creating comment notification:', error);
    }
  }

  /**
   * Create collaboration request notification
   */
  async createCollaborationRequestNotification(
    senderId: string,
    receiverId: string,
    message: string
  ): Promise<void> {
    try {
      const senderProfile = await UserService.getUserProfile(senderId);
      
      await this.createNotification(receiverId, {
        type: 'collab_request',
        senderId,
        senderName: senderProfile.name,
        senderProfilePic: senderProfile.profilePhotoUrl,
        senderVerified: senderProfile.verified || false,
        message: `${senderProfile.name} sent you a collaboration request.`
      });
    } catch (error) {
      console.error('Error creating collaboration request notification:', error);
    }
  }

  /**
   * Create request accepted notification
   */
  async createRequestAcceptedNotification(
    senderId: string,
    receiverId: string
  ): Promise<void> {
    try {
      const senderProfile = await UserService.getUserProfile(senderId);
      
      await this.createNotification(receiverId, {
        type: 'request_accepted',
        senderId,
        senderName: senderProfile.name,
        senderProfilePic: senderProfile.profilePhotoUrl,
        senderVerified: senderProfile.verified || false,
        message: `${senderProfile.name} accepted your collaboration request.`
      });
    } catch (error) {
      console.error('Error creating request accepted notification:', error);
    }
  }

  /**
   * Create request rejected notification
   */
  async createRequestRejectedNotification(
    senderId: string,
    receiverId: string
  ): Promise<void> {
    try {
      const senderProfile = await UserService.getUserProfile(senderId);
      
      await this.createNotification(receiverId, {
        type: 'request_rejected',
        senderId,
        senderName: senderProfile.name,
        senderProfilePic: senderProfile.profilePhotoUrl,
        senderVerified: senderProfile.verified || false,
        message: `${senderProfile.name} rejected your collaboration request.`
      });
    } catch (error) {
      console.error('Error creating request rejected notification:', error);
    }
  }

  /**
   * Create report warning notification
   */
  async createReportWarningNotification(
    userId: string,
    postId: string
  ): Promise<void> {
    try {
      await this.createNotification(userId, {
        type: 'report_warning',
        senderId: 'system',
        senderName: 'CreatorCircle',
        senderProfilePic: undefined,
        senderVerified: false,
        relatedPostId: postId,
        message: 'Your post has been reported multiple times. Please review it.'
      });
    } catch (error) {
      console.error('Error creating report warning notification:', error);
    }
  }
}

export const notificationService = new NotificationService(); 