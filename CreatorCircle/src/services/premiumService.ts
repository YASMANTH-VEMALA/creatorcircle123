import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface PremiumSubscription {
  userId: string;
  planType: 'basic' | 'premium';
  verifiedBadge: 'none' | 'silver' | 'gold';
  couponCode?: string;
  isActive: boolean;
  startDate: Date;
  endDate: Date;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CouponCode {
  code: string;
  planType: 'basic' | 'premium';
  discount: number;
  isActive: boolean;
  maxUses: number;
  currentUses: number;
  validUntil: Date;
}

export class PremiumService {
  // Valid coupon codes
  private static readonly VALID_COUPONS: CouponCode[] = [
    {
      code: 'CCFREE199',
      planType: 'basic',
      discount: 100, // 100% discount (free)
      isActive: true,
      maxUses: 1000,
      currentUses: 0,
      validUntil: new Date('2025-12-31'),
    },
    {
      code: 'CCFREE499',
      planType: 'premium',
      discount: 100, // 100% discount (free)
      isActive: true,
      maxUses: 1000,
      currentUses: 0,
      validUntil: new Date('2025-12-31'),
    },
  ];

  /**
   * Get user's premium subscription
   */
  static async getUserSubscription(userId: string): Promise<PremiumSubscription | null> {
    try {
      const subscriptionDoc = await getDoc(doc(db, 'premium_subscriptions', userId));
      if (subscriptionDoc.exists()) {
        const data = subscriptionDoc.data();
        return {
          ...data,
          startDate: data.startDate.toDate(),
          endDate: data.endDate.toDate(),
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as PremiumSubscription;
      }
      return null;
    } catch (error) {
      console.error('Error getting user subscription:', error);
      return null;
    }
  }

  /**
   * Purchase premium subscription with coupon code
   */
  static async purchaseSubscription(
    userId: string,
    planType: 'basic' | 'premium',
    couponCode?: string
  ): Promise<{ success: boolean; message: string; subscription?: PremiumSubscription }> {
    try {
      // Validate coupon code if provided
      if (couponCode) {
        const couponValidation = this.validateCouponCode(couponCode, planType);
        if (!couponValidation.valid) {
          return { success: false, message: couponValidation.message };
        }
      }

      // Calculate price
      const basePrice = planType === 'basic' ? 199 : 499;
      const finalPrice = couponCode ? 0 : basePrice; // Free with coupon codes

      // Determine verified badge
      const verifiedBadge = planType === 'basic' ? 'silver' : 'gold';

      // Create subscription
      const subscription: PremiumSubscription = {
        userId,
        planType,
        verifiedBadge,
        couponCode,
        isActive: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        price: finalPrice,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to Firestore
      await setDoc(doc(db, 'premium_subscriptions', userId), subscription);

      // Update user profile with verified badge
      await this.updateUserVerifiedBadge(userId, verifiedBadge);

      console.log('✅ Premium subscription purchased:', subscription);
      return { 
        success: true, 
        message: `Successfully purchased ${planType} subscription!`, 
        subscription 
      };
    } catch (error) {
      console.error('Error purchasing subscription:', error);
      return { success: false, message: 'Failed to purchase subscription. Please try again.' };
    }
  }

  /**
   * Validate coupon code
   */
  private static validateCouponCode(code: string, planType: 'basic' | 'premium'): { valid: boolean; message: string } {
    const coupon = this.VALID_COUPONS.find(c => c.code === code);
    
    if (!coupon) {
      return { valid: false, message: 'Invalid coupon code.' };
    }

    if (!coupon.isActive) {
      return { valid: false, message: 'Coupon code is inactive.' };
    }

    if (coupon.planType !== planType) {
      return { valid: false, message: `This coupon is only valid for ${coupon.planType} plans.` };
    }

    if (new Date() > coupon.validUntil) {
      return { valid: false, message: 'Coupon code has expired.' };
    }

    if (coupon.currentUses >= coupon.maxUses) {
      return { valid: false, message: 'Coupon code usage limit reached.' };
    }

    return { valid: true, message: 'Coupon code is valid.' };
  }

  /**
   * Update user's verified badge in profile
   */
  private static async updateUserVerifiedBadge(userId: string, badge: 'none' | 'silver' | 'gold'): Promise<void> {
    try {
      console.log(`🔄 Updating user ${userId} verified badge to: ${badge}`);
      
      await updateDoc(doc(db, 'users', userId), {
        verifiedBadge: badge,
        updatedAt: new Date(),
      });
      
      console.log('✅ User verified badge updated successfully:', badge);
      
      // Verify the update by reading the user profile
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('🔍 Verification - User profile after update:', {
          verifiedBadge: userData.verifiedBadge,
          name: userData.name,
          updatedAt: userData.updatedAt
        });
      }
    } catch (error) {
      console.error('❌ Error updating user verified badge:', error);
      throw error;
    }
  }

  /**
   * Check if user has active subscription
   */
  static async hasActiveSubscription(userId: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) return false;
      
      return subscription.isActive && new Date() < subscription.endDate;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  /**
   * Get user's verified badge
   */
  static async getUserVerifiedBadge(userId: string): Promise<'none' | 'silver' | 'gold'> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription || !subscription.isActive || new Date() > subscription.endDate) {
        return 'none';
      }
      return subscription.verifiedBadge;
    } catch (error) {
      console.error('Error getting user verified badge:', error);
      return 'none';
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      await updateDoc(doc(db, 'premium_subscriptions', userId), {
        isActive: false,
        updatedAt: new Date(),
      });

      // Remove verified badge from user profile
      await this.updateUserVerifiedBadge(userId, 'none');

      return { success: true, message: 'Subscription cancelled successfully.' };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return { success: false, message: 'Failed to cancel subscription.' };
    }
  }

  /**
   * Get subscription plans
   */
  static getSubscriptionPlans() {
    return [
      {
        id: 'basic',
        name: 'Basic Premium',
        price: 199,
        originalPrice: 199,
        badge: 'silver',
        features: [
          'Silver Verified Badge',
          'Enhanced Profile Visibility',
          'Priority Support',
          'Advanced Analytics',
        ],
        couponCode: 'CCFREE199',
      },
      {
        id: 'premium',
        name: 'Premium Pro',
        price: 499,
        originalPrice: 499,
        badge: 'gold',
        features: [
          'Gold Verified Badge',
          'All Basic Features',
          'Exclusive Content Access',
          'Premium Analytics',
          'Priority Collaboration',
          'Custom Profile Themes',
        ],
        couponCode: 'CCFREE499',
      },
    ];
  }
} 