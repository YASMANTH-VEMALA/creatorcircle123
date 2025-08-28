import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Profile } from '../types';
import { UserService } from './userService';
import { notificationService } from './notificationService';

// XP constants
const DAILY_XP_CAP = 2000;
const INACTIVITY_DECAY_DAYS = 7;
const INACTIVITY_DECAY_XP = 50;
const VERIFIED_BONUS_MULTIPLIER = 1.1;
const STREAK_DAILY_XP = 10;
const STREAK_BONUS_PER_DAY = 5;
const STREAK_BONUS_CAP = 50;

// Levels
const LEVEL_THRESHOLDS = [
  0,    // Level 1
  200,  // Level 2
  500,  // Level 3
  1000, // Level 4
  2000, // Level 5
];

function computeLevel(xp: number): number {
  if (xp < LEVEL_THRESHOLDS[1]) return 1;
  if (xp < LEVEL_THRESHOLDS[2]) return 2;
  if (xp < LEVEL_THRESHOLDS[3]) return 3;
  if (xp < LEVEL_THRESHOLDS[4]) return 4;
  if (xp < 4000) return 5;
  // Level 6+ every +2000 XP
  return 6 + Math.floor((xp - 4000) / 2000);
}

function getMilestoneBadges(xp: number): string[] {
  const badges: string[] = [];
  if (xp >= 1000) badges.push('Rising Creator');
  if (xp >= 5000) badges.push('Top Creator');
  if (xp >= 10000) badges.push('Elite Creator');
  return badges;
}

function getTodayKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`;
}

export type XpAction =
  | 'POST_CREATED'
  | 'POST_LIKED_RECEIVED'
  | 'POST_UNLIKED'
  | 'COMMENT_CREATED'
  | 'COMMENT_RECEIVED'
  | 'COMMENT_LIKED_RECEIVED'
  | 'COMMENT_UNLIKED'
  | 'COLLAB_ACCEPTED'
  | 'COLLAB_SENT'
  | 'POST_REPORTED_VALID'
  | 'LOGIN_DAILY'
  | 'POST_SHARED'
  | 'PROFILE_VERIFIED';

const BASE_XP: Record<XpAction, number> = {
  POST_CREATED: 20,
  POST_LIKED_RECEIVED: 5,
  POST_UNLIKED: -5,
  COMMENT_CREATED: 10,
  COMMENT_RECEIVED: 8,
  COMMENT_LIKED_RECEIVED: 3,
  COMMENT_UNLIKED: -3,
  COLLAB_ACCEPTED: 25,
  COLLAB_SENT: 15,
  POST_REPORTED_VALID: -30,
  LOGIN_DAILY: 10,
  POST_SHARED: 15,
  PROFILE_VERIFIED: 50,
};

const DAILY_LIMITS: Partial<Record<XpAction, number>> = {
  POST_CREATED: 5,
  POST_LIKED_RECEIVED: 100,
  POST_UNLIKED: 100,
  COMMENT_CREATED: 20,
  COMMENT_RECEIVED: 50,
  COMMENT_LIKED_RECEIVED: 200,
  COMMENT_UNLIKED: 200,
  COLLAB_SENT: 10,
  POST_SHARED: 5,
  LOGIN_DAILY: 1,
};

export class XpService {
  private async getUserProfile(uid: string): Promise<Profile | null> {
    return UserService.getUserProfile(uid);
  }

  private async getDailyCountersRef(uid: string) {
    const todayKey = getTodayKey();
    return doc(db, 'users', uid, 'xp_daily', todayKey);
  }

  private applyVerifiedBonus(profile: Profile | null, amount: number): number {
    if (profile?.isVerified) {
      return Math.round(amount * VERIFIED_BONUS_MULTIPLIER);
    }
    return amount;
  }

  private async getOrInitDaily(uid: string): Promise<{ total: number; counters: Record<string, number> }> {
    const ref = await this.getDailyCountersRef(uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data: any = snap.data();
      return { total: data.total || 0, counters: data.counters || {} };
    }
    await setDoc(ref, { total: 0, counters: {}, createdAt: serverTimestamp() });
    return { total: 0, counters: {} };
  }

  private async updateDaily(uid: string, total: number, counters: Record<string, number>) {
    const ref = await this.getDailyCountersRef(uid);
    await setDoc(ref, { total, counters, updatedAt: serverTimestamp() }, { merge: true });
  }

  private withinDailyLimit(action: XpAction, counters: Record<string, number>): boolean {
    const limit = DAILY_LIMITS[action];
    if (!limit) return true;
    return (counters[action] || 0) < limit;
  }

  private antiSpamOk(action: XpAction, metadata?: any): boolean {
    // Simple anti-spam hook. If caller passes recentCount within a short window, block if too high.
    if (metadata?.recentCount && metadata.recentCount > 5 && action === 'POST_CREATED') return false;
    return true;
  }

  private async logXp(uid: string, delta: number, action: XpAction, note?: string) {
    const ref = collection(db, 'users', uid, 'xp_logs');
    await addDoc(ref, {
      action,
      delta,
      note: note || '',
      createdAt: serverTimestamp(),
    });
  }

  private clampDaily(total: number, delta: number): number {
    if (delta >= 0 && total >= DAILY_XP_CAP) return 0;
    if (delta >= 0 && total + delta > DAILY_XP_CAP) return Math.max(DAILY_XP_CAP - total, 0);
    return delta;
  }

  private async applyDecayIfNeeded(uid: string, profile: Profile) {
    const lastActivity = profile.lastActivityAt ? new Date(profile.lastActivityAt) : null;
    const lastDecay = profile.lastDecayAppliedAt ? new Date(profile.lastDecayAppliedAt) : null;
    const now = new Date();

    const needsDecay = (!lastActivity || (now.getTime() - new Date(lastActivity).getTime()) > INACTIVITY_DECAY_DAYS * 86400000)
      && (!lastDecay || (now.getTime() - new Date(lastDecay).getTime()) > INACTIVITY_DECAY_DAYS * 86400000);

    if (needsDecay) {
      const newXp = Math.max(0, (profile.xp || 0) - INACTIVITY_DECAY_XP);
      await updateDoc(doc(db, 'users', uid), {
        xp: newXp,
        lastDecayAppliedAt: serverTimestamp(),
      });
      await this.logXp(uid, -INACTIVITY_DECAY_XP, 'LOGIN_DAILY', 'Inactivity decay');
    }
  }

  async award(uid: string, action: XpAction, metadata?: { receiverId?: string; note?: string; recentCount?: number }) {
    const profile = await this.getUserProfile(uid);
    if (!profile) return;

    // Decay check (non-blocking)
    await this.applyDecayIfNeeded(uid, profile);

    // Base XP and modifiers
    let delta = BASE_XP[action] || 0;

    // Streak logic for daily login
    if (action === 'LOGIN_DAILY') {
      const lastLogin = profile.lastLoginDate ? new Date(profile.lastLoginDate) : undefined;
      const now = new Date();
      const daysDiff = lastLogin ? Math.floor((now.getTime() - lastLogin.getTime()) / 86400000) : Infinity;
      let streak = profile.loginStreak || 0;
      if (daysDiff === 1) streak += 1; else streak = 1;
      const streakBonus = Math.min((streak - 1) * STREAK_BONUS_PER_DAY, STREAK_BONUS_CAP);
      delta += STREAK_DAILY_XP + streakBonus;
      await updateDoc(doc(db, 'users', uid), { lastLoginDate: now, loginStreak: streak });
    }

    // Anti-spam and daily limits
    const daily = await this.getOrInitDaily(uid);
    if (!this.withinDailyLimit(action, daily.counters)) return;
    if (!this.antiSpamOk(action, metadata)) return;

    // Verified bonus
    delta = this.applyVerifiedBonus(profile, delta);

    // Daily cap clamp
    const clamped = this.clampDaily(daily.total, delta);
    if (clamped === 0 && delta > 0) return; // hit cap

    // Apply XP
    const newXp = Math.max(0, (profile.xp || 0) + clamped);
    const newLevel = computeLevel(newXp);
    const prevLevel = profile.level || 1;

    await updateDoc(doc(db, 'users', uid), {
      xp: newXp,
      level: newLevel,
      lastActivityAt: serverTimestamp(),
    });

    // Update daily counters
    daily.total += Math.max(0, clamped);
    daily.counters[action] = (daily.counters[action] || 0) + 1;
    await this.updateDaily(uid, daily.total, daily.counters);

    // Log
    await this.logXp(uid, clamped, action, metadata?.note);

    // Handle milestone badges
    const newBadges = getMilestoneBadges(newXp);
    if (newBadges.length) {
      await updateDoc(doc(db, 'users', uid), { badges: newBadges });
    }

    // Level up notification
    if (newLevel > prevLevel) {
      const profileNow = await this.getUserProfile(uid);
      const displayName = profileNow?.name || 'Creator';
      await notificationService.createNotification(uid, {
        type: 'request_accepted', // reuse generic type for push title mapping
        senderId: uid,
        senderName: displayName,
        senderVerified: !!profileNow?.isVerified,
        message: `You reached Level ${newLevel}!`,
      });
    }
  }

  async awardForPostCreation(uid: string, metadata?: any) { return this.award(uid, 'POST_CREATED', metadata); }
  async awardForLikeReceived(postOwnerId: string) { return this.award(postOwnerId, 'POST_LIKED_RECEIVED'); }
  async awardForLike(postOwnerId: string) { return this.award(postOwnerId, 'POST_LIKED_RECEIVED'); }
  async deductForUnlike(postOwnerId: string) { return this.award(postOwnerId, 'POST_UNLIKED'); }
  async awardForComment(uid: string) { return this.award(uid, 'COMMENT_CREATED'); }
  async awardForCommentReceived(postOwnerId: string) { return this.award(postOwnerId, 'COMMENT_RECEIVED'); }
  async awardForCommentLike(commentOwnerId: string) { return this.award(commentOwnerId, 'COMMENT_LIKED_RECEIVED'); }
  async deductForCommentUnlike(commentOwnerId: string) { return this.award(commentOwnerId, 'COMMENT_UNLIKED'); }
  async awardForCollabAccepted(uid: string) { return this.award(uid, 'COLLAB_ACCEPTED'); }
  async awardForCollabSent(uid: string) { return this.award(uid, 'COLLAB_SENT'); }
  async deductForReport(uid: string) { return this.award(uid, 'POST_REPORTED_VALID'); }
  async awardForDailyLogin(uid: string) { return this.award(uid, 'LOGIN_DAILY'); }
  async awardForShare(uid: string) { return this.award(uid, 'POST_SHARED'); }
  async awardForVerification(uid: string) { return this.award(uid, 'PROFILE_VERIFIED'); }
}

export const xpService = new XpService(); 