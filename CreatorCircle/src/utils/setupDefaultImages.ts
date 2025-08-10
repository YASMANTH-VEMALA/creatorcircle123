import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

export class DefaultImageSetup {
  /**
   * Upload default images to Firebase Storage
   */
  static async uploadDefaultImages(): Promise<void> {
    try {
      console.log('📤 Uploading default images to Firebase Storage...');
      
      // Create simple default images as base64 data
      const defaultImages = {
        profile: this.createDefaultProfileImage(),
        banner: this.createDefaultBannerImage(),
        postImage: this.createDefaultPostImage()
      };
      
      for (const [type, imageData] of Object.entries(defaultImages)) {
        await this.uploadDefaultImage(type, imageData);
      }
      
      console.log('✅ Default images uploaded successfully');
    } catch (error) {
      console.error('❌ Error uploading default images:', error);
    }
  }

  /**
   * Upload a single default image
   */
  private static async uploadDefaultImage(type: string, imageData: string): Promise<void> {
    try {
      // Convert base64 to blob
      const response = await fetch(imageData);
      const blob = await response.blob();
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, `defaults/default-${type}.png`);
      await uploadBytes(storageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log(`✅ Default ${type} image uploaded: ${downloadURL}`);
    } catch (error) {
      console.error(`❌ Error uploading default ${type} image:`, error);
    }
  }

  /**
   * Create a simple default profile image
   */
  private static createDefaultProfileImage(): string {
    // Simple SVG-based profile image
    const svg = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="#007AFF"/>
        <circle cx="100" cy="80" r="30" fill="white"/>
        <path d="M 50 140 Q 100 100 150 140" stroke="white" stroke-width="8" fill="none"/>
        <text x="100" y="180" text-anchor="middle" fill="white" font-size="16" font-family="Arial">Profile</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  /**
   * Create a simple default banner image
   */
  private static createDefaultBannerImage(): string {
    // Simple SVG-based banner image
    const svg = `
      <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="200" fill="#007AFF"/>
        <rect x="50" y="50" width="300" height="100" fill="rgba(255,255,255,0.2)"/>
        <text x="200" y="110" text-anchor="middle" fill="white" font-size="24" font-family="Arial">Banner Image</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  /**
   * Create a simple default post image
   */
  private static createDefaultPostImage(): string {
    // Simple SVG-based post image
    const svg = `
      <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="300" height="200" fill="#f0f0f0"/>
        <rect x="50" y="50" width="200" height="100" fill="#007AFF"/>
        <text x="150" y="110" text-anchor="middle" fill="white" font-size="16" font-family="Arial">Post Image</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }
} 