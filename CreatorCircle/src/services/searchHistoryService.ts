import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface ViewedProfile {
  userId: string;
  name: string;
  profilePhotoUrl?: string;
  college: string;
  viewedAt: Date;
}

export class SearchHistoryService {
  private static readonly MAX_HISTORY_SIZE = 20;

  static async addToRecentlyViewed(userId: string, profile: {
    userId: string;
    name: string;
    profilePhotoUrl?: string;
    college: string;
  }): Promise<void> {
    try {
      const historyRef = doc(db, 'searchHistory', userId);
      const historyDoc = await getDoc(historyRef);
      
      const viewedProfile: ViewedProfile = {
        ...profile,
        viewedAt: new Date(),
      };

      if (historyDoc.exists()) {
        // Get existing history
        const existingHistory = historyDoc.data().recentlyViewed || [];
        
        // Remove if already exists (to avoid duplicates)
        const filteredHistory = existingHistory.filter(
          (item: ViewedProfile) => item.userId !== profile.userId
        );
        
        // Add new profile to the beginning
        const updatedHistory = [viewedProfile, ...filteredHistory].slice(0, this.MAX_HISTORY_SIZE);
        
        await updateDoc(historyRef, {
          recentlyViewed: updatedHistory,
          lastUpdated: new Date(),
        });
      } else {
        // Create new history document
        await setDoc(historyRef, {
          recentlyViewed: [viewedProfile],
          lastUpdated: new Date(),
        });
      }
    } catch (error) {
      console.error('Error adding to recently viewed:', error);
    }
  }

  static async getRecentlyViewed(userId: string): Promise<ViewedProfile[]> {
    try {
      const historyRef = doc(db, 'searchHistory', userId);
      const historyDoc = await getDoc(historyRef);
      
      if (historyDoc.exists()) {
        const data = historyDoc.data();
        const recentlyViewed = data.recentlyViewed || [];
        
        // Convert Firestore timestamps to Date objects
        return recentlyViewed.map((profile: any) => ({
          ...profile,
          viewedAt: profile.viewedAt?.toDate ? profile.viewedAt.toDate() : new Date(profile.viewedAt?.seconds * 1000 || Date.now()),
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error getting recently viewed:', error);
      return [];
    }
  }

  static async removeFromHistory(userId: string, profileUserId: string): Promise<void> {
    try {
      const historyRef = doc(db, 'searchHistory', userId);
      const historyDoc = await getDoc(historyRef);
      
      if (historyDoc.exists()) {
        const existingHistory = historyDoc.data().recentlyViewed || [];
        const updatedHistory = existingHistory.filter(
          (item: ViewedProfile) => item.userId !== profileUserId
        );
        
        await updateDoc(historyRef, {
          recentlyViewed: updatedHistory,
          lastUpdated: new Date(),
        });
      }
    } catch (error) {
      console.error('Error removing from history:', error);
    }
  }

  static async clearHistory(userId: string): Promise<void> {
    try {
      const historyRef = doc(db, 'searchHistory', userId);
      await updateDoc(historyRef, {
        recentlyViewed: [],
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  }
} 