import { Platform } from 'react-native';
import { Post } from '../types';

export class PostUtils {
  /**
   * Clean up post data to ensure all image URLs are valid
   */
  static cleanPostData(post: Post): Post {
    const cleanedPost = { ...post };
    
    // Clean user avatar URL
    if (cleanedPost.userAvatar) {
      cleanedPost.userAvatar = this.cleanImageUrl(cleanedPost.userAvatar, 'userAvatar');
    }
    
    // Clean post images
    if (cleanedPost.images && cleanedPost.images.length > 0) {
      cleanedPost.images = cleanedPost.images.map(url => this.cleanImageUrl(url, 'postImage'));
    }
    
    // Clean post videos
    if (cleanedPost.videos && cleanedPost.videos.length > 0) {
      cleanedPost.videos = cleanedPost.videos.map(url => this.cleanImageUrl(url, 'postVideo'));
    }
    
    return cleanedPost;
  }

  /**
   * Clean a single image URL
   */
  static cleanImageUrl(url: string, context: string): string {
    if (!url || url.trim() === '') {
      console.warn(`⚠️ Empty URL in ${context}`);
      return this.getFallbackUrl(context);
    }

    // Check if it's a local file path
    if (this.isLocalFile(url)) {
      console.warn(`⚠️ Local file path detected in ${context}: ${url}`);
      
      // For Android, local files are not accessible
      if (Platform.OS === 'android') {
        return this.getFallbackUrl(context);
      }
      
      // For iOS, we can try to keep it, but it might not work
      // Log a warning and return the original URL
      console.warn(`⚠️ iOS local file path - may not work across devices: ${url}`);
      return url;
    }

    // Check if it's a valid HTTP URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      console.warn(`⚠️ Invalid URL format in ${context}: ${url}`);
      return this.getFallbackUrl(context);
    }

    return url;
  }

  /**
   * Check if a URL is a local file path
   */
  static isLocalFile(url: string): boolean {
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
   * Validate post data and return issues
   */
  static validatePost(post: Post): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check user avatar
    if (post.userAvatar && this.isLocalFile(post.userAvatar)) {
      issues.push('User avatar is a local file path');
    }
    
    // Check post images
    if (post.images) {
      post.images.forEach((image, index) => {
        if (this.isLocalFile(image)) {
          issues.push(`Post image ${index + 1} is a local file path`);
        }
      });
    }
    
    // Check post videos
    if (post.videos) {
      post.videos.forEach((video, index) => {
        if (this.isLocalFile(video)) {
          issues.push(`Post video ${index + 1} is a local file path`);
        }
      });
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Get fallback URL for different contexts
   */
  static getFallbackUrl(context: string): string {
    // Use reliable placeholder services instead of Firebase Storage URLs
    const defaultImages = {
      profile: 'https://via.placeholder.com/200x200/007AFF/FFFFFF?text=Profile',
      banner: 'https://via.placeholder.com/400x200/007AFF/FFFFFF?text=Banner',
      postImage: 'https://via.placeholder.com/300x200/007AFF/FFFFFF?text=Image'
    };
    
    if (context.includes('profile') || context.includes('avatar')) {
      return defaultImages.profile;
    } else if (context.includes('banner')) {
      return defaultImages.banner;
    } else if (context.includes('post') || context.includes('image')) {
      return defaultImages.postImage;
    }
    
    return defaultImages.profile;
  }
} 