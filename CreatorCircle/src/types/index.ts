import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

export type SocialPlatform =
  | 'youtube'
  | 'instagram'
  | 'linkedin'
  | 'twitter'
  | 'facebook'
  | 'github'
  | 'tiktok'
  | 'website';

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}

export interface Banner {
  id: string;
  imageUrl: string;
  title: string | null; // Changed from optional to nullable
  description: string | null; // Changed from optional to nullable
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Profile {
  uid: string;
  email: string;
  name: string;
  college: string;
  passion: string;
  aboutMe: string;
  profilePhotoUrl: string;
  bannerPhotoUrl?: string;
  // Premium banners (up to 5 for premium users)
  banners?: Banner[];
  skills?: string[];
  interests?: string[];
  followers?: number;
  following?: number;
  connections?: number;
  isVerified?: boolean;
  verifiedBadge?: 'none' | 'silver' | 'gold';
  location?: string;
  joinedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  pushToken?: string;
  socialLinks?: SocialLink[];
  // AI API Key for personalized AI features
  aiApiKey?: string;
  // XP system fields
  xp?: number;
  level?: number;
  badges?: string[];
  lastLoginDate?: Date;
  loginStreak?: number;
  lastActivityAt?: Date;
  lastDecayAppliedAt?: Date;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userCollege?: string;
  userVerifiedBadge?: 'none' | 'silver' | 'gold';
  content: string;
  emoji?: string;
  images?: string[];
  videos?: string[];
  likes: number;
  comments: number;
  reports: number;
  reactions?: { [emoji: string]: number };
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: Date;
  // New fields for replies and likes
  replyToCommentId?: string;
  replyToUserName?: string;
  likes: number;
  isEdited?: boolean;
  editedAt?: Date;
}

export interface Report {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  reason: 'spam' | 'offensive' | 'fake' | 'inappropriate' | 'other';
  description?: string;
  createdAt: Date;
}

export interface Like {
  id: string;
  postId: string;
  userId: string;
  createdAt: Date;
}

export interface CollaborationRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
}

// Chat-related interfaces removed - will be re-implemented later

export interface Collaboration {
  id: string;
  requesterId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  timestamp: Date;
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'comment_reply' | 'comment_like' | 'collab_request' | 'request_accepted' | 'request_rejected' | 'report_warning';
  senderId: string;
  senderName: string;
  senderProfilePic?: string;
  senderVerified: boolean;
  relatedPostId?: string;
  relatedCommentId?: string;
  commentText?: string;
  timestamp: Timestamp;
  read: boolean;
  message?: string;
}

export interface NotificationPreview {
  id: string;
  type: 'like' | 'comment' | 'collab_request' | 'collab_accepted' | 'follow' | 'mention';
  fromUserName: string;
  fromUserAvatar?: string;
  fromUserCollege?: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Signup: undefined;
  Profile: undefined;
  UserProfile: {
    userId: string;
    userName?: string;
  };
  // New Chat System Routes
  MessagesList: undefined;
  ChatWindow: {
    chatId: string;
    otherUser: {
      id: string;
      name: string;
      profilePic: string;
      college: string;
      isVerified: boolean;
      isOnline: boolean;
      lastSeen: any;
    };
  };
  CollaborationRequests: undefined;
  Notifications: undefined;
  PostView: {
    postId: string;
  };
  PlatformTest: undefined;
  AvatarDemo: undefined;
  SuggestedPeople: undefined;
  NearbyCreators: undefined;
  Leaderboard: undefined;
  RoomsList: undefined;
  CreateRoom: undefined;
  RoomChat: { roomId: string; roomName?: string };
  LocationSettings: undefined;
  Settings: undefined;
  FindPeople: undefined;
  More: undefined;
  Spotlight: { initialPostId?: string } | undefined;
  CreateSpotlight: undefined;
  SpotlightDemo: undefined;
};

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
  endsAt?: Timestamp; // Changed from Date to Timestamp to match service
  createdAt: Timestamp; // Changed from Date to Timestamp to match service
  updatedAt: Timestamp; // Changed from Date to Timestamp to match service
}

export interface RoomMember {
  uid: string;
  role: 'admin' | 'member';
  joinedAt: Timestamp; // Changed from Date to Timestamp to match service
}

export interface RoomMessage {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  timestamp: Timestamp; // Changed from Date to Timestamp to match service
} 