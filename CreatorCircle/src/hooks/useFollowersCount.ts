import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export function useFollowersCount(targetUserId: string | undefined) {
	const [count, setCount] = useState<number>(0);

	useEffect(() => {
		if (!targetUserId) return;
		const col = collection(db, 'users', targetUserId, 'followers');
		const unsub = onSnapshot(col, (snap) => setCount(snap.size));
		return () => unsub();
	}, [targetUserId]);

	return count;
} 