import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, Profile } from '../types';
import { ProfileImageService } from './profileImageService';

export class UserService {
  static async createOrUpdateUserProfile(user: User, profileData: Partial<Profile>): Promise<void> {
    try {
      const userRef = doc(db, 'users', user.uid);
      
      const profile: Profile = {
        uid: user.uid,
        email: user.email,
        name: profileData.name || '',
        college: profileData.college || '',
        passion: profileData.passion || '',
        aboutMe: profileData.aboutMe || '',
        profilePhotoUrl: profileData.profilePhotoUrl || '',
        bannerPhotoUrl: profileData.bannerPhotoUrl || '',
        skills: profileData.skills || [],
        interests: profileData.interests || [],
        followers: profileData.followers || 0,
        following: profileData.following || 0,
        connections: profileData.connections || 0,
        isVerified: profileData.isVerified || false,
        verifiedBadge: profileData.verifiedBadge || 'none',
        location: profileData.location || '',
        joinedDate: profileData.joinedDate || new Date(),
        createdAt: profileData.createdAt || new Date(),
        updatedAt: new Date(),
        pushToken: profileData.pushToken || '',
        // XP fields with defaults
        xp: profileData.xp ?? 0,
        level: profileData.level ?? 1,
        badges: profileData.badges ?? [],
        lastLoginDate: profileData.lastLoginDate || undefined,
        loginStreak: profileData.loginStreak ?? 0,
        lastActivityAt: profileData.lastActivityAt || new Date(),
        lastDecayAppliedAt: profileData.lastDecayAppliedAt || undefined,
      };

      await setDoc(userRef, profile, { merge: true });
    } catch (error) {
      console.error('Error creating/updating user profile:', error);
      throw error;
    }
  }

  static async getUserProfile(uid: string): Promise<Profile | null> {
    try {
      console.log(`🔍 Fetching user profile for: ${uid}`);
      
      const userSnap = await getDoc(doc(db, 'users', uid));
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        console.log(`📋 Raw user data:`, {
          uid: data.uid,
          name: data.name,
          profilePhotoUrl: data.profilePhotoUrl,
          bannerPhotoUrl: data.bannerPhotoUrl
        });

        // Clean up image URLs to handle local file paths
        let profilePhotoUrl = data.profilePhotoUrl || '';
        let bannerPhotoUrl = data.bannerPhotoUrl || '';
        
        // Check if URLs are local file paths and replace with default Firebase Storage URLs
        if (ProfileImageService.isLocalFile(profilePhotoUrl)) {
          console.warn(`⚠️ Local file path detected for profile photo: ${profilePhotoUrl}`);
          profilePhotoUrl = ProfileImageService.getDefaultImageUrl('profile');
        }
        
        if (ProfileImageService.isLocalFile(bannerPhotoUrl)) {
          console.warn(`⚠️ Local file path detected for banner photo: ${bannerPhotoUrl}`);
          bannerPhotoUrl = ProfileImageService.getDefaultImageUrl('banner');
        }

        const profile: Profile = {
          uid: data.uid || uid,
          email: data.email || '',
          name: data.name || '',
          college: data.college || '',
          passion: data.passion || '',
          aboutMe: data.aboutMe || '',
          profilePhotoUrl,
          bannerPhotoUrl,
          skills: data.skills || [],
          interests: data.interests || [],
          followers: data.followers || 0,
          following: data.following || 0,
          connections: data.connections || 0,
          isVerified: data.isVerified || false,
          verifiedBadge: data.verifiedBadge || 'none',
          location: data.location || '',
          joinedDate: data.joinedDate?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          pushToken: data.pushToken || '',
          // XP fields
          xp: data.xp ?? 0,
          level: data.level ?? 1,
          badges: data.badges || [],
          lastLoginDate: data.lastLoginDate?.toDate?.() || undefined,
          loginStreak: data.loginStreak ?? 0,
          lastActivityAt: data.lastActivityAt?.toDate?.() || undefined,
          lastDecayAppliedAt: data.lastDecayAppliedAt?.toDate?.() || undefined,
        };

        console.log(`✅ Cleaned profile data:`, {
          uid: profile.uid,
          name: profile.name,
          profilePhotoUrl: profile.profilePhotoUrl,
          bannerPhotoUrl: profile.bannerPhotoUrl
        });

        return profile;
      }
      
      console.warn(`⚠️ User profile not found for uid: ${uid}`);
      return null;
    } catch (error) {
      console.error('❌ Error getting user profile:', error);
      throw error;
    }
  }

  static async updateUserProfile(uid: string, updates: Partial<Profile>): Promise<void> {
    try {
      // Clean the updates object to remove undefined values
      const cleanUpdates: any = {};
      Object.keys(updates).forEach(key => {
        if (updates[key as keyof Profile] !== undefined) {
          cleanUpdates[key] = updates[key as keyof Profile];
        }
      });

      // Add updatedAt timestamp
      cleanUpdates.updatedAt = new Date();

      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, cleanUpdates, { merge: true });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  static async doesUserProfileExist(uid: string): Promise<boolean> {
    try {
      // Check both collections for backward compatibility
      const usersRef = doc(db, 'users', uid);
      const profilesRef = doc(db, 'profiles', uid);
      
      const [usersSnap, profilesSnap] = await Promise.all([
        getDoc(usersRef),
        getDoc(profilesRef)
      ]);
      
      return usersSnap.exists() || profilesSnap.exists();
    } catch (error) {
      console.error('Error checking if user profile exists:', error);
      throw error;
    }
  }

  static async getAllUsers(): Promise<Profile[]> {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      const users: Profile[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          uid: data.uid || doc.id,
          email: data.email || '',
          name: data.name || '',
          college: data.college || '',
          passion: data.passion || '',
          aboutMe: data.aboutMe || '',
          profilePhotoUrl: data.profilePhotoUrl || '',
          bannerPhotoUrl: data.bannerPhotoUrl || '',
          skills: data.skills || [],
          interests: data.interests || [],
          followers: data.followers || 0,
          following: data.following || 0,
          connections: data.connections || 0,
          isVerified: data.isVerified || false,
          verifiedBadge: data.verifiedBadge || 'none',
          location: data.location || '',
          joinedDate: data.joinedDate?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Profile);
      });
      
      return users;
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  static async searchUsers(searchQuery: string): Promise<Profile[]> {
    if (!searchQuery.trim()) {
      return [];
    }

    try {
      // Search by name (case-insensitive)
      const nameQuery = query(
        collection(db, 'users'),
        where('name', '>=', searchQuery),
        where('name', '<=', searchQuery + '\uf8ff')
      );

      const snapshot = await getDocs(nameQuery);
      const users: Profile[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          uid: data.uid,
          email: data.email,
          name: data.name,
          college: data.college,
          passion: data.passion,
          aboutMe: data.aboutMe,
          profilePhotoUrl: data.profilePhotoUrl,
          bannerPhotoUrl: data.bannerPhotoUrl,
          skills: data.skills || [],
          interests: data.interests || [],
          followers: data.followers || 0,
          following: data.following || 0,
          connections: data.connections || 0,
          isVerified: data.isVerified || false,
          verifiedBadge: data.verifiedBadge || 'none',
          location: data.location,
          joinedDate: data.joinedDate?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });

      // Sort by relevance (exact matches first, then partial matches)
      users.sort((a, b) => {
        const aExact = a.name.toLowerCase() === searchQuery.toLowerCase();
        const bExact = b.name.toLowerCase() === searchQuery.toLowerCase();
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        return a.name.localeCompare(b.name);
      });

      return users.slice(0, 10); // Limit to 10 results
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }
} 