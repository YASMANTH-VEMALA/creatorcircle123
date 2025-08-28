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
  serverTimestamp,
  writeBatch 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserService } from './userService';

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'comment_reply' | 'comment_like' | 'collab_request' | 'request_accepted' | 'request_rejected' | 'report_warning' | 'follow' | 'spotlight_shared';
  senderId: string;
  senderName: string;
  senderProfilePic?: string;
  senderVerified: boolean;
  relatedPostId?: string;
  relatedCommentId?: string;
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
          comment_reply: 'New Reply',
          comment_like: 'Comment Liked',
          collab_request: 'Collaboration Request',
          request_accepted: 'Request Accepted',
          request_rejected: 'Request Rejected',
          report_warning: 'Report Warning',
          follow: 'New Follower',
          spotlight_shared: 'Spotlight Shared',
        };
        const title = titleMap[notification.type] || 'Notification';
        const body = notification.message || `${notification.senderName} sent you a notification`;
        await this.sendExpoPush(receiverProfile.pushToken, title, body, {
          type: notification.type,
          senderId: notification.senderId,
          relatedPostId: notification.relatedPostId,
          relatedCommentId: notification.relatedCommentId,
        });
      }

      console.log('Notification created successfully');
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  /**
   * Listen to user's notifications with performance optimizations
   */
  listenToNotifications(
    userId: string,
    onNotificationsUpdate: (notifications: Notification[]) => void
  ): () => void {
    try {
      // Use a more efficient query without orderBy to avoid index requirements
      const q = query(
        collection(db, 'users', userId, 'notifications'),
        limit(50) // Increased limit for better UX
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifications: Notification[] = [];
        
        // Process notifications in batches for better performance
        const batchSize = 10;
        const processBatch = (docs: any[], startIndex: number) => {
          const endIndex = Math.min(startIndex + batchSize, docs.length);
          const batch = docs.slice(startIndex, endIndex);
          
          batch.forEach((doc) => {
            try {
              const data = doc.data();
              if (data) {
                notifications.push({ id: doc.id, ...data } as Notification);
              }
            } catch (error) {
              console.warn('Error processing notification doc:', error);
            }
          });
          
          // Process next batch if available
          if (endIndex < docs.length) {
            setTimeout(() => processBatch(docs, endIndex), 0);
          } else {
            // All batches processed, now sort and update
            this.sortAndUpdateNotifications(notifications, onNotificationsUpdate);
          }
        };
        
        // Start processing with first batch
        const docs = snapshot.docs;
        if (docs.length > 0) {
          processBatch(docs, 0);
        } else {
          onNotificationsUpdate([]);
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error listening to notifications:', error);
      return () => {};
    }
  }

  /**
   * Sort notifications and update UI efficiently
   */
  private sortAndUpdateNotifications(
    notifications: Notification[], 
    onNotificationsUpdate: (notifications: Notification[]) => void
  ) {
    try {
      // Use a more efficient sorting approach
      const sortedNotifications = notifications.sort((a, b) => {
        const getTimestamp = (timestamp: any): number => {
          if (!timestamp) return 0;
          
          // Handle Firestore Timestamp objects
          if (timestamp && typeof timestamp.toMillis === 'function') {
            return timestamp.toMillis();
          }
          if (timestamp && typeof timestamp.toDate === 'function') {
            return timestamp.toDate().getTime();
          }
          
          // Handle Date objects
          if (timestamp instanceof Date) {
            return timestamp.getTime();
          }
          
          // Handle Firestore timestamp objects
          if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
            return timestamp.seconds * 1000;
          }
          
          // Handle numeric timestamps
          if (typeof timestamp === 'number') {
            return timestamp;
          }
          
          return 0;
        };
        
        const timeA = getTimestamp(a.timestamp);
        const timeB = getTimestamp(b.timestamp);
        
        return timeB - timeA; // Newest first
      });

      // Update UI on next tick to prevent blocking
      requestAnimationFrame(() => {
        onNotificationsUpdate(sortedNotifications);
      });
    } catch (error) {
      console.error('Error sorting notifications:', error);
      // Fallback: return unsorted notifications
      onNotificationsUpdate(notifications);
    }
  }

  /**
   * Mark notification as read with optimized performance
   */
  async markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
      
      // Use updateDoc for better performance than setDoc
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'users', userId, 'notifications'),
        limit(100) // Process in batches
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const batch = writeBatch(db);
        let count = 0;
        
        snapshot.docs.forEach((doc) => {
          if (!doc.data().read) {
            batch.update(doc.ref, { 
              read: true, 
              readAt: serverTimestamp() 
            });
            count++;
          }
        });
        
        if (count > 0) {
          batch.commit().catch(console.error);
        }
      });

      // Return unsubscribe function
      return unsubscribe;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'users', userId, 'notifications'),
        limit(100) // Process in batches
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        
        batch.commit().catch(console.error);
      });

      // Return unsubscribe function
      return unsubscribe;
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  }

  /**
   * Get unread count with optimized query
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'users', userId, 'notifications'),
        limit(100) // Reasonable limit for unread count
      );

      return new Promise((resolve) => {
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const count = snapshot.docs.filter(doc => !doc.data().read).length;
          unsubscribe();
          resolve(count);
        });
      });
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
      if (!senderProfile) {
        console.warn('Sender profile not found for like notification');
        return;
      }
      
      await this.createNotification(receiverId, {
        type: 'like',
        senderId,
        senderName: senderProfile.name,
        senderProfilePic: senderProfile.profilePhotoUrl,
        senderVerified: senderProfile.isVerified || false,
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
      if (!senderProfile) {
        console.warn('Sender profile not found for comment notification');
        return;
      }
      
      const shortComment = commentText.length > 50 ? commentText.substring(0, 50) + '...' : commentText;
      
      await this.createNotification(receiverId, {
        type: 'comment',
        senderId,
        senderName: senderProfile.name,
        senderProfilePic: senderProfile.profilePhotoUrl,
        senderVerified: senderProfile.isVerified || false,
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
      if (!senderProfile) {
        console.warn('Sender profile not found for collaboration request notification');
        return;
      }
      
      await this.createNotification(receiverId, {
        type: 'collab_request',
        senderId,
        senderName: senderProfile.name,
        senderProfilePic: senderProfile.profilePhotoUrl,
        senderVerified: senderProfile.isVerified || false,
        message: `${senderProfile.name} sent you a collaboration request: ${message}`
      });
    } catch (error) {
      console.error('Error creating collaboration request notification:', error);
    }
  }

  /**
   * Create collaboration accepted notification
   */
  async createCollaborationAcceptedNotification(
    senderId: string,
    receiverId: string
  ): Promise<void> {
    try {
      const senderProfile = await UserService.getUserProfile(senderId);
      if (!senderProfile) {
        console.warn('Sender profile not found for notification');
        return;
      }
      
      await this.createNotification(receiverId, {
        type: 'request_accepted',
        senderId,
        senderName: senderProfile.name,
        senderProfilePic: senderProfile.profilePhotoUrl,
        senderVerified: senderProfile.isVerified || false,
        message: `${senderProfile.name} accepted your collaboration request.`
      });
    } catch (error) {
      console.error('Error creating collaboration accepted notification:', error);
    }
  }

  /**
   * Create request accepted notification (alias for collaboration accepted)
   */
  async createRequestAcceptedNotification(
    senderId: string,
    receiverId: string
  ): Promise<void> {
    return this.createCollaborationAcceptedNotification(senderId, receiverId);
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
      if (!senderProfile) {
        console.warn('Sender profile not found for request rejected notification');
        return;
      }
      
      await this.createNotification(receiverId, {
        type: 'request_rejected',
        senderId,
        senderName: senderProfile.name,
        senderProfilePic: senderProfile.profilePhotoUrl,
        senderVerified: senderProfile.isVerified || false,
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

  /**
   * Create comment reply notification
   */
  async createCommentReplyNotification(
    senderId: string,
    receiverId: string,
    postId: string,
    commentId: string,
    commentText: string,
    replyText: string
  ): Promise<void> {
    try {
      const senderProfile = await UserService.getUserProfile(senderId);
      if (!senderProfile) {
        console.warn('Sender profile not found for comment reply notification');
        return;
      }
      const shortReply = replyText.length > 50 ? replyText.substring(0, 50) + '...' : replyText;
      
      await this.createNotification(receiverId, {
        type: 'comment_reply',
        senderId,
        senderName: senderProfile.name,
        senderProfilePic: senderProfile.profilePhotoUrl,
        senderVerified: senderProfile.isVerified || false,
        relatedPostId: postId,
        relatedCommentId: commentId,
        commentText: shortReply,
        message: `${senderProfile.name} replied to your comment: '${shortReply}'`
      });
    } catch (error) {
      console.error('Error creating comment reply notification:', error);
    }
  }

  /**
   * Create comment like notification
   */
  async createCommentLikeNotification(
    senderId: string,
    receiverId: string,
    postId: string,
    commentId: string
  ): Promise<void> {
    try {
      const senderProfile = await UserService.getUserProfile(senderId);
      if (!senderProfile) {
        console.warn('Sender profile not found for comment like notification');
        return;
      }
      
      await this.createNotification(receiverId, {
        type: 'comment_like',
        senderId,
        senderName: senderProfile.name,
        senderProfilePic: senderProfile.profilePhotoUrl,
        senderVerified: senderProfile.isVerified || false,
        relatedPostId: postId,
        relatedCommentId: commentId,
        message: `${senderProfile.name} liked your comment.`
      });
    } catch (error) {
      console.error('Error creating comment like notification:', error);
    }
  }

  /**
   * Create follow notification
   */
  async createFollowNotification(
    senderId: string,
    receiverId: string
  ): Promise<void> {
    try {
      const senderProfile = await UserService.getUserProfile(senderId);
      if (!senderProfile) {
        console.warn('Sender profile not found for follow notification');
        return;
      }
      
      await this.createNotification(receiverId, {
        type: 'follow',
        senderId,
        senderName: senderProfile.name,
        senderProfilePic: senderProfile.profilePhotoUrl,
        senderVerified: senderProfile.isVerified || false,
        message: `${senderProfile.name} started following you!`
      });
    } catch (error) {
      console.error('Error creating follow notification:', error);
    }
  }

  /**
   * Create Spotlight shared notification
   */
  async createSpotlightSharedNotification(
    senderId: string,
    receiverId: string,
    spotlightId: string
  ): Promise<void> {
    try {
      const senderProfile = await UserService.getUserProfile(senderId);
      if (!senderProfile) {
        console.warn('Sender profile not found for Spotlight shared notification');
        return;
      }
      
      await this.createNotification(receiverId, {
        type: 'spotlight_shared',
        senderId,
        senderName: senderProfile.name,
        senderProfilePic: senderProfile.profilePhotoUrl,
        senderVerified: senderProfile.isVerified || false,
        relatedPostId: spotlightId,
        message: `${senderProfile.name} shared a Spotlight with you.`
      });
    } catch (error) {
      console.error('Error creating Spotlight shared notification:', error);
    }
  }
}

export const notificationService = new NotificationService(); 