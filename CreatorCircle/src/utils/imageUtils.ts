import { Platform } from 'react-native';
import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../config/firebase';
import { Image } from 'react-native';

export interface ImageSource {
  uri: string;
  cache?: 'default' | 'reload' | 'force-cache' | 'only-if-cached';
  headers?: { [key: string]: string };
}

export class ImageUtils {
  /**
   * Check if a URI is a local file path
   */
  static isLocalFile(uri: string): boolean {
    return uri.startsWith('file://') || 
           uri.startsWith('/var/') || 
           uri.startsWith('/data/') ||
           uri.startsWith('/storage/') ||
           !uri.startsWith('http');
  }

  /**
   * Check if a URI is a Firebase Storage URL
   */
  static isFirebaseStorageUrl(url: string): boolean {
    return url.includes('firebasestorage.googleapis.com') || 
           url.includes('firebaseapp.com');
  }

  /**
   * Get optimized image source for the current platform
   */
  static getImageSource(uri: string, options?: {
    cache?: 'default' | 'reload' | 'force-cache' | 'only-if-cached';
    headers?: { [key: string]: string };
  }): ImageSource {
    // Handle empty, undefined, or invalid URIs
    if (!uri || uri.trim() === '' || uri === 'undefined' || uri === 'null') {
      console.warn('⚠️ Empty, undefined, or invalid image URI provided:', uri);
      return {
        uri: 'https://via.placeholder.com/100x100/007AFF/FFFFFF?text=No+Image',
        cache: 'default'
      };
    }

    // Handle local file paths (common Android issue)
    if (this.isLocalFile(uri)) {
      console.log(`📁 Local file detected: ${uri}`);
      
      // For Android, local files might not be accessible
      if (Platform.OS === 'android') {
        console.warn(`⚠️ Local file on Android may not be accessible: ${uri}`);
        // Return a placeholder for local files on Android
        return {
          uri: 'https://via.placeholder.com/100x100/007AFF/FFFFFF?text=Local+File',
          cache: 'default'
        };
      }
    }

    const defaultOptions = {
      cache: Platform.OS === 'android' ? 'force-cache' : 'default' as const,
      headers: Platform.OS === 'android' ? {
        'Cache-Control': 'max-age=31536000',
        'User-Agent': 'CreatorCircle/1.0'
      } : undefined
    };

    return {
      uri: this.validateImageUrl(uri),
      cache: options?.cache || defaultOptions.cache,
      headers: options?.headers || defaultOptions.headers
    };
  }

  /**
   * Get Firebase Storage download URL with error handling
   */
  static async getFirebaseImageUrl(path: string): Promise<string | null> {
    try {
      console.log(`🖼️ Getting Firebase Storage URL for: ${path}`);
      const storageRef = ref(storage, path);
      const url = await getDownloadURL(storageRef);
      console.log(`✅ Firebase Storage URL obtained: ${url}`);
      return url;
    } catch (error) {
      console.error(`❌ Error getting Firebase Storage URL for ${path}:`, error);
      return null;
    }
  }

  /**
   * Validate image URL and return fallback if needed
   */
  static validateImageUrl(url: string): string {
    if (!url || url.trim() === '' || url === 'undefined' || url === 'null') {
      console.warn('⚠️ Empty, undefined, or null image URL provided:', url);
      return this.getDefaultImageUrl('profile');
    }

    // Handle local file paths
    if (this.isLocalFile(url)) {
      console.warn(`⚠️ Local file URL detected: ${url}`);
      if (Platform.OS === 'android') {
        return this.getDefaultImageUrl('profile');
      }
      // For iOS, we can try to keep it, but it might not work
      return url;
    }
    
    // Ensure URL is properly formatted for remote URLs
    if (!url.startsWith('http://') && !url.startsWith('https://') && !this.isLocalFile(url)) {
      console.warn(`⚠️ Invalid image URL format: ${url}`);
      return this.getDefaultImageUrl('profile');
    }

    // Add platform-specific URL modifications if needed
    if (Platform.OS === 'android') {
      // Android-specific URL handling
      if (url.includes('firebasestorage.googleapis.com')) {
        // Ensure Firebase Storage URLs work on Android
        return url;
      }
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
   * Get image loading error handler with enhanced logging
   */
  static getImageErrorHandler(context: string) {
    return (error: any) => {
      const errorInfo = {
        context,
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
        errorMessage: error?.message || error?.nativeEvent?.error || 'Unknown error',
        errorCode: error?.code,
        target: error?.target,
        uri: error?.nativeEvent?.uri
      };
      
      console.error(`❌ Image loading error in ${context}:`, errorInfo);
      
      // Log specific local file errors
      if (errorInfo.errorMessage?.includes('ENOENT') || 
          errorInfo.errorMessage?.includes('no such file') ||
          errorInfo.errorMessage?.includes('couldn\'t be opened')) {
        console.error(`🚨 Local file error: File not found or not accessible`);
        console.error(`📁 File path: ${errorInfo.uri}`);
        console.error(`💡 Solution: Use Firebase Storage URLs instead of local file paths`);
        console.error(`🔧 Context: ${context}`);
      }
    };
  }

  /**
   * Get image loading success handler
   */
  static getImageSuccessHandler(context: string) {
    return () => {
      console.log(`✅ Image loaded successfully in ${context} (${Platform.OS})`);
    };
  }

  /**
   * Get platform-specific image cache strategy
   */
  static getCacheStrategy(): 'default' | 'reload' | 'force-cache' | 'only-if-cached' {
    if (Platform.OS === 'android') {
      return 'force-cache';
    }
    return 'default';
  }

  /**
   * Get platform-specific headers for image requests
   */
  static getImageHeaders(): { [key: string]: string } | undefined {
    if (Platform.OS === 'android') {
      return {
        'Cache-Control': 'max-age=31536000',
        'User-Agent': 'CreatorCircle/1.0',
        'Accept': 'image/*'
      };
    }
    return undefined;
  }

  /**
   * Get a safe fallback image source
   */
  static getFallbackImageSource(context: string = 'unknown'): ImageSource {
    return {
      uri: 'https://via.placeholder.com/100x100/007AFF/FFFFFF?text=Error',
      cache: 'default'
    };
  }

  /**
   * Validate if a URL is a valid image URL
   */
  static isValidImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }

    const trimmedUrl = url.trim();
    if (trimmedUrl === '') {
      return false;
    }

    // Check if it's a valid URL format
    try {
      new URL(trimmedUrl);
    } catch {
      return false;
    }

    // Check for common image extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const lowerUrl = trimmedUrl.toLowerCase();
    const hasImageExtension = imageExtensions.some(ext => lowerUrl.includes(ext));
    
    // Check for Firebase Storage URLs
    const isFirebaseStorageUrl = lowerUrl.includes('firebasestorage.googleapis.com');
    
    // Check for data URLs
    const isDataUrl = lowerUrl.startsWith('data:image/');
    
    return hasImageExtension || isFirebaseStorageUrl || isDataUrl;
  }

  /**
   * Preload an image to check if it's accessible
   */
  static async preloadImage(url: string): Promise<boolean> {
    if (!this.isValidImageUrl(url)) {
      return false;
    }

    try {
      await Image.prefetch(url);
      return true;
    } catch (error) {
      console.error('Image preload failed:', error);
      return false;
    }
  }

  /**
   * Get a fallback image URL for failed images
   */
  static getFallbackImageUrl(): string {
    // Return a placeholder image URL or base64 encoded image
    return 'https://via.placeholder.com/400x300/f0f0f0/cccccc?text=Image+Not+Available';
  }

  /**
   * Retry loading an image with exponential backoff
   */
  static async retryImageLoad(
    url: string, 
    maxRetries: number = 3, 
    baseDelay: number = 1000
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const success = await this.preloadImage(url);
        if (success) {
          return true;
        }
      } catch (error) {
        console.error(`Image load attempt ${attempt} failed:`, error);
      }

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return false;
  }

  /**
   * Clean up Firebase Storage URL (remove unnecessary parameters)
   */
  static cleanFirebaseUrl(url: string): string {
    if (!url || !url.includes('firebasestorage.googleapis.com')) {
      return url;
    }

    try {
      const urlObj = new URL(url);
      // Remove any unnecessary query parameters that might cause issues
      const cleanUrl = `${urlObj.origin}${urlObj.pathname}`;
      return cleanUrl;
    } catch {
      return url;
    }
  }

  /**
   * Check if image is accessible by making a HEAD request
   */
  static async checkImageAccessibility(url: string): Promise<boolean> {
    if (!this.isValidImageUrl(url)) {
      return false;
    }

    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.error('Image accessibility check failed:', error);
      return false;
    }
  }
} 