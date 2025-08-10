import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ProfileImageService } from '../services/profileImageService';

export class QuickMigration {
  /**
   * Run a quick migration to clean up local file paths
   */
  static async runQuickMigration(): Promise<void> {
    try {
      console.log('🚀 Starting quick migration...');
      
      // Clean users collection
      await this.cleanUsers();
      
      // Clean posts collection
      await this.cleanPosts();
      
      console.log('✅ Quick migration completed successfully!');
    } catch (error) {
      console.error('❌ Error during quick migration:', error);
      throw error;
    }
  }

  /**
   * Clean users collection - replace local file paths with placeholder URLs
   */
  static async cleanUsers(): Promise<void> {
    try {
      console.log('🧹 Cleaning users collection...');
      
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      let cleanedCount = 0;
      
      for (const userDoc of snapshot.docs) {
        const userData = userDoc.data();
        let needsUpdate = false;
        const updates: any = {};
        
        // Check profile photo URL
        if (userData.profilePhotoUrl && ProfileImageService.isLocalFile(userData.profilePhotoUrl)) {
          console.log(`🔄 Replacing local profile photo for user ${userDoc.id}`);
          updates.profilePhotoUrl = ProfileImageService.getDefaultImageUrl('profile');
          needsUpdate = true;
        }
        
        // Check banner photo URL
        if (userData.bannerPhotoUrl && ProfileImageService.isLocalFile(userData.bannerPhotoUrl)) {
          console.log(`🔄 Replacing local banner photo for user ${userDoc.id}`);
          updates.bannerPhotoUrl = ProfileImageService.getDefaultImageUrl('banner');
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await updateDoc(doc(db, 'users', userDoc.id), updates);
          cleanedCount++;
        }
      }
      
      console.log(`✅ Cleaned ${cleanedCount} users`);
    } catch (error) {
      console.error('❌ Error cleaning users:', error);
      throw error;
    }
  }

  /**
   * Clean posts collection - replace local file paths with placeholder URLs
   */
  static async cleanPosts(): Promise<void> {
    try {
      console.log('🧹 Cleaning posts collection...');
      
      const postsRef = collection(db, 'posts');
      const snapshot = await getDocs(postsRef);
      
      let cleanedCount = 0;
      
      for (const postDoc of snapshot.docs) {
        const postData = postDoc.data();
        let needsUpdate = false;
        const updates: any = {};
        
        // Check user avatar URL
        if (postData.userAvatar && ProfileImageService.isLocalFile(postData.userAvatar)) {
          console.log(`🔄 Replacing local user avatar in post ${postDoc.id}`);
          updates.userAvatar = ProfileImageService.getDefaultImageUrl('profile');
          needsUpdate = true;
        }
        
        // Check post images
        if (postData.images && Array.isArray(postData.images)) {
          const cleanedImages = postData.images.map((image: string) => {
            if (ProfileImageService.isLocalFile(image)) {
              console.log(`🔄 Replacing local image in post ${postDoc.id}`);
              return ProfileImageService.getDefaultImageUrl('postImage');
            }
            return image;
          });
          
          if (JSON.stringify(cleanedImages) !== JSON.stringify(postData.images)) {
            updates.images = cleanedImages;
            needsUpdate = true;
          }
        }
        
        if (needsUpdate) {
          await updateDoc(doc(db, 'posts', postDoc.id), updates);
          cleanedCount++;
        }
      }
      
      console.log(`✅ Cleaned ${cleanedCount} posts`);
    } catch (error) {
      console.error('❌ Error cleaning posts:', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  static async getMigrationStatus(): Promise<{
    totalUsers: number;
    usersWithLocalFiles: number;
    totalPosts: number;
    postsWithLocalFiles: number;
  }> {
    try {
      console.log('📊 Getting migration status...');
      
      // Check users
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      let usersWithLocalFiles = 0;
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if ((userData.profilePhotoUrl && ProfileImageService.isLocalFile(userData.profilePhotoUrl)) ||
            (userData.bannerPhotoUrl && ProfileImageService.isLocalFile(userData.bannerPhotoUrl))) {
          usersWithLocalFiles++;
        }
      });
      
      // Check posts
      const postsRef = collection(db, 'posts');
      const postsSnapshot = await getDocs(postsRef);
      
      let postsWithLocalFiles = 0;
      postsSnapshot.forEach(doc => {
        const postData = doc.data();
        if ((postData.userAvatar && ProfileImageService.isLocalFile(postData.userAvatar)) ||
            (postData.images && Array.isArray(postData.images) && 
             postData.images.some((image: string) => ProfileImageService.isLocalFile(image)))) {
          postsWithLocalFiles++;
        }
      });
      
      return {
        totalUsers: usersSnapshot.size,
        usersWithLocalFiles,
        totalPosts: postsSnapshot.size,
        postsWithLocalFiles
      };
    } catch (error) {
      console.error('❌ Error getting migration status:', error);
      throw error;
    }
  }
} 