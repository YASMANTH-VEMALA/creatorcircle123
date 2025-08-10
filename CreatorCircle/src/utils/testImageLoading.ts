import { ImageUtils } from './imageUtils';
import { ProfileImageService } from '../services/profileImageService';

export class TestImageLoading {
  /**
   * Test image loading with various URL types
   */
  static async testImageLoading(): Promise<void> {
    console.log('🧪 Testing image loading...');
    
    // Test 1: Local file paths
    const localFilePaths = [
      'file:///var/mobile/Containers/Data/Application/123/ImagePicker/abc123.jpg',
      '/var/mobile/Containers/Data/Application/123/ImagePicker/def456.png',
      'file:///data/user/0/com.example.app/files/ghi789.jpeg'
    ];
    
    console.log('📁 Testing local file path detection...');
    localFilePaths.forEach(path => {
      const isLocal = ProfileImageService.isLocalFile(path);
      const fallback = ImageUtils.getDefaultImageUrl('profile');
      console.log(`  ${path} -> isLocal: ${isLocal}, fallback: ${fallback}`);
    });
    
    // Test 2: Valid URLs
    const validUrls = [
      'https://via.placeholder.com/200x200/007AFF/FFFFFF?text=Profile',
      'https://firebasestorage.googleapis.com/v0/b/project/o/users%2F123%2Fprofile.jpg?alt=media',
      'https://example.com/image.jpg'
    ];
    
    console.log('🌐 Testing valid URL detection...');
    validUrls.forEach(url => {
      const isLocal = ProfileImageService.isLocalFile(url);
      const validated = ImageUtils.validateImageUrl(url);
      console.log(`  ${url} -> isLocal: ${isLocal}, validated: ${validated}`);
    });
    
    // Test 3: Empty/invalid URLs
    const invalidUrls = [
      '',
      'not-a-url',
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    ];
    
    console.log('❌ Testing invalid URL handling...');
    invalidUrls.forEach(url => {
      const fallback = ImageUtils.getDefaultImageUrl('profile');
      console.log(`  "${url}" -> fallback: ${fallback}`);
    });
    
    console.log('✅ Image loading tests completed!');
  }
  
  /**
   * Test placeholder URL generation
   */
  static testPlaceholderUrls(): void {
    console.log('🎨 Testing placeholder URL generation...');
    
    const types = ['profile', 'banner', 'postImage'] as const;
    
    types.forEach(type => {
      const url = ImageUtils.getDefaultImageUrl(type);
      console.log(`  ${type}: ${url}`);
    });
    
    console.log('✅ Placeholder URL tests completed!');
  }
  
  /**
   * Test image source generation
   */
  static testImageSourceGeneration(): void {
    console.log('🖼️ Testing image source generation...');
    
    const testUrls = [
      'https://via.placeholder.com/200x200/007AFF/FFFFFF?text=Profile',
      'file:///var/mobile/Containers/Data/Application/123/ImagePicker/abc123.jpg',
      '',
      'not-a-url'
    ];
    
    testUrls.forEach(url => {
      const source = ImageUtils.getImageSource(url);
      console.log(`  "${url}" -> ${JSON.stringify(source)}`);
    });
    
    console.log('✅ Image source generation tests completed!');
  }
} 