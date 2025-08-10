import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ProfileImageService } from '../services/profileImageService';

export class MigrationUtils {
  /**
   * Log migration statistics
   */
  static logMigrationStats(stats: {
    totalPosts: number;
    postsWithLocalFiles: number;
    totalUsers: number;
    usersWithLocalFiles: number;
  }) {
    console.log('📊 Migration Statistics:');
    console.log(`📝 Posts: ${stats.postsWithLocalFiles}/${stats.totalPosts} have local file paths`);
    console.log(`👤 Users: ${stats.usersWithLocalFiles}/${stats.totalUsers} have local file paths`);
  }

  /**
   * Check for local file paths in posts
   */
  static async checkPostsForLocalFiles(): Promise<{
    totalPosts: number;
    postsWithLocalFiles: number;
    localFilePosts: Array<{ id: string; userAvatar: string; images: string[] }>;
  }> {
    try {
      console.log('🔍 Checking posts for local file paths...');
      
      const postsRef = collection(db, 'posts');
      const snapshot = await getDocs(postsRef);
      
      let totalPosts = 0;
      let postsWithLocalFiles = 0;
      const localFilePosts: Array<{ id: string; userAvatar: string; images: string[] }> = [];
      
      snapshot.forEach((doc) => {
        totalPosts++;
        const data = doc.data();
        let hasLocalFiles = false;
        
        // Check user avatar
        if (data.userAvatar && ProfileImageService.isLocalFile(data.userAvatar)) {
          hasLocalFiles = true;
        }
        
        // Check post images
        if (data.images && Array.isArray(data.images)) {
          for (const image of data.images) {
            if (ProfileImageService.isLocalFile(image)) {
              hasLocalFiles = true;
              break;
            }
          }
        }
        
        if (hasLocalFiles) {
          postsWithLocalFiles++;
          localFilePosts.push({
            id: doc.id,
            userAvatar: data.userAvatar || '',
            images: data.images || []
          });
        }
      });
      
      console.log(`📊 Found ${postsWithLocalFiles} posts with local file paths out of ${totalPosts} total posts`);
      
      return {
        totalPosts,
        postsWithLocalFiles,
        localFilePosts
      };
    } catch (error) {
      console.error('❌ Error checking posts for local files:', error);
      throw error;
    }
  }

  /**
   * Check for local file paths in user profiles
   */
  static async checkUsersForLocalFiles(): Promise<{
    totalUsers: number;
    usersWithLocalFiles: number;
    localFileUsers: Array<{ uid: string; profilePhotoUrl: string; bannerPhotoUrl: string }>;
  }> {
    try {
      console.log('🔍 Checking users for local file paths...');
      
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      let totalUsers = 0;
      let usersWithLocalFiles = 0;
      const localFileUsers: Array<{ uid: string; profilePhotoUrl: string; bannerPhotoUrl: string }> = [];
      
      snapshot.forEach((doc) => {
        totalUsers++;
        const data = doc.data();
        let hasLocalFiles = false;
        
        // Check profile photo
        if (data.profilePhotoUrl && ProfileImageService.isLocalFile(data.profilePhotoUrl)) {
          hasLocalFiles = true;
        }
        
        // Check banner photo
        if (data.bannerPhotoUrl && ProfileImageService.isLocalFile(data.bannerPhotoUrl)) {
          hasLocalFiles = true;
        }
        
        if (hasLocalFiles) {
          usersWithLocalFiles++;
          localFileUsers.push({
            uid: doc.id,
            profilePhotoUrl: data.profilePhotoUrl || '',
            bannerPhotoUrl: data.bannerPhotoUrl || ''
          });
        }
      });
      
      console.log(`📊 Found ${usersWithLocalFiles} users with local file paths out of ${totalUsers} total users`);
      
      return {
        totalUsers,
        usersWithLocalFiles,
        localFileUsers
      };
    } catch (error) {
      console.error('❌ Error checking users for local files:', error);
      throw error;
    }
  }

  /**
   * Clean up a specific post by replacing local file paths with placeholders
   */
  static async cleanPostLocalFiles(postId: string): Promise<void> {
    try {
      console.log(`🧹 Cleaning local file paths in post ${postId}...`);
      
      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDocs(collection(db, 'posts'));
      
      // Find the post
      const post = postDoc.docs.find(doc => doc.id === postId);
      if (!post) {
        console.warn(`⚠️ Post ${postId} not found`);
        return;
      }
      
      const data = post.data();
      const updates: any = {};
      
      // Clean user avatar
      if (data.userAvatar && ProfileImageService.isLocalFile(data.userAvatar)) {
        console.log(`🔄 Replacing local user avatar in post ${postId}`);
        updates.userAvatar = ProfileImageService.getPlaceholderUrl('profile');
      }
      
      // Clean post images
      if (data.images && Array.isArray(data.images)) {
        const cleanedImages = data.images.map((image: string) => {
          if (ProfileImageService.isLocalFile(image)) {
            console.log(`🔄 Replacing local image in post ${postId}`);
            return ProfileImageService.getPlaceholderUrl('postImage');
          }
          return image;
        });
        
        if (JSON.stringify(cleanedImages) !== JSON.stringify(data.images)) {
          updates.images = cleanedImages;
        }
      }
      
      // Update the post if there are changes
      if (Object.keys(updates).length > 0) {
        await updateDoc(postRef, updates);
        console.log(`✅ Post ${postId} cleaned successfully`);
      } else {
        console.log(`ℹ️ Post ${postId} already clean`);
      }
    } catch (error) {
      console.error(`❌ Error cleaning post ${postId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up a specific user profile by replacing local file paths with placeholders
   */
  static async cleanUserLocalFiles(userId: string): Promise<void> {
    try {
      console.log(`🧹 Cleaning local file paths in user ${userId}...`);
      
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDocs(collection(db, 'users'));
      
      // Find the user
      const user = userDoc.docs.find(doc => doc.id === userId);
      if (!user) {
        console.warn(`⚠️ User ${userId} not found`);
        return;
      }
      
      const data = user.data();
      const updates: any = {};
      
      // Clean profile photo
      if (data.profilePhotoUrl && ProfileImageService.isLocalFile(data.profilePhotoUrl)) {
        console.log(`🔄 Replacing local profile photo for user ${userId}`);
        updates.profilePhotoUrl = ProfileImageService.getPlaceholderUrl('profile');
      }
      
      // Clean banner photo
      if (data.bannerPhotoUrl && ProfileImageService.isLocalFile(data.bannerPhotoUrl)) {
        console.log(`🔄 Replacing local banner photo for user ${userId}`);
        updates.bannerPhotoUrl = ProfileImageService.getPlaceholderUrl('banner');
      }
      
      // Update the user if there are changes
      if (Object.keys(updates).length > 0) {
        await updateDoc(userRef, updates);
        console.log(`✅ User ${userId} cleaned successfully`);
      } else {
        console.log(`ℹ️ User ${userId} already clean`);
      }
    } catch (error) {
      console.error(`❌ Error cleaning user ${userId}:`, error);
      throw error;
    }
  }
} 