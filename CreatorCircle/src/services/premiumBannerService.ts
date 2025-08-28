import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Banner } from '../types';
import { ProfileImageService } from './profileImageService';
import { PremiumService } from './premiumService';

export class PremiumBannerService {
  private static readonly MAX_BANNERS = 5;
  private static readonly ROTATION_INTERVAL = 5000; // 5 seconds

  /**
   * Check if user can add more banners
   */
  static async canAddBanner(userId: string): Promise<{ canAdd: boolean; currentCount: number; maxAllowed: number; message?: string }> {
    try {
      // Check if user is premium
      const subscription = await PremiumService.getUserSubscription(userId);
      if (!subscription || !subscription.isActive) {
        return {
          canAdd: false,
          currentCount: 0,
          maxAllowed: 0,
          message: 'Premium subscription required to add banners'
        };
      }

      // Get current banner count
      const userProfile = await this.getUserBanners(userId);
      const currentCount = userProfile.banners?.length || 0;

      if (currentCount >= this.MAX_BANNERS) {
        return {
          canAdd: false,
          currentCount,
          maxAllowed: this.MAX_BANNERS,
          message: `Maximum ${this.MAX_BANNERS} banners allowed`
        };
      }

      return {
        canAdd: true,
        currentCount,
        maxAllowed: this.MAX_BANNERS
      };
    } catch (error) {
      console.error('Error checking banner limit:', error);
      return {
        canAdd: false,
        currentCount: 0,
        maxAllowed: 0,
        message: 'Error checking banner limit'
      };
    }
  }

  /**
   * Add a new banner for premium user
   */
  static async addBanner(
    userId: string,
    imageUri: string,
    title?: string,
    description?: string
  ): Promise<{ success: boolean; message: string; banner?: Banner }> {
    try {
      // Check if user can add banner
      const canAdd = await this.canAddBanner(userId);
      if (!canAdd.canAdd) {
        return { success: false, message: canAdd.message || 'Cannot add banner' };
      }

      // Upload image to Firebase Storage
      const imageUrl = await ProfileImageService.uploadProfileImage(imageUri, userId, 'banner');

      // Get current banners to determine order
      const userProfile = await this.getUserBanners(userId);
      const currentBanners = userProfile.banners || [];
      const newOrder = currentBanners.length;

      // Create banner object with valid values (no undefined fields)
      const banner: Banner = {
        id: `${userId}_banner_${Date.now()}`,
        imageUrl,
        title: title || null, // Use null instead of undefined
        description: description || null, // Use null instead of undefined
        order: newOrder,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Filter out any undefined values and create clean banner object
      const cleanBanner = Object.fromEntries(
        Object.entries(banner).filter(([_, value]) => value !== undefined)
      );

      // Add banner to user profile
      const updatedBanners = [...currentBanners, cleanBanner];
      
      // Ensure all banner fields are valid before saving
      const cleanBanners = updatedBanners.map(b => ({
        ...b,
        title: b.title || null,
        description: b.description || null,
        order: b.order || 0,
        isActive: b.isActive !== undefined ? b.isActive : true,
        createdAt: b.createdAt || new Date(),
        updatedAt: b.updatedAt || new Date()
      }));

      // Debug: Log the data being sent to Firestore
      console.log('🔍 Saving banners to Firestore:', {
        userId,
        bannerCount: cleanBanners.length,
        banners: cleanBanners.map(b => ({
          id: b.id,
          title: b.title,
          description: b.description,
          order: b.order,
          isActive: b.isActive,
          hasCreatedAt: !!b.createdAt,
          hasUpdatedAt: !!b.updatedAt
        }))
      });

      await updateDoc(doc(db, 'users', userId), {
        banners: cleanBanners,
        updatedAt: new Date()
      });

      console.log('✅ Banner added successfully:', cleanBanner);
      return { success: true, message: 'Banner added successfully', banner: cleanBanner as Banner };
    } catch (error) {
      console.error('Error adding banner:', error);
      return { success: false, message: 'Failed to add banner. Please try again.' };
    }
  }

  /**
   * Update an existing banner
   */
  static async updateBanner(
    userId: string,
    bannerId: string,
    updates: Partial<Banner>
  ): Promise<{ success: boolean; message: string }> {
    try {
      const userProfile = await this.getUserBanners(userId);
      const banners = userProfile.banners || [];
      
      const bannerIndex = banners.findIndex(b => b.id === bannerId);
      if (bannerIndex === -1) {
        return { success: false, message: 'Banner not found' };
      }

      // Clean updates to remove undefined values
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );

      // Update banner with clean values
      banners[bannerIndex] = {
        ...banners[bannerIndex],
        ...cleanUpdates,
        updatedAt: new Date()
      };

      // Ensure all banner fields are valid
      const cleanBanners = banners.map(b => ({
        ...b,
        title: b.title || null,
        description: b.description || null,
        order: b.order || 0,
        isActive: b.isActive !== undefined ? b.isActive : true,
        createdAt: b.createdAt || new Date(),
        updatedAt: b.updatedAt || new Date()
      }));

      await updateDoc(doc(db, 'users', userId), {
        banners: cleanBanners,
        updatedAt: new Date()
      });

      console.log('✅ Banner updated successfully');
      return { success: true, message: 'Banner updated successfully' };
    } catch (error) {
      console.error('Error updating banner:', error);
      return { success: false, message: 'Failed to update banner. Please try again.' };
    }
  }

  /**
   * Delete a banner
   */
  static async deleteBanner(userId: string, bannerId: string): Promise<{ success: boolean; message: string }> {
    try {
      const userProfile = await this.getUserBanners(userId);
      const banners = userProfile.banners || [];
      
      const updatedBanners = banners.filter(b => b.id !== bannerId);
      
      // Reorder remaining banners
      updatedBanners.forEach((banner, index) => {
        banner.order = index;
      });

      await updateDoc(doc(db, 'users', userId), {
        banners: updatedBanners,
        updatedAt: new Date()
      });

      console.log('✅ Banner deleted successfully');
      return { success: true, message: 'Banner deleted successfully' };
    } catch (error) {
      console.error('Error deleting banner:', error);
      return { success: false, message: 'Failed to delete banner. Please try again.' };
    }
  }

  /**
   * Reorder banners
   */
  static async reorderBanners(userId: string, bannerIds: string[]): Promise<{ success: boolean; message: string }> {
    try {
      const userProfile = await this.getUserBanners(userId);
      const banners = userProfile.banners || [];
      
      // Create new banner order
      const reorderedBanners = bannerIds.map((bannerId, index) => {
        const banner = banners.find(b => b.id === bannerId);
        if (banner) {
          return { 
            ...banner, 
            order: index, 
            updatedAt: new Date() 
          };
        }
        return null;
      }).filter(Boolean) as Banner[];

      // Ensure all banner fields are valid
      const cleanBanners = reorderedBanners.map(b => ({
        ...b,
        title: b.title || null,
        description: b.description || null,
        order: b.order || 0,
        isActive: b.isActive !== undefined ? b.isActive : true,
        createdAt: b.createdAt || new Date(),
        updatedAt: b.updatedAt || new Date()
      }));

      await updateDoc(doc(db, 'users', userId), {
        banners: cleanBanners,
        updatedAt: new Date()
      });

      console.log('✅ Banners reordered successfully');
      return { success: true, message: 'Banners reordered successfully' };
    } catch (error) {
      console.error('Error reordering banners:', error);
      return { success: false, message: 'Failed to reorder banners. Please try again.' };
    }
  }

  /**
   * Get user's banners
   */
  static async getUserBanners(userId: string): Promise<{ banners: Banner[] }> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const banners = data.banners || [];
        
        // Sort banners by order
        banners.sort((a: Banner, b: Banner) => a.order - b.order);
        
        return { banners };
      }
      return { banners: [] };
    } catch (error) {
      console.error('Error getting user banners:', error);
      return { banners: [] };
    }
  }

  /**
   * Toggle banner active status
   */
  static async toggleBannerActive(userId: string, bannerId: string): Promise<{ success: boolean; message: string }> {
    try {
      const userProfile = await this.getUserBanners(userId);
      const banners = userProfile.banners || [];
      
      const bannerIndex = banners.findIndex(b => b.id === bannerId);
      if (bannerIndex === -1) {
        return { success: false, message: 'Banner not found' };
      }

      // Toggle active status
      banners[bannerIndex].isActive = !banners[bannerIndex].isActive;
      banners[bannerIndex].updatedAt = new Date();

      // Ensure all banner fields are valid
      const cleanBanners = banners.map(b => ({
        ...b,
        title: b.title || null,
        description: b.description || null,
        order: b.order || 0,
        isActive: b.isActive !== undefined ? b.isActive : true,
        createdAt: b.createdAt || new Date(),
        updatedAt: b.updatedAt || new Date()
      }));

      await updateDoc(doc(db, 'users', userId), {
        banners: cleanBanners,
        updatedAt: new Date()
      });

      const status = banners[bannerIndex].isActive ? 'activated' : 'deactivated';
      console.log(`✅ Banner ${status} successfully`);
      return { success: true, message: `Banner ${status} successfully` };
    } catch (error) {
      console.error('Error toggling banner status:', error);
      return { success: false, message: 'Failed to toggle banner status. Please try again.' };
    }
  }

  /**
   * Get rotation interval in milliseconds
   */
  static getRotationInterval(): number {
    return this.ROTATION_INTERVAL;
  }

  /**
   * Get maximum banners allowed
   */
  static getMaxBanners(): number {
    return this.MAX_BANNERS;
  }
} 