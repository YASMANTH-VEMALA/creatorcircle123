import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { Platform } from 'react-native';

export class ProfileImageService {
  /**
   * Upload a single profile image to Firebase Storage
   */
  static async uploadProfileImage(uri: string, userId: string, type: 'profile' | 'banner'): Promise<string> {
    try {
      console.log(`📤 Uploading ${type} image for user ${userId}...`);
      
      // Convert URI to blob
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        throw new Error('Invalid or empty image blob');
      }
      
      // Create unique filename
      const timestamp = Date.now();
      const fileExtension = uri.split('.').pop() || 'jpg';
      const fileName = `${type}_${userId}_${timestamp}.${fileExtension}`;
      const storagePath = `users/${userId}/${fileName}`;
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, blob);
      
      // Get public download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      console.log(`✅ ${type} image uploaded successfully: ${downloadURL}`);
      return downloadURL;
    } catch (error) {
      console.error(`❌ Error uploading ${type} image:`, error);
      throw error;
    }
  }

  /**
   * Upload multiple profile images to Firebase Storage
   */
  static async uploadProfileImages(
    profileUri: string | null, 
    bannerUri: string | null, 
    userId: string
  ): Promise<{ profilePhotoUrl: string; bannerPhotoUrl: string }> {
    try {
      console.log(`📤 Uploading profile images for user ${userId}...`);
      
      let profilePhotoUrl = '';
      let bannerPhotoUrl = '';
      
      // Upload profile photo if provided
      if (profileUri) {
        profilePhotoUrl = await this.uploadProfileImage(profileUri, userId, 'profile');
      }
      
      // Upload banner photo if provided
      if (bannerUri) {
        bannerPhotoUrl = await this.uploadProfileImage(bannerUri, userId, 'banner');
      }
      
      console.log(`✅ Profile images uploaded successfully`);
      return { profilePhotoUrl, bannerPhotoUrl };
    } catch (error) {
      console.error('❌ Error uploading profile images:', error);
      throw error;
    }
  }

  /**
   * Check if a URL is a local file path
   */
  static isLocalFile(url: string): boolean {
    if (!url) return false;
    
    return url.startsWith('file://') || 
           url.startsWith('/var/') || 
           url.startsWith('/data/') ||
           url.startsWith('/storage/') ||
           url.includes('ImagePicker/') ||
           url.includes('Containers/Data/Application/') ||
           url.includes('.jpeg') && !url.startsWith('http') ||
           url.includes('.jpg') && !url.startsWith('http') ||
           url.includes('.png') && !url.startsWith('http');
  }

  /**
   * Validate and clean image URL
   */
  static validateImageUrl(url: string): string {
    if (!url || url.trim() === '') {
      console.warn('⚠️ Empty image URL provided');
      return this.getDefaultImageUrl('profile');
    }

    // Handle local file paths
    if (this.isLocalFile(url)) {
      console.warn(`⚠️ Local file URL detected: ${url}`);
      return this.getDefaultImageUrl('profile');
    }
    
    // Ensure URL is properly formatted for remote URLs
    if (!url.startsWith('http://') && !url.startsWith('https://') && !this.isLocalFile(url)) {
      console.warn(`⚠️ Invalid image URL format: ${url}`);
      return this.getDefaultImageUrl('profile');
    }

    return url;
  }

  /**
   * Get default image URL using reliable placeholder services
   */
  static getDefaultImageUrl(type: 'profile' | 'banner' | 'postImage'): string {
    // Use reliable placeholder services instead of non-existent Firebase URLs
    const defaultImages = {
      profile: 'https://via.placeholder.com/200x200/007AFF/FFFFFF?text=Profile',
      banner: 'https://via.placeholder.com/400x200/007AFF/FFFFFF?text=Banner',
      postImage: 'https://via.placeholder.com/300x200/007AFF/FFFFFF?text=Image'
    };
    
    return defaultImages[type] || defaultImages.profile;
  }

  /**
   * Get placeholder URL (deprecated - use getDefaultImageUrl instead)
   */
  static getPlaceholderUrl(type: 'profile' | 'banner' | 'postImage'): string {
    return this.getDefaultImageUrl(type);
  }

  /**
   * Fetch image from Firebase Storage if it's a storage reference
   */
  static async getFirebaseImageUrl(storagePath: string): Promise<string> {
    try {
      if (!storagePath.startsWith('gs://') && !storagePath.startsWith('firebase://')) {
        return storagePath; // Already a public URL
      }
      
      const storageRef = ref(storage, storagePath);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('❌ Error fetching Firebase image URL:', error);
      return this.getDefaultImageUrl('profile');
    }
  }
} 