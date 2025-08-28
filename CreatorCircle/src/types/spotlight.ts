export interface SpotlightPost {
  id: string;
  userId: string;
  videoURL: string;
  caption: string;
  createdAt: Date;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  duration: number; // video duration in seconds
  thumbnailURL?: string; // video thumbnail
  audioInfo?: string; // "original audio" or custom audio name
  isPublic: boolean;
  tags?: string[]; // hashtags extracted from caption
  mentions?: string[]; // user mentions extracted from caption
}

export interface SpotlightLike {
  id: string;
  postId: string;
  userId: string;
  createdAt: Date;
}

export interface SpotlightComment {
  id: string;
  postId: string;
  userId: string;
  commentText: string;
  createdAt: Date;
  replyToCommentId?: string; // for nested replies
  likesCount: number;
}

export interface SpotlightShare {
  id: string;
  postId: string;
  senderId: string;
  receiverId: string;
  createdAt: Date;
  message?: string; // optional message when sharing
}

export interface SpotlightUser {
  uid: string;
  name: string;
  username: string;
  profilePhotoUrl: string;
  verifiedBadge: 'none' | 'silver' | 'gold';
  followersCount: number;
  isFollowing?: boolean; // whether current user follows this creator
}

export interface SpotlightPostWithUser extends SpotlightPost {
  creator: SpotlightUser;
  isLiked: boolean;
  isSaved: boolean;
  currentUserLikeId?: string;
} 