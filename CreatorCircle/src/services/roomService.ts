import { db } from '../config/firebase';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  arrayContains,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  increment,
} from 'firebase/firestore';
import * as Crypto from 'expo-crypto';
import { FileUploadService } from './fileUploadService';

export type RoomRole = 'admin' | 'member';

export interface Room {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  logoUrl?: string;
  creatorId: string;
  admins: string[];
  members: string[];
  membersCount: number;
  isTemporary: boolean;
  endsAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RoomMember {
  uid: string;
  role: RoomRole;
  joinedAt: Timestamp;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
}

function generateRoomId(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function sha256(input: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}

class RoomService {
  async createRoom(options: {
    name: string;
    description?: string;
    isPrivate: boolean;
    isTemporary?: boolean;
    endsAt?: Date;
    logoUrl?: string;
    creatorId: string;
  }): Promise<string> {
    const roomId = generateRoomId(7);
    const roomRef = doc(db, 'rooms', roomId);

    const nowTs = serverTimestamp() as unknown as Timestamp;
    const endsAt = options.isTemporary && options.endsAt ? Timestamp.fromDate(options.endsAt) : undefined;

    const data: any = {
      id: roomId,
      name: options.name.trim(),
      description: options.description?.trim(),
      isPrivate: !!options.isPrivate,
      creatorId: options.creatorId,
      admins: [options.creatorId],
      members: [options.creatorId],
      membersCount: 1,
      isTemporary: !!options.isTemporary,
      createdAt: nowTs,
      updatedAt: nowTs,
    };
    
    if (options.logoUrl) data.logoUrl = options.logoUrl;
    if (endsAt) data.endsAt = endsAt;

    await setDoc(roomRef, data);

    // Create membership doc for creator
    const memberRef = doc(db, 'rooms', roomId, 'members', options.creatorId);
    await setDoc(memberRef, { 
      uid: options.creatorId, 
      role: 'admin', 
      joinedAt: serverTimestamp() 
    });

    // Generate and store join key hash if private
    if (options.isPrivate) {
      const joinKey = generateRoomId(8).toLowerCase();
      const hash = await sha256(joinKey);
      const secretRef = doc(db, 'rooms_secrets', roomId);
      await setDoc(secretRef, { 
        joinKeyHash: hash, 
        joinKeyPlain: joinKey,
        createdAt: serverTimestamp(), 
        creatorId: options.creatorId 
      });
    }

    return roomId;
  }

  async getRoom(roomId: string): Promise<Room | null> {
    const snap = await getDoc(doc(db, 'rooms', roomId));
    if (!snap.exists()) return null;
    const data = snap.data() as Room;
    return { ...data, id: roomId };
  }

  subscribeToRoom(roomId: string, onUpdate: (room: Room | null) => void): () => void {
    if (!roomId || typeof roomId !== 'string' || roomId.trim() === '') {
      console.error('Invalid roomId for subscribeToRoom:', roomId);
      return () => {};
    }

    try {
      const unsub = onSnapshot(doc(db, 'rooms', roomId), (d) => {
        onUpdate(d.exists() ? ({ ...(d.data() as Room), id: roomId }) : null);
      });
      return unsub;
    } catch (error) {
      console.error('Error subscribing to room:', error);
      return () => {};
    }
  }

  subscribeToRoomMembers(roomId: string, onUpdate: (members: RoomMember[]) => void): () => void {
    if (!roomId || typeof roomId !== 'string' || roomId.trim() === '') {
      console.error('Invalid roomId for subscribeToRoomMembers:', roomId);
      return () => {};
    }

    try {
      // Remove orderBy to avoid index issues - will sort client-side
      const q = query(collection(db, 'rooms', roomId, 'members'));
      const unsub = onSnapshot(q, (snap) => {
        const list: RoomMember[] = [];
        snap.forEach((d) => list.push(d.data() as RoomMember));
        
        // Sort client-side by joinedAt
        list.sort((a, b) => {
          const aTime = a.joinedAt?.toDate?.() || new Date(a.joinedAt) || new Date(0);
          const bTime = b.joinedAt?.toDate?.() || new Date(b.joinedAt) || new Date(0);
          return aTime.getTime() - bTime.getTime();
        });
        
        onUpdate(list);
      });
      return unsub;
    } catch (error) {
      console.error('Error subscribing to room members:', error);
      return () => {};
    }
  }

  subscribeToRoomMessages(roomId: string, onUpdate: (messages: RoomMessage[]) => void): () => void {
    if (!roomId || typeof roomId !== 'string' || roomId.trim() === '') {
      console.error('Invalid roomId for subscribeToRoomMessages:', roomId);
      return () => {};
    }

    try {
      // Remove orderBy to avoid index issues - will sort client-side
      const q = query(collection(db, 'rooms', roomId, 'messages'));
      const unsub = onSnapshot(q, (snap) => {
        const list: RoomMessage[] = [];
        snap.forEach((d) => list.push({ id: d.id, roomId, ...(d.data() as any) } as RoomMessage));
        
        // Sort client-side by timestamp
        list.sort((a, b) => {
          const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp) || new Date(0);
          const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp) || new Date(0);
          return aTime.getTime() - bTime.getTime();
        });
        
        onUpdate(list);
      });
      return unsub;
    } catch (error) {
      console.error('Error subscribing to room messages:', error);
      return () => {};
    }
  }

  async joinRoom(roomId: string, userId: string, joinKeyPlain?: string): Promise<void> {
    if (!roomId || !userId || typeof roomId !== 'string' || typeof userId !== 'string' || roomId.trim() === '' || userId.trim() === '') {
      throw new Error('Invalid roomId or userId for joinRoom');
    }

    await runTransaction(db, async (tx) => {
      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) throw new Error('Room not found');
      const room = roomSnap.data() as Room;

      // Access check for private room
      if (room.isPrivate) {
        if (!joinKeyPlain) {
          throw new Error('Join key required for private rooms');
        }
        const secretRef = doc(db, 'rooms_secrets', roomId);
        const secretSnap = await tx.get(secretRef);
        const storedHash = secretSnap.exists() ? (secretSnap.data() as any).joinKeyHash : null;
        const providedHash = await sha256(joinKeyPlain);
        if (!storedHash || storedHash !== providedHash) {
          throw new Error('Invalid join key');
        }
      }

      const memberRef = doc(db, 'rooms', roomId, 'members', userId);
      const memberSnap = await tx.get(memberRef);
      if (!memberSnap.exists()) {
        tx.set(memberRef, { 
          uid: userId, 
          role: 'member', 
          joinedAt: serverTimestamp() 
        });
        tx.update(roomRef, { 
          members: arrayUnion(userId), 
          membersCount: increment(1), 
          updatedAt: serverTimestamp() 
        });
      }
    });
  }

  async leaveRoom(roomId: string, userId: string): Promise<void> {
    if (!roomId || !userId || typeof roomId !== 'string' || typeof userId !== 'string' || roomId.trim() === '' || userId.trim() === '') {
      throw new Error('Invalid roomId or userId for leaveRoom');
    }

    await runTransaction(db, async (tx) => {
      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) return;
      const room = roomSnap.data() as Room;

      const memberRef = doc(db, 'rooms', roomId, 'members', userId);
      const memberSnap = await tx.get(memberRef);
      if (!memberSnap.exists()) return;
      const role = (memberSnap.data() as RoomMember).role;

      tx.delete(memberRef);
      tx.update(roomRef, { 
        members: arrayRemove(userId), 
        membersCount: increment(-1), 
        updatedAt: serverTimestamp(), 
        admins: role === 'admin' ? (room.admins || []).filter((a) => a !== userId) : room.admins 
      });

      // If no admins remain but there are members, promote the earliest member
      const newAdmins = (room.admins || []).filter((a) => a !== userId);
      if (newAdmins.length === 0) {
        // Note: cannot query inside transaction across subcollection ordering; fallback post-step: leave for admin UI or cloud function
      }
    });
  }

  async deleteRoom(roomId: string): Promise<void> {
    if (!roomId || typeof roomId !== 'string' || roomId.trim() === '') {
      throw new Error('Invalid roomId for deleteRoom');
    }

    try {
      // Delete messages
      const msgsSnap = await getDocs(collection(db, 'rooms', roomId, 'messages'));
      await Promise.all(msgsSnap.docs.map((d) => deleteDoc(d.ref)));

    // Delete members
    const memsSnap = await getDocs(collection(db, 'rooms', roomId, 'members'));
    await Promise.all(memsSnap.docs.map((d) => deleteDoc(d.ref)));

    // Delete secret
    await deleteDoc(doc(db, 'rooms_secrets', roomId));

      // Delete room
      await deleteDoc(doc(db, 'rooms', roomId));
    } catch (error) {
      console.error('Error deleting room:', error);
      throw error;
    }
  }

  async grantAdmin(roomId: string, actorUid: string, targetUid: string): Promise<void> {
    if (!roomId || !actorUid || !targetUid || typeof roomId !== 'string' || typeof actorUid !== 'string' || typeof targetUid !== 'string' || roomId.trim() === '' || actorUid.trim() === '' || targetUid.trim() === '') {
      throw new Error('Invalid parameters for grantAdmin');
    }

    await runTransaction(db, async (tx) => {
      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) throw new Error('Room not found');
      const room = roomSnap.data() as Room;
      if (!room.admins?.includes(actorUid)) throw new Error('Only admins can grant admin');

      const memberRef = doc(db, 'rooms', roomId, 'members', targetUid);
      const memberSnap = await tx.get(memberRef);
      if (!memberSnap.exists()) throw new Error('Target is not a member');

      tx.update(memberRef, { role: 'admin' });
      tx.update(roomRef, { admins: arrayUnion(targetUid), updatedAt: serverTimestamp() });
    });
  }

  async revokeAdmin(roomId: string, actorUid: string, targetUid: string): Promise<void> {
    if (!roomId || !actorUid || !targetUid || typeof roomId !== 'string' || typeof actorUid !== 'string' || typeof targetUid !== 'string' || roomId.trim() === '' || actorUid.trim() === '' || targetUid.trim() === '') {
      throw new Error('Invalid parameters for revokeAdmin');
    }

    await runTransaction(db, async (tx) => {
      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) throw new Error('Room not found');
      const room = roomSnap.data() as Room;
      if (!room.admins?.includes(actorUid)) throw new Error('Only admins can revoke admin');
      if (targetUid === room.creatorId) throw new Error('Cannot revoke admin from room creator');

      const memberRef = doc(db, 'rooms', roomId, 'members', targetUid);
      const memberSnap = await tx.get(memberRef);
      if (!memberSnap.exists()) throw new Error('Target is not a member');

      tx.update(memberRef, { role: 'member' });
      tx.update(roomRef, { admins: arrayRemove(targetUid), updatedAt: serverTimestamp() });
    });
  }

  async removeMember(roomId: string, actorUid: string, targetUid: string): Promise<void> {
    if (!roomId || !actorUid || !targetUid || typeof roomId !== 'string' || typeof actorUid !== 'string' || typeof targetUid !== 'string' || roomId.trim() === '' || actorUid.trim() === '' || targetUid.trim() === '') {
      throw new Error('Invalid parameters for removeMember');
    }

    await runTransaction(db, async (tx) => {
      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) throw new Error('Room not found');
      const room = roomSnap.data() as Room;

      if (!room.admins?.includes(actorUid)) throw new Error('Only admins can remove members');
      if (targetUid === room.creatorId) throw new Error('Cannot remove the room creator');

      const memberRef = doc(db, 'rooms', roomId, 'members', targetUid);
      const memberSnap = await tx.get(memberRef);
      if (!memberSnap.exists()) throw new Error('User is not a member');

      tx.delete(memberRef);

      const newAdmins = (room.admins || []).filter((a) => a !== targetUid);
      tx.update(roomRef, {
        members: arrayRemove(targetUid),
        admins: newAdmins,
        membersCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
    });
  }

  async sendMessage(roomId: string, senderId: string, text: string): Promise<void> {
    if (!roomId || !senderId || !text || typeof roomId !== 'string' || typeof senderId !== 'string' || typeof text !== 'string' || roomId.trim() === '' || senderId.trim() === '') {
      throw new Error('Invalid parameters for sendMessage');
    }

    const trimmed = text.trim();
    if (!trimmed) return;

    const msgRef = doc(collection(db, 'rooms', roomId, 'messages'));
    await setDoc(msgRef, {
      id: msgRef.id,
      roomId,
      senderId,
      text: trimmed,
      timestamp: serverTimestamp(),
    });
  }

  async setTypingStatus(roomId: string, userId: string, isTyping: boolean): Promise<void> {
    if (!roomId || !userId || typeof roomId !== 'string' || typeof userId !== 'string' || roomId.trim() === '' || userId.trim() === '') {
      throw new Error('Invalid parameters for setTypingStatus');
    }

    // This would typically update a typing status in Firestore
    // For now, we'll implement a simple version
    if (isTyping) {
      const typingRef = doc(db, 'rooms', roomId, 'typing', userId);
      await setDoc(typingRef, { 
        userId, 
        timestamp: serverTimestamp() 
      });
    } else {
      const typingRef = doc(db, 'rooms', roomId, 'typing', userId);
      await deleteDoc(typingRef);
    }
  }

  subscribeToMyRooms(userId: string, onUpdate: (rooms: Room[]) => void): () => void {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.error('Invalid userId for subscribeToMyRooms:', userId);
      return () => {};
    }
    
    try {
      const q = query(collection(db, 'rooms'), where('members', 'array-contains', userId));
      const unsub = onSnapshot(q, (snap) => {
        const list: Room[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as Room), id: d.id }));
        // sort by updatedAt desc if present
        list.sort((a: any, b: any) => {
          const at = (a.updatedAt as any)?.toMillis ? (a.updatedAt as any).toMillis() : 0;
          const bt = (b.updatedAt as any)?.toMillis ? (b.updatedAt as any).toMillis() : 0;
          return bt - at;
        });
        onUpdate(list);
      });
      return unsub;
    } catch (error) {
      console.error('Error subscribing to my rooms:', error);
      return () => {};
    }
  }

  subscribeToAllRooms(onUpdate: (rooms: Room[]) => void): () => void {
    try {
      // Remove orderBy to avoid index issues - will sort client-side
      const q = query(collection(db, 'rooms'));
      const unsub = onSnapshot(q, (snap) => {
        const now = Date.now();
        const list: Room[] = [];
        snap.forEach((d) => {
          const r = { ...(d.data() as Room), id: d.id } as any;
          const endsAtMs = (r.endsAt as any)?.toMillis?.() || (r.endsAt as any);
          if (r.isTemporary && endsAtMs && endsAtMs <= now) {
            // skip expired temp rooms
            return;
          }
          list.push(r);
        });
        
        // Sort client-side by updatedAt desc
        list.sort((a: any, b: any) => {
          const at = (a.updatedAt as any)?.toMillis ? (a.updatedAt as any).toMillis() : 0;
          const bt = (b.updatedAt as any)?.toMillis ? (b.updatedAt as any).toMillis() : 0;
          return bt - at;
        });
        
        onUpdate(list);
      });
      return unsub;
    } catch (error) {
      console.error('Error subscribing to all rooms:', error);
      return () => {};
    }
  }

  isRoomExpired(room: Room | (Room & { endsAt?: any })): boolean {
    if (!room?.isTemporary) return false;
    const endsAtMs = (room as any)?.endsAt?.toMillis?.() || (room as any)?.endsAt;
    return !!endsAtMs && endsAtMs <= Date.now();
  }

  // Legacy methods for backward compatibility
  listenToRoom = this.subscribeToRoom;
  listenToMembers = this.subscribeToRoomMembers;
  listenToMessages = this.subscribeToRoomMessages;
  exitRoom = this.leaveRoom;
}

export const roomService = new RoomService(); 