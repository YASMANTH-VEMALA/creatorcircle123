import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Profile } from '../types';
import { UserService } from './userService';
import { FollowService } from './followService';

export interface SuggestedUser extends Profile {
  sharedSkills: string[];
  sharedInterests: string[];
  matchScore: number;
}

export class SuggestedPeopleService {
  static async getSuggestedPeople(
    currentUserId: string,
    options: {
      collegeFilter?: boolean;
      searchQuery?: string;
      skillFilters?: string[];
      interestFilters?: string[];
      limit?: number;
    } = {}
  ): Promise<SuggestedUser[]> {
    try {
      const {
        collegeFilter = true,
        searchQuery = '',
        skillFilters = [],
        interestFilters = [],
        limit: resultLimit = 20
      } = options;

      // Get current user's profile
      const currentUser = await UserService.getUserProfile(currentUserId);
      if (!currentUser) {
        throw new Error('Current user profile not found');
      }

      // Get users that current user is following
      const following = await FollowService.getFollowingIds(currentUserId);

      // Build query for users - use the same approach as UserService.getAllUsers()
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);

      const suggestedUsers: SuggestedUser[] = [];

      for (const doc of snapshot.docs) {
        const userData = doc.data();
        
        // Skip if user is current user
        if (userData.uid === currentUserId) {
          continue;
        }
        
        // Skip if user is already being followed
        if (following.includes(userData.uid)) {
          continue;
        }

        // Apply college filter in memory
        if (collegeFilter && currentUser.college && userData.college !== currentUser.college) {
          continue;
        }

        // Apply skill filters in memory
        if (skillFilters.length > 0) {
          const userSkills = userData.skills || [];
          const hasMatchingSkill = skillFilters.some(skill => 
            userSkills.some((userSkill: string) => 
              userSkill.toLowerCase() === skill.toLowerCase()
            )
          );
          if (!hasMatchingSkill) {
            continue;
          }
        }

        // Apply interest filters in memory
        if (interestFilters.length > 0) {
          const userInterests = userData.interests || [];
          const hasMatchingInterest = interestFilters.some(interest => 
            userInterests.some((userInterest: string) => 
              userInterest.toLowerCase() === interest.toLowerCase()
            )
          );
          if (!hasMatchingInterest) {
            continue;
          }
        }

        // Apply case-insensitive search filter
        if (searchQuery.trim()) {
          const name = userData.name?.toLowerCase() || '';
          const skills = userData.skills?.map((s: string) => s.toLowerCase()) || [];
          const interests = userData.interests?.map((i: string) => i.toLowerCase()) || [];
          const searchLower = searchQuery.toLowerCase();
          
          const matchesName = name.includes(searchLower);
          const matchesSkills = skills.some((skill: string) => skill.includes(searchLower));
          const matchesInterests = interests.some((interest: string) => interest.includes(searchLower));
          
          if (!matchesName && !matchesSkills && !matchesInterests) {
            continue;
          }
        }

        const userProfile: Profile = {
          uid: userData.uid,
          email: userData.email || '',
          name: userData.name || '',
          college: userData.college || '',
          passion: userData.passion || '',
          aboutMe: userData.aboutMe || '',
          profilePhotoUrl: userData.profilePhotoUrl || '',
          bannerPhotoUrl: userData.bannerPhotoUrl || '',
          skills: userData.skills || [],
          interests: userData.interests || [],
          followers: userData.followers || 0,
          following: userData.following || 0,
          connections: userData.connections || 0,
          isVerified: userData.isVerified || false,
          verifiedBadge: userData.verifiedBadge || 'none',
          location: userData.location || '',
          joinedDate: userData.joinedDate?.toDate() || new Date(),
          createdAt: userData.createdAt?.toDate() || new Date(),
          updatedAt: userData.updatedAt?.toDate() || new Date(),
        };

        // Calculate shared skills and interests
        const sharedSkills = this.getSharedItems(
          currentUser.skills || [],
          userProfile.skills || []
        );
        const sharedInterests = this.getSharedItems(
          currentUser.interests || [],
          userProfile.interests || []
        );

        // Calculate match score
        const matchScore = this.calculateMatchScore(
          sharedSkills,
          sharedInterests,
          currentUser.skills?.length || 0,
          currentUser.interests?.length || 0
        );

        // Only include users with at least one shared skill or interest
        if (sharedSkills.length > 0 || sharedInterests.length > 0) {
          suggestedUsers.push({
            ...userProfile,
            sharedSkills,
            sharedInterests,
            matchScore,
          });
        }
      }

      // Sort by match score (highest first)
      suggestedUsers.sort((a, b) => b.matchScore - a.matchScore);

      // Return limited results
      return suggestedUsers.slice(0, resultLimit);
    } catch (error) {
      console.error('Error getting suggested people:', error);
      throw error;
    }
  }

  private static getSharedItems(userItems: string[], otherItems: string[]): string[] {
    const userItemsLower = userItems.map(item => item.toLowerCase());
    const otherItemsLower = otherItems.map(item => item.toLowerCase());
    
    return otherItems.filter(item => 
      userItemsLower.includes(item.toLowerCase())
    );
  }

  private static calculateMatchScore(
    sharedSkills: string[],
    sharedInterests: string[],
    totalUserSkills: number,
    totalUserInterests: number
  ): number {
    const skillScore = sharedSkills.length / Math.max(totalUserSkills, 1);
    const interestScore = sharedInterests.length / Math.max(totalUserInterests, 1);
    
    // Weight skills and interests equally
    return (skillScore + interestScore) / 2;
  }

  static async getAllSkills(): Promise<string[]> {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      const allSkills = new Set<string>();
      snapshot.docs.forEach(doc => {
        const skills = doc.data().skills || [];
        skills.forEach((skill: string) => allSkills.add(skill.toLowerCase()));
      });
      
      return Array.from(allSkills).sort();
    } catch (error) {
      console.error('Error getting all skills:', error);
      return [];
    }
  }

  static async getAllInterests(): Promise<string[]> {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      const allInterests = new Set<string>();
      snapshot.docs.forEach(doc => {
        const interests = doc.data().interests || [];
        interests.forEach((interest: string) => allInterests.add(interest.toLowerCase()));
      });
      
      return Array.from(allInterests).sort();
    } catch (error) {
      console.error('Error getting all interests:', error);
      return [];
    }
  }
} 