import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

export class FileUploadService {
  // Test Firebase Storage connectivity
  static async testStorageConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing Firebase Storage connection...');
      
      // Create a simple test blob
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      const testPath = `test/connectivity_${Date.now()}.txt`;
      const storageRef = ref(storage, testPath);
      
      // Try to upload the test file
      const snapshot = await uploadBytes(storageRef, testBlob);
      console.log('✅ Test upload successful');
      
      // Try to get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('✅ Test download URL obtained:', downloadURL);
      
      return true;
    } catch (error) {
      console.error('❌ Storage connectivity test failed:', {
        error: error instanceof Error ? error.message : error,
        errorCode: (error as any)?.code
      });
      return false;
    }
  }

  static async uploadFile(fileUri: string, path: string): Promise<string> {
    try {
      console.log('🔄 Starting file upload:', { fileUri, path });
      
      // Validate inputs
      if (!fileUri) {
        throw new Error('File URI is required');
      }
      if (!path) {
        throw new Error('Storage path is required');
      }
      
      console.log('📱 Converting file URI to blob...');
      
      // Convert file URI to blob with better error handling
      const response = await fetch(fileUri);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      if (!blob || blob.size === 0) {
        throw new Error('Invalid or empty file blob');
      }
      
      console.log('✅ Blob created successfully:', { 
        size: blob.size, 
        type: blob.type 
      });
      
      console.log('☁️ Creating storage reference...');
      
      // Create storage reference
      const storageRef = ref(storage, path);
      
      console.log('⬆️ Uploading to Firebase Storage...');
      
      // Upload file with metadata
      const metadata = {
        contentType: blob.type,
        customMetadata: {
          uploadedAt: new Date().toISOString(),
        }
      };
      
      const snapshot = await uploadBytes(storageRef, blob, metadata);
      
      console.log('✅ Upload completed:', {
        fullPath: snapshot.ref.fullPath,
        size: snapshot.metadata.size,
        contentType: snapshot.metadata.contentType
      });
      
      console.log('🔗 Getting download URL...');
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('✅ File uploaded successfully:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error('❌ Error uploading file:', {
        fileUri,
        path,
        error: error instanceof Error ? error.message : error,
        errorCode: (error as any)?.code,
        errorDetails: (error as any)?.details
      });
      
      // Provide more specific error messages
      if ((error as any)?.code === 'storage/unauthorized') {
        throw new Error('Storage access denied. Please check Firebase Storage rules.');
      } else if ((error as any)?.code === 'storage/canceled') {
        throw new Error('Upload was canceled.');
      } else if ((error as any)?.code === 'storage/unknown') {
        throw new Error('Unknown storage error. Please check your internet connection and try again.');
      } else if ((error as any)?.code === 'storage/invalid-format') {
        throw new Error('Invalid file format. Please select a different file.');
      } else if ((error as any)?.code === 'storage/object-not-found') {
        throw new Error('File not found. Please try selecting the file again.');
      }
      
      throw error;
    }
  }

  static async uploadImage(imageUri: string, userId: string, postId: string, index: number): Promise<string> {
    const timestamp = Date.now();
    const path = `posts/${userId}/${postId}/images/image_${index}_${timestamp}.jpg`;
    console.log('📸 Uploading image:', { imageUri, path });
    return this.uploadFile(imageUri, path);
  }

  static async uploadVideo(videoUri: string, userId: string, postId: string, index: number): Promise<string> {
    const timestamp = Date.now();
    const path = `posts/${userId}/${postId}/videos/video_${index}_${timestamp}.mp4`;
    console.log('🎥 Uploading video:', { videoUri, path });
    return this.uploadFile(videoUri, path);
  }

  static async uploadMultipleImages(imageUris: string[], userId: string, postId: string): Promise<string[]> {
    console.log(`📸 Uploading ${imageUris.length} images...`);
    const uploadPromises = imageUris.map((uri, index) => 
      this.uploadImage(uri, userId, postId, index)
    );
    return Promise.all(uploadPromises);
  }

  static async uploadMultipleVideos(videoUris: string[], userId: string, postId: string): Promise<string[]> {
    console.log(`🎥 Uploading ${videoUris.length} videos...`);
    const uploadPromises = videoUris.map((uri, index) => 
      this.uploadVideo(uri, userId, postId, index)
    );
    return Promise.all(uploadPromises);
  }
} 