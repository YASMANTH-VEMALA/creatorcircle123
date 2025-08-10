import { 
  collection, 
  doc, 
  addDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs,
  updateDoc,
  increment,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { NotificationService } from './notificationService';
import { UserService } from './userService';

export class FollowService {
  // Follow a user
  static async followUser(followerId: string, followeeId: string): Promise<void> {
    try {
      // Don't allow self-following
      if (followerId === followeeId) {
        throw new Error('Cannot follow yourself');
      }

      // Check if already following
      const existingFollow = await this.isFollowing(followerId, followeeId);
      if (existingFollow) {
        throw new Error('Already following this user');
      }

      // Create follow relationship
      await addDoc(collection(db, 'follows'), {
        followerId,
        followeeId,
        createdAt: serverTimestamp(),
      });

      // Update follower/following counts
      await this.updateFollowCounts(followerId, followeeId, 1);

      // Create follow notification
      try {
        await NotificationService.createFollowNotification(followerId, followeeId);
      } catch (notificationError) {
        console.error('Error creating follow notification:', notificationError);
        // Don't throw error - follow should still work even if notification fails
      }

    } catch (error) {
      console.error('Error following user:', error);
      throw error;
    }
  }

  // Unfollow a user
  static async unfollowUser(followerId: string, followeeId: string): Promise<void> {
    try {
      // Find the follow relationship
      const followQuery = query(
        collection(db, 'follows'),
        where('followerId', '==', followerId),
        where('followeeId', '==', followeeId)
      );

      const snapshot = await getDocs(followQuery);
      
      if (snapshot.empty) {
        throw new Error('Not following this user');
      }

      // Delete the follow relationship
      const followDoc = snapshot.docs[0];
      await deleteDoc(followDoc.ref);

      // Update follower/following counts
      await this.updateFollowCounts(followerId, followeeId, -1);

    } catch (error) {
      console.error('Error unfollowing user:', error);
      throw error;
    }
  }

  // Check if user is following another user
  static async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    try {
      const followQuery = query(
        collection(db, 'follows'),
        where('followerId', '==', followerId),
        where('followeeId', '==', followeeId)
      );

      const snapshot = await getDocs(followQuery);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }

  // Get followers of a user
  static async getFollowers(userId: string): Promise<string[]> {
    try {
      const followersQuery = query(
        collection(db, 'follows'),
        where('followeeId', '==', userId)
      );

      const snapshot = await getDocs(followersQuery);
      return snapshot.docs.map(doc => doc.data().followerId);
    } catch (error) {
      console.error('Error getting followers:', error);
      return [];
    }
  }

  // Get following of a user
  static async getFollowing(userId: string): Promise<string[]> {
    try {
      const followingQuery = query(
        collection(db, 'follows'),
        where('followerId', '==', userId)
      );

      const snapshot = await getDocs(followingQuery);
      return snapshot.docs.map(doc => doc.data().followeeId);
    } catch (error) {
      console.error('Error getting following:', error);
      return [];
    }
  }

  // Update follow counts in user profiles
  private static async updateFollowCounts(
    followerId: string, 
    followeeId: string, 
    change: number
  ): Promise<void> {
    try {
      // Update follower's following count
      const followerRef = doc(db, 'users', followerId);
      await updateDoc(followerRef, {
        following: increment(change),
      });

      // Update followee's followers count
      const followeeRef = doc(db, 'users', followeeId);
      await updateDoc(followeeRef, {
        followers: increment(change),
      });
    } catch (error) {
      console.error('Error updating follow counts:', error);
      // Don't throw error - follow relationship should still be created/deleted
    }
  }
} 