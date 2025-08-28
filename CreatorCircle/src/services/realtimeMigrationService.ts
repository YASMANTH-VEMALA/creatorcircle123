import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ProfileImageService } from './profileImageService';
import { AutoMigration } from '../utils/autoMigration';

export class RealtimeMigrationService {
  private static isMonitoring = false;
  private static userUnsubscribe: (() => void) | null = null;
  private static postUnsubscribe: (() => void) | null = null;

  /**
   * Start monitoring for local files and automatically convert them
   */
  static startMonitoring(): void {
    if (this.isMonitoring) {
      console.log('⚠️ Already monitoring for local files');
      return;
    }

    console.log('🔍 Starting real-time monitoring for local files...');
    this.isMonitoring = true;

    // Monitor users collection
    this.userUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        try {
          if (change.type === 'modified' || change.type === 'added') {
            const data = change.doc.data();
            // Validate user data before processing
            if (data && data.id && typeof data.id === 'string' && data.id.trim() !== '') {
              await this.checkAndConvertUserFiles(change.doc);
            } else {
              console.warn(`⚠️ Skipping invalid user in migration service: ${change.doc.id}`);
            }
          }
        } catch (error) {
          console.error(`❌ Error processing user change in migration service:`, error);
        }
      });
    });

    // Monitor posts collection
    this.postUnsubscribe = onSnapshot(collection(db, 'posts'), (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        try {
          if (change.type === 'modified' || change.type === 'added') {
            const data = change.doc.data();
            // Validate post data before processing
            if (data && data.userId && typeof data.userId === 'string' && data.userId.trim() !== '') {
              await this.checkAndConvertPostFiles(change.doc);
            } else {
              console.warn(`⚠️ Skipping invalid post in migration service: ${change.doc.id}`);
            }
          }
        } catch (error) {
          console.error(`❌ Error processing post change in migration service:`, error);
        }
      });
    });

    console.log('✅ Real-time monitoring started');
  }

  /**
   * Stop monitoring for local files
   */
  static stopMonitoring(): void {
    if (!this.isMonitoring) {
      console.log('⚠️ Not currently monitoring');
      return;
    }

    console.log('🛑 Stopping real-time monitoring...');
    
    if (this.userUnsubscribe) {
      this.userUnsubscribe();
      this.userUnsubscribe = null;
    }
    
    if (this.postUnsubscribe) {
      this.postUnsubscribe();
      this.postUnsubscribe = null;
    }
    
    this.isMonitoring = false;
    console.log('✅ Real-time monitoring stopped');
  }

  /**
   * Check and convert user files if they contain local paths
   */
  private static async checkAndConvertUserFiles(userDoc: any): Promise<void> {
    try {
      const userData = userDoc.data();
      let needsUpdate = false;
      const updates: any = {};

      // Check profile photo
      if (userData.profilePhotoUrl && ProfileImageService.isLocalFile(userData.profilePhotoUrl)) {
        console.log(`🔄 Auto-converting profile photo for user ${userDoc.id}...`);
        try {
          const firebaseUrl = await AutoMigration.convertLocalFileToFirebase(
            userData.profilePhotoUrl,
            userDoc.id,
            'profile'
          );
          updates.profilePhotoUrl = firebaseUrl;
          needsUpdate = true;
          console.log(`✅ Profile photo auto-converted: ${firebaseUrl}`);
        } catch (error) {
          console.error(`❌ Failed to auto-convert profile photo for user ${userDoc.id}:`, error);
          updates.profilePhotoUrl = ProfileImageService.getDefaultImageUrl('profile');
          needsUpdate = true;
        }
      }

      // Check banner photo
      if (userData.bannerPhotoUrl && ProfileImageService.isLocalFile(userData.bannerPhotoUrl)) {
        console.log(`🔄 Auto-converting banner photo for user ${userDoc.id}...`);
        try {
          const firebaseUrl = await AutoMigration.convertLocalFileToFirebase(
            userData.bannerPhotoUrl,
            userDoc.id,
            'banner'
          );
          updates.bannerPhotoUrl = firebaseUrl;
          needsUpdate = true;
          console.log(`✅ Banner photo auto-converted: ${firebaseUrl}`);
        } catch (error) {
          console.error(`❌ Failed to auto-convert banner photo for user ${userDoc.id}:`, error);
          updates.bannerPhotoUrl = ProfileImageService.getDefaultImageUrl('banner');
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await updateDoc(doc(db, 'users', userDoc.id), updates);
        console.log(`✅ User ${userDoc.id} updated with Firebase URLs`);
      }
    } catch (error) {
      console.error(`❌ Error auto-converting user files for ${userDoc.id}:`, error);
    }
  }

  /**
   * Check and convert post files if they contain local paths
   */
  private static async checkAndConvertPostFiles(postDoc: any): Promise<void> {
    try {
      const postData = postDoc.data();
      let needsUpdate = false;
      const updates: any = {};

      // Check user avatar
      if (postData.userAvatar && ProfileImageService.isLocalFile(postData.userAvatar)) {
        console.log(`🔄 Auto-converting user avatar in post ${postDoc.id}...`);
        try {
          const firebaseUrl = await AutoMigration.convertLocalFileToFirebase(
            postData.userAvatar,
            postData.userId || 'unknown',
            'profile'
          );
          updates.userAvatar = firebaseUrl;
          needsUpdate = true;
          console.log(`✅ User avatar auto-converted: ${firebaseUrl}`);
        } catch (error) {
          console.error(`❌ Failed to auto-convert user avatar in post ${postDoc.id}:`, error);
          updates.userAvatar = ProfileImageService.getDefaultImageUrl('profile');
          needsUpdate = true;
        }
      }

      // Check post images
      if (postData.images && Array.isArray(postData.images)) {
        const convertedImages = [];
        let imagesChanged = false;

        for (let i = 0; i < postData.images.length; i++) {
          const image = postData.images[i];
          if (ProfileImageService.isLocalFile(image)) {
            console.log(`🔄 Auto-converting post image ${i + 1} in post ${postDoc.id}...`);
            try {
              const firebaseUrl = await AutoMigration.convertLocalFileToFirebase(
                image,
                postData.userId || 'unknown',
                'postImage'
              );
              convertedImages.push(firebaseUrl);
              imagesChanged = true;
              console.log(`✅ Post image auto-converted: ${firebaseUrl}`);
            } catch (error) {
              console.error(`❌ Failed to auto-convert post image ${i + 1} in post ${postDoc.id}:`, error);
              convertedImages.push(ProfileImageService.getDefaultImageUrl('postImage'));
              imagesChanged = true;
            }
          } else {
            convertedImages.push(image);
          }
        }

        if (imagesChanged) {
          updates.images = convertedImages;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await updateDoc(doc(db, 'posts', postDoc.id), updates);
        console.log(`✅ Post ${postDoc.id} updated with Firebase URLs`);
      }
    } catch (error) {
      console.error(`❌ Error auto-converting post files for ${postDoc.id}:`, error);
    }
  }

  /**
   * Get monitoring status
   */
  static getMonitoringStatus(): boolean {
    return this.isMonitoring;
  }
} 