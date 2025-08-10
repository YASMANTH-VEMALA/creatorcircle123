import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ProfileImageService } from '../services/profileImageService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

export class AutoMigration {
  /**
   * Automatically convert local file paths to Firebase Storage URLs
   */
  static async autoMigrateLocalFiles(): Promise<void> {
    try {
      console.log('🚀 Starting automatic migration of local files...');
      
      // Migrate users first
      await this.migrateUsers();
      
      // Then migrate posts
      await this.migratePosts();
      
      console.log('✅ Automatic migration completed successfully!');
    } catch (error) {
      console.error('❌ Error during automatic migration:', error);
      throw error;
    }
  }

  /**
   * Migrate users - convert local file paths to Firebase Storage URLs
   */
  static async migrateUsers(): Promise<void> {
    try {
      console.log('👤 Migrating users...');
      
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      let migratedCount = 0;
      
      for (const userDoc of snapshot.docs) {
        const userData = userDoc.data();
        let needsUpdate = false;
        const updates: any = {};
        
        // Check and migrate profile photo
        if (userData.profilePhotoUrl && ProfileImageService.isLocalFile(userData.profilePhotoUrl)) {
          console.log(`🔄 Converting profile photo for user ${userDoc.id}...`);
          try {
            const firebaseUrl = await this.convertLocalFileToFirebase(
              userData.profilePhotoUrl, 
              userDoc.id, 
              'profile'
            );
            updates.profilePhotoUrl = firebaseUrl;
            needsUpdate = true;
            console.log(`✅ Profile photo converted: ${firebaseUrl}`);
          } catch (error) {
            console.error(`❌ Failed to convert profile photo for user ${userDoc.id}:`, error);
            // Fallback to placeholder
            updates.profilePhotoUrl = ProfileImageService.getDefaultImageUrl('profile');
            needsUpdate = true;
          }
        }
        
        // Check and migrate banner photo
        if (userData.bannerPhotoUrl && ProfileImageService.isLocalFile(userData.bannerPhotoUrl)) {
          console.log(`🔄 Converting banner photo for user ${userDoc.id}...`);
          try {
            const firebaseUrl = await this.convertLocalFileToFirebase(
              userData.bannerPhotoUrl, 
              userDoc.id, 
              'banner'
            );
            updates.bannerPhotoUrl = firebaseUrl;
            needsUpdate = true;
            console.log(`✅ Banner photo converted: ${firebaseUrl}`);
          } catch (error) {
            console.error(`❌ Failed to convert banner photo for user ${userDoc.id}:`, error);
            // Fallback to placeholder
            updates.bannerPhotoUrl = ProfileImageService.getDefaultImageUrl('banner');
            needsUpdate = true;
          }
        }
        
        if (needsUpdate) {
          await updateDoc(doc(db, 'users', userDoc.id), updates);
          migratedCount++;
        }
      }
      
      console.log(`✅ Migrated ${migratedCount} users`);
    } catch (error) {
      console.error('❌ Error migrating users:', error);
      throw error;
    }
  }

  /**
   * Migrate posts - convert local file paths to Firebase Storage URLs
   */
  static async migratePosts(): Promise<void> {
    try {
      console.log('📝 Migrating posts...');
      
      const postsRef = collection(db, 'posts');
      const snapshot = await getDocs(postsRef);
      
      let migratedCount = 0;
      
      for (const postDoc of snapshot.docs) {
        const postData = postDoc.data();
        let needsUpdate = false;
        const updates: any = {};
        
        // Check and migrate user avatar
        if (postData.userAvatar && ProfileImageService.isLocalFile(postData.userAvatar)) {
          console.log(`🔄 Converting user avatar in post ${postDoc.id}...`);
          try {
            const firebaseUrl = await this.convertLocalFileToFirebase(
              postData.userAvatar, 
              postData.userId || 'unknown', 
              'profile'
            );
            updates.userAvatar = firebaseUrl;
            needsUpdate = true;
            console.log(`✅ User avatar converted: ${firebaseUrl}`);
          } catch (error) {
            console.error(`❌ Failed to convert user avatar in post ${postDoc.id}:`, error);
            // Fallback to placeholder
            updates.userAvatar = ProfileImageService.getDefaultImageUrl('profile');
            needsUpdate = true;
          }
        }
        
        // Check and migrate post images
        if (postData.images && Array.isArray(postData.images)) {
          const migratedImages = [];
          let imagesChanged = false;
          
          for (let i = 0; i < postData.images.length; i++) {
            const image = postData.images[i];
            if (ProfileImageService.isLocalFile(image)) {
              console.log(`🔄 Converting post image ${i + 1} in post ${postDoc.id}...`);
              try {
                const firebaseUrl = await this.convertLocalFileToFirebase(
                  image, 
                  postData.userId || 'unknown', 
                  'postImage'
                );
                migratedImages.push(firebaseUrl);
                imagesChanged = true;
                console.log(`✅ Post image converted: ${firebaseUrl}`);
              } catch (error) {
                console.error(`❌ Failed to convert post image ${i + 1} in post ${postDoc.id}:`, error);
                // Fallback to placeholder
                migratedImages.push(ProfileImageService.getDefaultImageUrl('postImage'));
                imagesChanged = true;
              }
            } else {
              migratedImages.push(image);
            }
          }
          
          if (imagesChanged) {
            updates.images = migratedImages;
            needsUpdate = true;
          }
        }
        
        if (needsUpdate) {
          await updateDoc(doc(db, 'posts', postDoc.id), updates);
          migratedCount++;
        }
      }
      
      console.log(`✅ Migrated ${migratedCount} posts`);
    } catch (error) {
      console.error('❌ Error migrating posts:', error);
      throw error;
    }
  }

  /**
   * Convert a local file to Firebase Storage URL
   */
  static async convertLocalFileToFirebase(
    localFilePath: string, 
    userId: string, 
    type: 'profile' | 'banner' | 'postImage'
  ): Promise<string> {
    try {
      console.log(`📤 Converting local file to Firebase Storage: ${localFilePath}`);
      
      // Fetch the local file
      const response = await fetch(localFilePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch local file: ${response.status}`);
      }
      
      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        throw new Error('Invalid or empty file blob');
      }
      
      // Create unique filename
      const timestamp = Date.now();
      const fileExtension = localFilePath.split('.').pop() || 'jpg';
      const fileName = `${type}_${userId}_${timestamp}.${fileExtension}`;
      const storagePath = `users/${userId}/${fileName}`;
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, blob);
      
      // Get public download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      console.log(`✅ File converted successfully: ${downloadURL}`);
      return downloadURL;
    } catch (error) {
      console.error(`❌ Error converting local file to Firebase:`, error);
      throw error;
    }
  }

  /**
   * Check if there are any local files that need migration
   */
  static async checkMigrationNeeded(): Promise<{
    usersWithLocalFiles: number;
    postsWithLocalFiles: number;
    totalUsers: number;
    totalPosts: number;
  }> {
    try {
      console.log('🔍 Checking for local files that need migration...');
      
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
        usersWithLocalFiles,
        postsWithLocalFiles,
        totalUsers: usersSnapshot.size,
        totalPosts: postsSnapshot.size
      };
    } catch (error) {
      console.error('❌ Error checking migration status:', error);
      throw error;
    }
  }
} 