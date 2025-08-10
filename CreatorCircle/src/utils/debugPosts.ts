import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ProfileImageService } from '../services/profileImageService';

export class DebugPosts {
  /**
   * Debug posts to check user avatar status
   */
  static async debugPosts(): Promise<void> {
    try {
      console.log('🔍 Debugging posts...');
      
      const postsRef = collection(db, 'posts');
      const snapshot = await getDocs(postsRef);
      
      console.log(`📊 Found ${snapshot.size} posts`);
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const userAvatar = data.userAvatar || '';
        const isLocal = ProfileImageService.isLocalFile(userAvatar);
        const isEmpty = !userAvatar || userAvatar.trim() === '';
        
        console.log(`📝 Post ${doc.id}:`);
        console.log(`  User: ${data.userName || 'Unknown'}`);
        console.log(`  Avatar: ${userAvatar}`);
        console.log(`  Is Local: ${isLocal}`);
        console.log(`  Is Empty: ${isEmpty}`);
        console.log(`  Would Use Fallback: ${isLocal || isEmpty}`);
      });
      
      console.log('✅ Post debugging completed');
    } catch (error) {
      console.error('❌ Error debugging posts:', error);
    }
  }

  /**
   * Debug users to check profile photo status
   */
  static async debugUsers(): Promise<void> {
    try {
      console.log('🔍 Debugging users...');
      
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      console.log(`📊 Found ${snapshot.size} users`);
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const profilePhoto = data.profilePhotoUrl || '';
        const bannerPhoto = data.bannerPhotoUrl || '';
        const isProfileLocal = ProfileImageService.isLocalFile(profilePhoto);
        const isBannerLocal = ProfileImageService.isLocalFile(bannerPhoto);
        
        console.log(`👤 User ${doc.id}:`);
        console.log(`  Name: ${data.name || 'Unknown'}`);
        console.log(`  Profile Photo: ${profilePhoto}`);
        console.log(`  Profile Is Local: ${isProfileLocal}`);
        console.log(`  Banner Photo: ${bannerPhoto}`);
        console.log(`  Banner Is Local: ${isBannerLocal}`);
      });
      
      console.log('✅ User debugging completed');
    } catch (error) {
      console.error('❌ Error debugging users:', error);
    }
  }

  /**
   * Get summary of data issues
   */
  static async getDataSummary(): Promise<{
    totalPosts: number;
    postsWithLocalAvatars: number;
    postsWithEmptyAvatars: number;
    totalUsers: number;
    usersWithLocalPhotos: number;
    usersWithEmptyPhotos: number;
  }> {
    try {
      // Check posts
      const postsRef = collection(db, 'posts');
      const postsSnapshot = await getDocs(postsRef);
      
      let postsWithLocalAvatars = 0;
      let postsWithEmptyAvatars = 0;
      
      postsSnapshot.forEach((doc) => {
        const data = doc.data();
        const userAvatar = data.userAvatar || '';
        const isLocal = ProfileImageService.isLocalFile(userAvatar);
        const isEmpty = !userAvatar || userAvatar.trim() === '';
        
        if (isLocal) postsWithLocalAvatars++;
        if (isEmpty) postsWithEmptyAvatars++;
      });
      
      // Check users
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      let usersWithLocalPhotos = 0;
      let usersWithEmptyPhotos = 0;
      
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        const profilePhoto = data.profilePhotoUrl || '';
        const bannerPhoto = data.bannerPhotoUrl || '';
        const isProfileLocal = ProfileImageService.isLocalFile(profilePhoto);
        const isBannerLocal = ProfileImageService.isLocalFile(bannerPhoto);
        const isProfileEmpty = !profilePhoto || profilePhoto.trim() === '';
        const isBannerEmpty = !bannerPhoto || bannerPhoto.trim() === '';
        
        if (isProfileLocal || isBannerLocal) usersWithLocalPhotos++;
        if (isProfileEmpty || isBannerEmpty) usersWithEmptyPhotos++;
      });
      
      return {
        totalPosts: postsSnapshot.size,
        postsWithLocalAvatars,
        postsWithEmptyAvatars,
        totalUsers: usersSnapshot.size,
        usersWithLocalPhotos,
        usersWithEmptyPhotos
      };
    } catch (error) {
      console.error('❌ Error getting data summary:', error);
      throw error;
    }
  }
} 