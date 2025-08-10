import { db } from '../config/firebase';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
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
    creatorId: string;
    name: string;
    description?: string;
    isPrivate: boolean;
    joinKeyPlain?: string;
    isTemporary?: boolean;
    endsAtMs?: number;
    logoUri?: string;
  }): Promise<Room> {
    const roomId = generateRoomId(7);
    const roomRef = doc(db, 'rooms', roomId);
    let logoUrl: string | undefined;
    if (options.logoUri) {
      const path = `rooms/${roomId}/logo_${Date.now()}.jpg`;
      logoUrl = await FileUploadService.uploadFile(options.logoUri, path);
    }

    const nowTs = serverTimestamp() as unknown as Timestamp; // stored as server time
    const endsAt = options.isTemporary && options.endsAtMs ? Timestamp.fromMillis(options.endsAtMs) : undefined;

    const data: any = {
      id: roomId,
      name: options.name.trim(),
      isPrivate: !!options.isPrivate,
      creatorId: options.creatorId,
      admins: [options.creatorId],
      members: [options.creatorId],
      membersCount: 1,
      isTemporary: !!options.isTemporary,
      createdAt: nowTs,
      updatedAt: nowTs,
    };
    const desc = options.description?.trim();
    if (desc && desc.length > 0) data.description = desc;
    if (logoUrl) data.logoUrl = logoUrl;
    if (endsAt) data.endsAt = endsAt;

    await setDoc(roomRef, data);

    // Create membership doc for creator
    const memberRef = doc(db, 'rooms', roomId, 'members', options.creatorId);
    await setDoc(memberRef, { uid: options.creatorId, role: 'admin', joinedAt: serverTimestamp() });

    // Store join key hash in secret doc if private
    if (options.isPrivate && options.joinKeyPlain && options.joinKeyPlain.length > 0) {
      const hash = await sha256(options.joinKeyPlain);
      const secretRef = doc(db, 'rooms_secrets', roomId);
      await setDoc(secretRef, { joinKeyHash: hash, createdAt: serverTimestamp(), creatorId: options.creatorId });
    }

    // Return hydrated room object with actual timestamps fetched
    const created = await getDoc(roomRef);
    return { id: roomId, ...(created.data() as Room) };
  }

  async getRoom(roomId: string): Promise<Room | null> {
    const snap = await getDoc(doc(db, 'rooms', roomId));
    if (!snap.exists()) return null;
    return { id: roomId, ...(snap.data() as Room) };
  }

  listenToRoom(roomId: string, onUpdate: (room: Room | null) => void): () => void {
    const unsub = onSnapshot(doc(db, 'rooms', roomId), (d) => {
      onUpdate(d.exists() ? ({ id: roomId, ...(d.data() as Room) }) : null);
    });
    return unsub;
  }

  listenToMembers(roomId: string, onUpdate: (members: RoomMember[]) => void): () => void {
    const q = query(collection(db, 'rooms', roomId, 'members'), orderBy('joinedAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: RoomMember[] = [];
      snap.forEach((d) => list.push(d.data() as RoomMember));
      onUpdate(list);
    });
    return unsub;
  }

  async joinRoom(roomId: string, userId: string, joinKeyPlain?: string): Promise<void> {
    await runTransaction(db, async (tx) => {
      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) throw new Error('Room not found');
      const room = roomSnap.data() as Room;

      // Access check for private room
      if (room.isPrivate) {
        const secretRef = doc(db, 'rooms_secrets', roomId);
        const secretSnap = await tx.get(secretRef);
        const storedHash = secretSnap.exists() ? (secretSnap.data() as any).joinKeyHash : null;
        const providedHash = joinKeyPlain ? await sha256(joinKeyPlain) : null;
        if (!storedHash || !providedHash || storedHash !== providedHash) {
          throw new Error('Invalid join key');
        }
      }

      const memberRef = doc(db, 'rooms', roomId, 'members', userId);
      const memberSnap = await tx.get(memberRef);
      if (!memberSnap.exists()) {
        tx.set(memberRef, { uid: userId, role: 'member', joinedAt: serverTimestamp() });
        tx.update(roomRef, { members: arrayUnion(userId), membersCount: increment(1), updatedAt: serverTimestamp() });
      }
    });
  }

  async exitRoom(roomId: string, userId: string): Promise<void> {
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
      tx.update(roomRef, { members: arrayRemove(userId), membersCount: increment(-1), updatedAt: serverTimestamp(), admins: role === 'admin' ? (room.admins || []).filter((a) => a !== userId) : room.admins });

      // If no admins remain but there are members, promote the earliest member
      const newAdmins = (room.admins || []).filter((a) => a !== userId);
      if (newAdmins.length === 0) {
        // Note: cannot query inside transaction across subcollection ordering; fallback post-step: leave for admin UI or cloud function
      }
    });
  }

  async deleteRoom(roomId: string, actorUid: string): Promise<void> {
    // Soft client-side check; rules enforce as well
    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    if (!room.admins?.includes(actorUid)) throw new Error('Only admins can delete room');

    // Delete messages
    const msgsSnap = await (await import('firebase/firestore')).getDocs(collection(db, 'rooms', roomId, 'messages'));
    await Promise.all(msgsSnap.docs.map((d) => deleteDoc(d.ref)));

    // Delete members
    const memsSnap = await (await import('firebase/firestore')).getDocs(collection(db, 'rooms', roomId, 'members'));
    await Promise.all(memsSnap.docs.map((d) => deleteDoc(d.ref)));

    // Delete secret
    await deleteDoc(doc(db, 'rooms_secrets', roomId));

    // Delete room
    await deleteDoc(doc(db, 'rooms', roomId));
  }

  async grantAdmin(roomId: string, actorUid: string, targetUid: string): Promise<void> {
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

  // New: room creator can change the join key/password
  async updateJoinKey(roomId: string, actorUid: string, newJoinKeyPlain: string): Promise<void> {
    const trimmed = newJoinKeyPlain.trim();
    if (!trimmed) throw new Error('Join key cannot be empty');

    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    if (room.creatorId !== actorUid) throw new Error('Only the room host can change the password');

    const hash = await sha256(trimmed);
    const secretRef = doc(db, 'rooms_secrets', roomId);
    await setDoc(secretRef, { joinKeyHash: hash, updatedAt: serverTimestamp(), creatorId: room.creatorId }, { merge: true });
    // Ensure room is marked private when a key is set
    await updateDoc(doc(db, 'rooms', roomId), { isPrivate: true, updatedAt: serverTimestamp() });
  }

  // New: host can remove a specified member from the group
  async removeMember(roomId: string, actorUid: string, targetUid: string): Promise<void> {
    await runTransaction(db, async (tx) => {
      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) throw new Error('Room not found');
      const room = roomSnap.data() as Room;

      if (room.creatorId !== actorUid) throw new Error('Only the room host can remove members');
      if (targetUid === room.creatorId) throw new Error('Cannot remove the room host');

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

  listenToMessages(roomId: string, onUpdate: (messages: RoomMessage[]) => void): () => void {
    const q = query(collection(db, 'rooms', roomId, 'messages'), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: RoomMessage[] = [];
      snap.forEach((d) => list.push({ id: d.id, roomId, ...(d.data() as any) } as RoomMessage));
      onUpdate(list);
    });
    return unsub;
  }

  async sendMessage(roomId: string, senderId: string, text: string): Promise<void> {
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

  subscribeToMyRooms(userId: string, onUpdate: (rooms: Room[]) => void): () => void {
    const q = query(collection(db, 'rooms'), where('members', 'array-contains', userId));
    const unsub = onSnapshot(q, (snap) => {
      const list: Room[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Room) }));
      // sort by updatedAt desc if present
      list.sort((a: any, b: any) => {
        const at = (a.updatedAt as any)?.toMillis ? (a.updatedAt as any).toMillis() : 0;
        const bt = (b.updatedAt as any)?.toMillis ? (b.updatedAt as any).toMillis() : 0;
        return bt - at;
      });
      onUpdate(list);
    });
    return unsub;
  }
}

export const roomService = new RoomService(); 