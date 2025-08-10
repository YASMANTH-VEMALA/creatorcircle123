export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
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

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  media?: string[];
  timestamp: Date;
  isRead: boolean;
  seenBy?: string;
  seenAt?: Date;
  isEdited?: boolean;
  editedAt?: Date;
  isDeleted?: boolean;
  deletedAt?: Date;
  replyToMessageId?: string;
  replyToMessage?: Message;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: Message;
  lastMessageTime?: Date;
  unreadCount: number;
}

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
  type: 'like' | 'comment' | 'collab_request' | 'collab_accepted' | 'follow' | 'mention';
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  fromUserCollege?: string;
  toUserId: string;
  postId?: string;
  postContent?: string;
  message?: string;
  isRead: boolean;
  timestamp: Date;
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
  UserProfile: {
    userId: string;
    userName?: string;
  };
  ChatList: undefined;
  Chat: {
    otherUserId: string;
    otherUserName: string;
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
  endsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomMember {
  uid: string;
  role: 'admin' | 'member';
  joinedAt: Date;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  timestamp: Date;
} 