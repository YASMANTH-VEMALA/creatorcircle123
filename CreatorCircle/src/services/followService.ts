import {
	collection,
	doc,
	setDoc,
	deleteDoc,
	getDoc,
	getDocs,
	onSnapshot,
	query,
	updateDoc,
	increment,
	serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ProfileValidationService } from './profileValidationService';
import { UserService } from './userService';

export class FollowService {
	static async followUser(myId: string, targetId: string): Promise<void> {
		if (!myId || !targetId) throw new Error('Invalid user ids');
		if (myId === targetId) throw new Error('Cannot follow yourself');

		try {
			// Get both user profiles
			const [myProfile, targetProfile] = await Promise.all([
				UserService.getUserProfile(myId),
				UserService.getUserProfile(targetId)
			]);

			// Check if target user exists
			if (!targetProfile) {
				throw new Error('User not found');
			}

			// Check if the current user has a complete profile (required to follow others)
			const myProfileStatus = ProfileValidationService.validateProfileCompletion(myProfile);

			if (!myProfileStatus.isComplete) {
				throw new Error('You need to complete your profile before following other users. Please add your name, college, profile picture, skills, and interests.');
			}

			// Note: We don't require the target user to have a complete profile
			// Users can follow others even if their profile is incomplete

			// Check if already following (idempotency)
			const followingRef = doc(db, 'users', myId, 'following', targetId);
			const followersRef = doc(db, 'users', targetId, 'followers', myId);
			
			const [followingSnap, followersSnap] = await Promise.all([
				getDoc(followingRef), 
				getDoc(followersRef)
			]);
			
			if (followingSnap.exists() && followersSnap.exists()) {
				// Already following, no need to do anything
				return;
			}

			// Create follow relationship on both sides
			await Promise.all([
				setDoc(followingRef, { 
					followedAt: serverTimestamp(),
					targetName: targetProfile.name,
					targetCollege: targetProfile.college,
					targetProfilePic: targetProfile.profilePhotoUrl
				}),
				setDoc(followersRef, { 
					followedAt: serverTimestamp(),
					followerName: myProfile?.name || 'Unknown',
					followerCollege: myProfile?.college || 'Unknown',
					followerProfilePic: myProfile?.profilePhotoUrl
				}),
				// Update XP for the user being followed
				updateDoc(doc(db, 'users', targetId), { 
					xp: increment(10) 
				}),
				// Update follower/following counts if they exist
				updateDoc(doc(db, 'users', myId), { 
					following: increment(1) 
				}).catch(() => {}),
				updateDoc(doc(db, 'users', targetId), { 
					followers: increment(1) 
				}).catch(() => {}),
			]);

			// Create follow notification
			await this.createFollowNotification(myId, targetId, myProfile, targetProfile);

			console.log(`User ${myId} successfully followed user ${targetId}`);
		} catch (error) {
			console.error('Error in followUser:', error);
			throw error;
		}
	}

	static async unfollowUser(myId: string, targetId: string): Promise<void> {
		if (!myId || !targetId) throw new Error('Invalid user ids');
		if (myId === targetId) return;

		try {
			const followingRef = doc(db, 'users', myId, 'following', targetId);
			const followersRef = doc(db, 'users', targetId, 'followers', myId);

			await Promise.all([
				deleteDoc(followingRef).catch(() => {}),
				deleteDoc(followersRef).catch(() => {}),
				// Reduce XP for the user being unfollowed
				updateDoc(doc(db, 'users', targetId), { 
					xp: increment(-10) 
				}),
				// Update follower/following counts if they exist
				updateDoc(doc(db, 'users', myId), { 
					following: increment(-1) 
				}).catch(() => {}),
				updateDoc(doc(db, 'users', targetId), { 
					followers: increment(-1) 
				}).catch(() => {}),
			]);

			console.log(`User ${myId} successfully unfollowed user ${targetId}`);
		} catch (error) {
			console.error('Error in unfollowUser:', error);
			throw error;
		}
	}

	static async isFollowing(myId: string, targetId: string): Promise<boolean> {
		try {
			const ref = doc(db, 'users', myId, 'following', targetId);
			const snap = await getDoc(ref);
			return snap.exists();
		} catch (error) {
			console.error('Error checking follow status:', error);
			return false;
		}
	}

	static async getFollowersIds(userId: string): Promise<string[]> {
		if (!userId || typeof userId !== 'string' || userId.trim() === '') {
			console.error('Invalid userId for getFollowersIds:', userId);
			return [];
		}

		try {
			const snap = await getDocs(collection(db, 'users', userId, 'followers'));
			return snap.docs.map((d) => d.id);
		} catch (error) {
			console.error('Error getting followers:', error);
			return [];
		}
	}

	static async getFollowingIds(userId: string): Promise<string[]> {
		if (!userId || typeof userId !== 'string' || userId.trim() === '') {
			console.error('Invalid userId for getFollowingIds:', userId);
			return [];
		}

		try {
			const snap = await getDocs(collection(db, 'users', userId, 'following'));
			return snap.docs.map((d) => d.id);
		} catch (error) {
			console.error('Error getting following:', error);
			return [];
		}
	}

	static async getMutualFollowers(myId: string, targetId: string): Promise<string[]> {
		try {
			const [myFollowers, theirFollowers] = await Promise.all([
				this.getFollowersIds(myId),
				this.getFollowersIds(targetId),
			]);
			const theirSet = new Set(theirFollowers);
			return myFollowers.filter((id) => theirSet.has(id));
		} catch (error) {
			console.error('Error getting mutual followers:', error);
			return [];
		}
	}

	static async getMutualConnections(myId: string, targetId: string): Promise<string[]> {
		try {
			const [myFollowing, theirFollowing] = await Promise.all([
				this.getFollowingIds(myId),
				this.getFollowingIds(targetId),
			]);
			const theirSet = new Set(theirFollowing);
			return myFollowing.filter((id) => theirSet.has(id));
		} catch (error) {
			console.error('Error getting mutual connections:', error);
			return [];
		}
	}

	/**
	 * Create a follow notification for the user being followed
	 */
	private static async createFollowNotification(
		followerId: string, 
		followeeId: string, 
		followerProfile: any, 
		followeeProfile: any
	): Promise<void> {
		if (!followerId || !followeeId || typeof followerId !== 'string' || typeof followeeId !== 'string' || followerId.trim() === '' || followeeId.trim() === '') {
			console.error('Invalid IDs for createFollowNotification:', { followerId, followeeId });
			return;
		}

		try {
			// Create notification in the followee's notifications collection
			const notificationRef = doc(collection(db, 'users', followeeId, 'notifications'));
			
			await setDoc(notificationRef, {
				id: notificationRef.id,
				type: 'follow',
				senderId: followerId,
				senderName: followerProfile?.name || 'Unknown User',
				senderProfilePic: followerProfile?.profilePhotoUrl,
				senderVerified: followerProfile?.isVerified || false,
				message: `${followerProfile?.name || 'Someone'} started following you!`,
				timestamp: serverTimestamp(),
				read: false,
			});

			console.log('Follow notification created successfully');
		} catch (error) {
			console.error('Error creating follow notification:', error);
			// Don't throw error here as it shouldn't break the follow process
		}
	}

	/**
	 * Check if a user can follow another user based on profile completion
	 */
	static async canFollowUser(myId: string, targetId: string): Promise<{ 
		canFollow: boolean; 
		message: string; 
		myProfileComplete: boolean; 
		targetProfileComplete: boolean; 
	}> {
		try {
			if (!myId || !targetId || typeof myId !== 'string' || typeof targetId !== 'string' || myId.trim() === '' || targetId.trim() === '') {
				console.error('Invalid user IDs for canFollowUser:', { myId, targetId });
				return { 
					canFollow: false, 
					message: 'Invalid user IDs', 
					myProfileComplete: false, 
					targetProfileComplete: false 
				};
			}

			if (myId === targetId) {
				return { 
					canFollow: false, 
					message: 'You cannot follow yourself', 
					myProfileComplete: false, 
					targetProfileComplete: false 
				};
			}

			// Get both user profiles
			const [myProfile, targetProfile] = await Promise.all([
				UserService.getUserProfile(myId),
				UserService.getUserProfile(targetId)
			]);

			if (!targetProfile) {
				return { 
					canFollow: false, 
					message: 'User not found', 
					myProfileComplete: false, 
					targetProfileComplete: false 
				};
			}

			// Check profile completion for both users
			const myProfileStatus = ProfileValidationService.validateProfileCompletion(myProfile);
			const targetProfileStatus = ProfileValidationService.validateProfileCompletion(targetProfile);

			const myProfileComplete = myProfileStatus.isComplete;
			const targetProfileComplete = targetProfileStatus.isComplete;

			if (!myProfileComplete) {
				return {
					canFollow: false,
					message: 'You need to complete your profile before following other users. Please add your name, college, profile picture, skills, and interests.',
					myProfileComplete: false,
					targetProfileComplete
				};
			}

			// Note: We don't require the target user to have a complete profile
			// Users can follow others even if their profile is incomplete

			// Check if already following
			const isAlreadyFollowing = await this.isFollowing(myId, targetId);
			if (isAlreadyFollowing) {
				return {
					canFollow: false,
					message: 'You are already following this user',
					myProfileComplete: true,
					targetProfileComplete: true
				};
			}

			return {
				canFollow: true,
				message: 'You can follow this user',
				myProfileComplete: true,
				targetProfileComplete: targetProfileComplete // Keep actual status, but don't require it
			};
		} catch (error) {
			console.error('Error checking if user can follow:', error);
			return {
				canFollow: false,
				message: 'Error checking follow eligibility',
				myProfileComplete: false,
				targetProfileComplete: false
			};
		}
	}
} 