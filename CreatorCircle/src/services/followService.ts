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

export class FollowService {
	static async followUser(myId: string, targetId: string): Promise<void> {
		if (!myId || !targetId) throw new Error('Invalid user ids');
		if (myId === targetId) throw new Error('Cannot follow yourself');

		// Ensure target profile is updated
		const targetSnap = await getDoc(doc(db, 'users', targetId));
		if (!targetSnap.exists()) throw new Error('User not found');
		const targetData: any = targetSnap.data();
		if (!targetData.profileUpdated) {
			throw new Error('User has not updated profile yet.');
		}

		// Idempotency: if already following, bail
		const followingRef = doc(db, 'users', myId, 'following', targetId);
		const followersRef = doc(db, 'users', targetId, 'followers', myId);
		const [followingSnap, followersSnap] = await Promise.all([getDoc(followingRef), getDoc(followersRef)]);
		if (followingSnap.exists() && followersSnap.exists()) {
			return;
		}

		// Create both sides
		await Promise.all([
			setDoc(followingRef, { followedAt: serverTimestamp() }),
			setDoc(followersRef, { followedAt: serverTimestamp() }),
			updateDoc(doc(db, 'users', targetId), { xp: increment(10) }),
			// Optional counters if present on profile
			updateDoc(doc(db, 'users', myId), { following: increment(1) }).catch(() => {}),
			updateDoc(doc(db, 'users', targetId), { followers: increment(1) }).catch(() => {}),
			// Top-level notification document per spec
			setDoc(doc(collection(db, 'notifications')), {
				to: targetId,
				from: myId,
				type: 'follow',
				createdAt: serverTimestamp(),
				read: false,
			}),
		]);
	}

	static async unfollowUser(myId: string, targetId: string): Promise<void> {
		if (!myId || !targetId) throw new Error('Invalid user ids');
		if (myId === targetId) return;

		const followingRef = doc(db, 'users', myId, 'following', targetId);
		const followersRef = doc(db, 'users', targetId, 'followers', myId);

		await Promise.all([
			deleteDoc(followingRef).catch(() => {}),
			deleteDoc(followersRef).catch(() => {}),
			updateDoc(doc(db, 'users', targetId), { xp: increment(-10) }),
			// Optional counters
			updateDoc(doc(db, 'users', myId), { following: increment(-1) }).catch(() => {}),
			updateDoc(doc(db, 'users', targetId), { followers: increment(-1) }).catch(() => {}),
		]);
	}

	static async isFollowing(myId: string, targetId: string): Promise<boolean> {
		const ref = doc(db, 'users', myId, 'following', targetId);
		const snap = await getDoc(ref);
		return snap.exists();
	}

	static async getFollowersIds(userId: string): Promise<string[]> {
		const snap = await getDocs(collection(db, 'users', userId, 'followers'));
		return snap.docs.map((d) => d.id);
	}

	static async getFollowingIds(userId: string): Promise<string[]> {
		const snap = await getDocs(collection(db, 'users', userId, 'following'));
		return snap.docs.map((d) => d.id);
	}

	static async getMutualFollowers(myId: string, targetId: string): Promise<string[]> {
		const [myFollowers, theirFollowers] = await Promise.all([
			this.getFollowersIds(myId),
			this.getFollowersIds(targetId),
		]);
		const theirSet = new Set(theirFollowers);
		return myFollowers.filter((id) => theirSet.has(id));
	}

	static async getMutualConnections(myId: string, targetId: string): Promise<string[]> {
		const [myFollowing, theirFollowing] = await Promise.all([
			this.getFollowingIds(myId),
			this.getFollowingIds(targetId),
		]);
		const theirSet = new Set(theirFollowing);
		return myFollowing.filter((id) => theirSet.has(id));
	}
} 