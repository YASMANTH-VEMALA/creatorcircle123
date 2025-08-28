import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  increment,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  SpotlightPost,
  SpotlightLike,
  SpotlightComment,
  SpotlightShare,
  SpotlightPostWithUser,
  SpotlightUser,
} from '../types/spotlight';
import { UserService } from './userService';
import { notificationService } from './notificationService';

export class SpotlightService {
  // Create a new spotlight post
  static async createSpotlightPost(postData: Omit<SpotlightPost, 'id' | 'createdAt' | 'likesCount' | 'commentsCount' | 'sharesCount' | 'viewsCount'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'spotlightPosts'), {
        ...postData,
        createdAt: serverTimestamp(),
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        viewsCount: 0,
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating spotlight post:', error);
      throw error;
    }
  }

  // Get spotlight posts with pagination
  static async getSpotlightPosts(limitCount: number = 10, lastPostId?: string): Promise<SpotlightPostWithUser[]> {
    try {
      // For now, let's get all posts and filter client-side to avoid index issues
      // TODO: Create the required composite index in Firebase Console
      let q = query(
        collection(db, 'spotlightPosts'),
        orderBy('createdAt', 'desc'),
        limit(limitCount * 2) // Get more posts to account for filtering
      );

      if (lastPostId) {
        const lastPost = await getDoc(doc(db, 'spotlightPosts', lastPostId));
        if (lastPost.exists()) {
          q = query(
            collection(db, 'spotlightPosts'),
            orderBy('createdAt', 'desc'),
            startAfter(lastPost),
            limit(limitCount * 2)
          );
        }
      }

      const querySnapshot = await getDocs(q);
      const posts: SpotlightPostWithUser[] = [];

      for (const doc of querySnapshot.docs) {
        const postData = doc.data() as SpotlightPost;
        const post: SpotlightPost = {
          ...postData,
          id: doc.id,
          createdAt: postData.createdAt instanceof Timestamp ? postData.createdAt.toDate() : new Date(postData.createdAt),
        };

        // Filter public posts client-side
        if (!post.isPublic) continue;

        // Get creator info
        const creator = await UserService.getUserProfile(post.userId);
        if (creator) {
          const spotlightUser: SpotlightUser = {
            uid: creator.uid,
            name: creator.name,
            username: creator.name.split(' ')[0], // Use first name as username
            profilePhotoUrl: creator.profilePhotoUrl,
            verifiedBadge: creator.verifiedBadge || 'none',
            followersCount: creator.followers || 0,
          };

          // Check if current user liked this post
          const isLiked = await this.checkIfUserLikedPost(post.id, creator.uid);
          
          posts.push({
            ...post,
            creator: spotlightUser,
            isLiked,
            isSaved: false, // TODO: Implement saved posts
            currentUserLikeId: isLiked ? 'temp' : undefined, // TODO: Get actual like ID
          });
        }

        // Stop if we have enough posts
        if (posts.length >= limitCount) break;
      }

      return posts;
    } catch (error) {
      console.error('Error getting spotlight posts:', error);
      throw error;
    }
  }

  // Get a single spotlight post by ID
  static async getSpotlightPost(postId: string): Promise<SpotlightPostWithUser | null> {
    try {
      const postDoc = await getDoc(doc(db, 'spotlightPosts', postId));
      if (!postDoc.exists()) return null;

      const postData = postDoc.data() as SpotlightPost;
      const post: SpotlightPost = {
        ...postData,
        id: postDoc.id,
        createdAt: postData.createdAt instanceof Timestamp ? postData.createdAt.toDate() : new Date(postData.createdAt),
      };

      // Get creator info
      const creator = await UserService.getUserProfile(post.userId);
      if (!creator) return null;

      const spotlightUser: SpotlightUser = {
        uid: creator.uid,
        name: creator.name,
        username: creator.name.split(' ')[0],
        profilePhotoUrl: creator.profilePhotoUrl,
        verifiedBadge: creator.verifiedBadge || 'none',
        followersCount: creator.followers || 0,
      };

      const isLiked = await this.checkIfUserLikedPost(post.id, creator.uid);

      return {
        ...post,
        creator: spotlightUser,
        isLiked,
        isSaved: false,
        currentUserLikeId: isLiked ? 'temp' : undefined,
      };
    } catch (error) {
      console.error('Error getting spotlight post:', error);
      throw error;
    }
  }

  // Like a spotlight post
  static async likeSpotlightPost(postId: string, userId: string): Promise<void> {
    try {
      const batch = writeBatch(db);

      // Add like record
      const likeRef = doc(collection(db, 'spotlightLikes'));
      batch.set(likeRef, {
        postId,
        userId,
        createdAt: serverTimestamp(),
      });

      // Increment likes count
      const postRef = doc(db, 'spotlightPosts', postId);
      batch.update(postRef, {
        likesCount: increment(1),
      });

      await batch.commit();
    } catch (error) {
      console.error('Error liking spotlight post:', error);
      throw error;
    }
  }

  // Unlike a spotlight post
  static async unlikeSpotlightPost(postId: string, userId: string): Promise<void> {
    try {
      const batch = writeBatch(db);

      // Find and delete like record
      const likesQuery = query(
        collection(db, 'spotlightLikes'),
        where('postId', '==', postId),
        where('userId', '==', userId)
      );
      const likesSnapshot = await getDocs(likesQuery);
      
      if (!likesSnapshot.empty) {
        batch.delete(likesSnapshot.docs[0].ref);
      }

      // Decrement likes count
      const postRef = doc(db, 'spotlightPosts', postId);
      batch.update(postRef, {
        likesCount: increment(-1),
      });

      await batch.commit();
    } catch (error) {
      console.error('Error unliking spotlight post:', error);
      throw error;
    }
  }

  // Check if user liked a post
  static async checkIfUserLikedPost(postId: string, userId: string): Promise<boolean> {
    try {
      const likesQuery = query(
        collection(db, 'spotlightLikes'),
        where('postId', '==', postId),
        where('userId', '==', userId)
      );
      const likesSnapshot = await getDocs(likesQuery);
      return !likesSnapshot.empty;
    } catch (error) {
      console.error('Error checking if user liked post:', error);
      return false;
    }
  }

  // Add comment to spotlight post
  static async addComment(postId: string, userId: string, commentText: string, replyToCommentId?: string): Promise<string> {
    try {
      const batch = writeBatch(db);

      // Add comment record
      const commentRef = doc(collection(db, 'spotlightComments'));
      batch.set(commentRef, {
        postId,
        userId,
        commentText,
        createdAt: serverTimestamp(),
        replyToCommentId,
        likesCount: 0,
      });

      // Increment comments count
      const postRef = doc(db, 'spotlightPosts', postId);
      batch.update(postRef, {
        commentsCount: increment(1),
      });

      await batch.commit();
      return commentRef.id;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  // Get comments for a spotlight post
  static async getComments(postId: string, limitCount: number = 20): Promise<SpotlightComment[]> {
    try {
      // First try with the indexed query
      const commentsQuery = query(
        collection(db, 'spotlightComments'),
        where('postId', '==', postId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(commentsQuery);
      const comments: SpotlightComment[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        comments.push({
          id: doc.id,
          postId: data.postId,
          userId: data.userId,
          commentText: data.commentText,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
          replyToCommentId: data.replyToCommentId,
          likesCount: data.likesCount || 0,
        });
      });

      return comments;
    } catch (error: any) {
      // If index error occurs, fall back to client-side sorting
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        console.warn('Index not found for spotlightComments, using client-side fallback');
        try {
          const fallbackQuery = query(
            collection(db, 'spotlightComments'),
            where('postId', '==', postId),
            limit(limitCount * 2) // Get more to account for client-side filtering
          );

          const fallbackSnapshot = await getDocs(fallbackQuery);
          const fallbackComments: SpotlightComment[] = [];

          fallbackSnapshot.forEach((doc) => {
            const data = doc.data();
            fallbackComments.push({
              id: doc.id,
              postId: data.postId,
              userId: data.userId,
              commentText: data.commentText,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
              replyToCommentId: data.replyToCommentId,
              likesCount: data.likesCount || 0,
            });
          });

          // Sort by createdAt in descending order (newest first)
          fallbackComments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          
          // Return only the requested limit
          return fallbackComments.slice(0, limitCount);
        } catch (fallbackError) {
          console.error('Error in fallback comment loading:', fallbackError);
          return [];
        }
      }
      
      console.error('Error getting comments:', error);
      return [];
    }
  }

  // Share spotlight post with another user
  static async shareSpotlightPost(postId: string, senderId: string, receiverId: string, message?: string): Promise<void> {
    try {
      const batch = writeBatch(db);

      // Add share record
      const shareRef = doc(collection(db, 'spotlightShares'));
      batch.set(shareRef, {
        postId,
        senderId,
        receiverId,
        createdAt: serverTimestamp(),
        message: message || null, // Convert undefined to null for Firebase
      });

      // Increment shares count
      const postRef = doc(db, 'spotlightPosts', postId);
      batch.update(postRef, {
        sharesCount: increment(1),
      });

      await batch.commit();

      // Integrate with new chat system
      try {
        const { NewChatService } = await import('./newChatService');
        
        // Create or get chat between users
        const chatId = await NewChatService.createOrGetChat(senderId, receiverId);
        
        // Send spotlight share message
        const shareMessage = message || `Check out this amazing spotlight! 🎬`;
        await NewChatService.sendMessage(
          chatId, 
          senderId, 
          receiverId, 
          shareMessage, 
          'text'
        );

        console.log('✅ Spotlight shared successfully with chat integration');
      } catch (chatError) {
        console.error('❌ Chat integration failed:', chatError);
        // Continue without chat integration
      }

      // Send notification to receiver
      try {
        await notificationService.createSpotlightSharedNotification(
          senderId,
          receiverId,
          postId
        );
        console.log('Spotlight shared notification sent');
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
        // Don't throw error for notification, as the share was successful
      }
    } catch (error) {
      console.error('Error sharing spotlight post:', error);
      throw error;
    }
  }

  // Increment view count for a post
  static async incrementViewCount(postId: string): Promise<void> {
    try {
      const postRef = doc(db, 'spotlightPosts', postId);
      await updateDoc(postRef, {
        viewsCount: increment(1),
      });
    } catch (error) {
      console.error('Error incrementing view count:', error);
      // Don't throw error for view count updates
    }
  }

  // Listen to spotlight posts in real-time
  static listenToSpotlightPosts(
    onPostsUpdate: (posts: SpotlightPostWithUser[]) => void,
    limitCount: number = 10
  ): () => void {
    try {
      // For now, listen to all posts and filter client-side
      // TODO: Create the required composite index in Firebase Console
      // Remove orderBy temporarily to avoid index issues
      const q = query(
        collection(db, 'spotlightPosts'),
        limit(limitCount * 2)
      );

      return onSnapshot(q, async (snapshot) => {
        const posts: SpotlightPostWithUser[] = [];

        for (const doc of snapshot.docs) {
          const postData = doc.data() as SpotlightPost;
          const post: SpotlightPost = {
            ...postData,
            id: doc.id,
            createdAt: postData.createdAt instanceof Timestamp ? postData.createdAt.toDate() : new Date(postData.createdAt),
          };

          // Filter public posts client-side
          if (!post.isPublic) continue;

          // Get creator info
          const creator = await UserService.getUserProfile(post.userId);
          if (creator) {
            const spotlightUser: SpotlightUser = {
              uid: creator.uid,
              name: creator.name,
              username: creator.name.split(' ')[0],
              profilePhotoUrl: creator.profilePhotoUrl,
              verifiedBadge: creator.verifiedBadge || 'none',
              followersCount: creator.followers || 0,
            };

            const isLiked = await this.checkIfUserLikedPost(post.id, creator.uid);

            posts.push({
              ...post,
              creator: spotlightUser,
              isLiked,
              isSaved: false,
              currentUserLikeId: isLiked ? 'temp' : undefined,
            });
          }

          // Stop if we have enough posts
          if (posts.length >= limitCount) break;
        }

        // Sort posts by creation time (newest first) client-side
        posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        onPostsUpdate(posts);
      });
    } catch (error) {
      console.error('Error setting up spotlight posts listener:', error);
      return () => {};
    }
  }

  // Delete spotlight post
  static async deleteSpotlightPost(postId: string): Promise<void> {
    try {
      const batch = writeBatch(db);

      // Delete all likes
      if (postId && typeof postId === 'string' && postId.trim() !== '') {
        try {
          const likesQuery = query(collection(db, 'spotlightLikes'), where('postId', '==', postId));
          const likesSnapshot = await getDocs(likesQuery);
          likesSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
          });
        } catch (likesError) {
          console.error('Error deleting likes:', likesError);
        }
      }

      // Delete all comments
      if (postId && typeof postId === 'string' && postId.trim() !== '') {
        try {
          const commentsQuery = query(collection(db, 'spotlightComments'), where('postId', '==', postId));
          const commentsSnapshot = await getDocs(commentsQuery);
          commentsSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
          });
        } catch (commentsError) {
          console.error('Error deleting comments:', commentsError);
        }
      }

      // Delete all shares
      if (postId && typeof postId === 'string' && postId.trim() !== '') {
        try {
          const sharesQuery = query(collection(db, 'spotlightShares'), where('postId', '==', postId));
          const sharesSnapshot = await getDocs(sharesQuery);
          sharesSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
          });
        } catch (sharesError) {
          console.error('Error deleting shares:', sharesError);
        }
      }

      // Delete the post
      if (postId && typeof postId === 'string' && postId.trim() !== '') {
        batch.delete(doc(db, 'spotlightPosts', postId));
      }

      await batch.commit();
    } catch (error) {
      console.error('Error deleting spotlight post:', error);
      throw error;
    }
  }
} 