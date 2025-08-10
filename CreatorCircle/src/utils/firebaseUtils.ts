import { Platform } from 'react-native';
import { db, storage, auth } from '../config/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';

export class FirebaseUtils {
  /**
   * Test Firebase connection and log platform-specific information
   */
  static async testFirebaseConnection(): Promise<boolean> {
    try {
      console.log(`🔗 Testing Firebase connection on ${Platform.OS}...`);
      
      // Test Firestore connection
      const testQuery = query(collection(db, 'posts'), limit(1));
      const snapshot = await getDocs(testQuery);
      
      console.log(`✅ Firebase connection successful on ${Platform.OS}`);
      console.log(`📊 Found ${snapshot.docs.length} test documents`);
      
      // Log platform-specific info
      console.log(`📱 Platform: ${Platform.OS}`);
      console.log(`🔧 Platform Version: ${Platform.Version}`);
      console.log(`🏗️ Architecture: ${Platform.OS === 'android' ? 'Android' : 'iOS'}`);
      
      return true;
    } catch (error) {
      console.error(`❌ Firebase connection failed on ${Platform.OS}:`, error);
      return false;
    }
  }

  /**
   * Get platform-specific Firebase configuration info
   */
  static getFirebaseConfigInfo() {
    return {
      platform: Platform.OS,
      platformVersion: Platform.Version,
      firestoreEnabled: !!db,
      storageEnabled: !!storage,
      authEnabled: !!auth,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate Firebase project configuration
   */
  static async validateFirebaseProject(): Promise<{
    isValid: boolean;
    collections: string[];
    errors: string[];
  }> {
    const result = {
      isValid: true,
      collections: [] as string[],
      errors: [] as string[]
    };

    try {
      console.log(`🔍 Validating Firebase project on ${Platform.OS}...`);
      
      // Test common collections
      const collectionsToTest = ['users', 'posts', 'notifications'];
      
      for (const collectionName of collectionsToTest) {
        try {
          const testQuery = query(collection(db, collectionName), limit(1));
          const snapshot = await getDocs(testQuery);
          result.collections.push(collectionName);
          console.log(`✅ Collection '${collectionName}' accessible`);
        } catch (error) {
          console.error(`❌ Collection '${collectionName}' not accessible:`, error);
          result.errors.push(`Collection '${collectionName}' error: ${error}`);
          result.isValid = false;
        }
      }
      
      console.log(`📊 Firebase project validation complete on ${Platform.OS}`);
      return result;
    } catch (error) {
      console.error(`❌ Firebase project validation failed on ${Platform.OS}:`, error);
      result.isValid = false;
      result.errors.push(`General validation error: ${error}`);
      return result;
    }
  }

  /**
   * Get platform-specific error handling
   */
  static getPlatformErrorHandler(context: string) {
    return (error: any) => {
      console.error(`❌ Firebase error in ${context} (${Platform.OS}):`, {
        error: error?.message || error,
        code: error?.code,
        platform: Platform.OS,
        timestamp: new Date().toISOString()
      });
    };
  }

  /**
   * Check if Firebase is properly initialized
   */
  static isFirebaseInitialized(): boolean {
    return !!(db && storage && auth);
  }

  /**
   * Get platform-specific logging prefix
   */
  static getLogPrefix(context: string): string {
    return `[${Platform.OS.toUpperCase()}] ${context}`;
  }
} 