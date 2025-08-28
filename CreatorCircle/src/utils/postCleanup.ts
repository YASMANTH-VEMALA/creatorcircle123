import { db } from '../config/firebase';
import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';

export class PostCleanup {
  /**
   * Clean up posts with invalid data
   */
  static async cleanInvalidPosts(): Promise<void> {
    try {
      console.log('🧹 Starting cleanup of invalid posts...');
      
      const postsRef = collection(db, 'posts');
      const snapshot = await getDocs(postsRef);
      
      const batch = writeBatch(db);
      let cleanupCount = 0;
      
      snapshot.forEach((postDoc) => {
        const data = postDoc.data();
        
        // Check for posts with missing or invalid userId
        if (!data || !data.userId || typeof data.userId !== 'string' || data.userId.trim() === '') {
          console.log(`🗑️ Deleting post with invalid userId: ${postDoc.id}`);
          batch.delete(postDoc.ref);
          cleanupCount++;
          return;
        }
        
        // Check for posts with invalid content
        if (!data.content || typeof data.content !== 'string' || data.content.trim() === '') {
          console.log(`🗑️ Deleting post with invalid content: ${postDoc.id}`);
          batch.delete(postDoc.ref);
          cleanupCount++;
          return;
        }
        
        // Check for posts with invalid arrays
        if (data.images && !Array.isArray(data.images)) {
          console.log(`🔧 Fixing post with invalid images array: ${postDoc.id}`);
          batch.update(postDoc.ref, { images: [] });
          cleanupCount++;
        }
        
        if (data.videos && !Array.isArray(data.videos)) {
          console.log(`🔧 Fixing post with invalid videos array: ${postDoc.id}`);
          batch.update(postDoc.ref, { videos: [] });
          cleanupCount++;
        }
        
        // Check for posts with invalid numbers
        if (typeof data.likes !== 'number' || isNaN(data.likes)) {
          console.log(`🔧 Fixing post with invalid likes count: ${postDoc.id}`);
          batch.update(postDoc.ref, { likes: 0 });
          cleanupCount++;
        }
        
        if (typeof data.comments !== 'number' || isNaN(data.comments)) {
          console.log(`🔧 Fixing post with invalid comments count: ${postDoc.id}`);
          batch.update(postDoc.ref, { comments: 0 });
          cleanupCount++;
        }
      });
      
      if (cleanupCount > 0) {
        await batch.commit();
        console.log(`✅ Cleaned up ${cleanupCount} invalid posts`);
      } else {
        console.log('✨ No invalid posts found');
      }
    } catch (error) {
      console.error('❌ Error cleaning up invalid posts:', error);
    }
  }

  /**
   * Clean up post subcollections (likes, comments, reports)
   */
  static async cleanPostSubcollections(): Promise<void> {
    try {
      console.log('🧹 Starting cleanup of post subcollections...');
      
      const postsRef = collection(db, 'posts');
      const snapshot = await getDocs(postsRef);
      
      let cleanupCount = 0;
      
      for (const postDoc of snapshot.docs) {
        const postData = postDoc.data();
        
        // Skip invalid posts
        if (!postData || !postData.userId) continue;
        
        // Clean up likes subcollection
        try {
          const likesRef = collection(db, 'posts', postDoc.id, 'likes');
          const likesSnapshot = await getDocs(likesRef);
          
          const batch = writeBatch(db);
          let likesCleanupCount = 0;
          
          likesSnapshot.forEach((likeDoc) => {
            const likeData = likeDoc.data();
            if (!likeData || !likeData.userId || typeof likeData.userId !== 'string') {
              batch.delete(likeDoc.ref);
              likesCleanupCount++;
            }
          });
          
          if (likesCleanupCount > 0) {
            await batch.commit();
            cleanupCount += likesCleanupCount;
          }
        } catch (error) {
          console.warn(`⚠️ Error cleaning likes for post ${postDoc.id}:`, error);
        }
        
        // Clean up comments subcollection
        try {
          const commentsRef = collection(db, 'posts', postDoc.id, 'comments');
          const commentsSnapshot = await getDocs(commentsRef);
          
          const batch = writeBatch(db);
          let commentsCleanupCount = 0;
          
          commentsSnapshot.forEach((commentDoc) => {
            const commentData = commentDoc.data();
            if (!commentData || !commentData.userId || typeof commentData.userId !== 'string') {
              batch.delete(commentDoc.ref);
              commentsCleanupCount++;
            }
          });
          
          if (commentsCleanupCount > 0) {
            await batch.commit();
            cleanupCount += commentsCleanupCount;
          }
        } catch (error) {
          console.warn(`⚠️ Error cleaning comments for post ${postDoc.id}:`, error);
        }
      }
      
      if (cleanupCount > 0) {
        console.log(`✅ Cleaned up ${cleanupCount} invalid subcollection items`);
      } else {
        console.log('✨ No invalid subcollection items found');
      }
    } catch (error) {
      console.error('❌ Error cleaning up post subcollections:', error);
    }
  }

  /**
   * Run full post cleanup
   */
  static async runFullCleanup(): Promise<void> {
    console.log('🚀 Starting full post cleanup...');
    await this.cleanInvalidPosts();
    await this.cleanPostSubcollections();
    console.log('🎉 Full post cleanup completed');
  }
} 