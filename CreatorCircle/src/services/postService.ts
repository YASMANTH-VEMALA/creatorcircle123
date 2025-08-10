import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  increment,
  setDoc,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Post, Comment, Report } from '../types';
import { PostUtils } from '../utils/postUtils';
import { ProfileImageService } from '../services/profileImageService';
import { xpService } from './xpService';

export class PostService {
  /**
   * Create a new post with proper Firebase Storage integration
   */
  static async createPost(
    userId: string,
    content: string,
    images: string[] = [],
    videos: string[] = [],
    emoji?: string
  ): Promise<string> {
    try {
      console.log('📝 Creating post for user:', userId);
      
      // Get user profile for post details
      const userProfile = await this.getUserProfileForPost(userId);
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Generate post ID
      const postId = doc(collection(db, 'posts')).id;
      
      // Upload media to Firebase Storage if they're local files
      const uploadedImages = await this.uploadMediaToFirebase(images, userId, postId, 'image');
      const uploadedVideos = await this.uploadMediaToFirebase(videos, userId, postId, 'video');

      const postData: Post = {
        id: postId,
        userId,
        userName: userProfile.name || 'Anonymous',
        userCollege: userProfile.college || '',
        userAvatar: userProfile.profilePhotoUrl || ProfileImageService.getDefaultImageUrl('profile'),
        userVerifiedBadge: userProfile.verifiedBadge || 'none',
        content: content.trim(),
        images: uploadedImages,
        videos: uploadedVideos,
        emoji: emoji || null, // Fix: Use null instead of undefined
        likes: 0,
        comments: 0,
        reports: 0,
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(doc(db, 'posts', postId), postData);
      console.log('✅ Post created successfully:', postId);

      // XP: award for post creation (await for immediate feedback)
      try {
        await xpService.awardForPostCreation(userId);
      } catch (e) {
        console.warn('XP award for post creation failed:', e);
      }

      return postId;
    } catch (error) {
      console.error('❌ Error creating post:', error);
      throw error;
    }
  }

  /**
   * Get user profile for post creation
   */
  private static async getUserProfileForPost(userId: string): Promise<any> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile for post:', error);
      return null;
    }
  }

  /**
   * Upload media files to Firebase Storage
   */
  private static async uploadMediaToFirebase(
    mediaUris: string[], 
    userId: string, 
    postId: string, 
    type: 'image' | 'video'
  ): Promise<string[]> {
    const uploadedUrls: string[] = [];
    
    for (const uri of mediaUris) {
      try {
        // Skip if already a Firebase Storage URL
        if (uri.startsWith('https://firebasestorage.googleapis.com/')) {
          uploadedUrls.push(uri);
          continue;
        }

        // Upload local file to Firebase Storage
        const firebaseUrl = await ProfileImageService.uploadProfileImage(uri, userId, 'postImage');
        uploadedUrls.push(firebaseUrl);
      } catch (error) {
        console.error(`Error uploading ${type}:`, error);
        // Use placeholder for failed uploads
        uploadedUrls.push(ProfileImageService.getDefaultImageUrl('postImage'));
      }
    }
    
    return uploadedUrls;
  }

  /**
   * Subscribe to all posts with real-time updates
   */
  static subscribeToPosts(callback: (posts: Post[]) => void) {
    try {
      console.log('📡 Subscribing to posts...');
      const q = query(collection(db, 'posts'));
      
      return onSnapshot(q, (snapshot) => {
        try {
          const posts: Post[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            console.log(`📝 Processing post ${doc.id}:`, {
              userId: data.userId,
              userAvatar: data.userAvatar,
              images: data.images?.length || 0
            });

            // Clean and validate post data
            const cleanedPost = this.cleanPostData(data, doc.id);
            posts.push(cleanedPost);
          });

          // Sort posts by creation date (newest first) in JavaScript
          posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

          console.log(`✅ Processed ${posts.length} posts`);
          callback(posts);
        } catch (error) {
          console.error('❌ Error processing posts:', error);
          callback([]);
        }
      }, (error) => {
        console.error('❌ Error subscribing to posts:', error);
        callback([]);
      });
    } catch (error) {
      console.error('❌ Error setting up posts subscription:', error);
      return () => {};
    }
  }

  /**
   * Subscribe to user's posts
   */
  static subscribeToUserPosts(userId: string, callback: (posts: Post[]) => void) {
    try {
      console.log(`📡 Subscribing to posts for user: ${userId}`);
      const q = query(
        collection(db, 'posts'),
        where('userId', '==', userId)
      );
      
      return onSnapshot(q, (snapshot) => {
        const posts: Post[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const cleanedPost = this.cleanPostData(data, doc.id);
          posts.push(cleanedPost);
        });
        
        // Sort posts by creation date (newest first) in JavaScript
        posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        callback(posts);
      });
    } catch (error) {
      console.error('❌ Error subscribing to user posts:', error);
      return () => {};
    }
  }

  /**
   * Clean and validate post data
   */
  private static cleanPostData(data: any, docId: string): Post {
    // Clean user avatar
    let userAvatar = data.userAvatar || '';
    if (!userAvatar || userAvatar.trim() === '' || ProfileImageService.isLocalFile(userAvatar)) {
      console.warn(`⚠️ Invalid user avatar in post ${docId}: ${userAvatar}`);
      userAvatar = ProfileImageService.getDefaultImageUrl('profile');
    }

    // Clean post images
    let images = data.images || [];
    if (Array.isArray(images)) {
      images = images.map((image: string) => {
        if (!image || image.trim() === '' || ProfileImageService.isLocalFile(image)) {
          console.warn(`⚠️ Invalid post image in post ${docId}: ${image}`);
          return ProfileImageService.getDefaultImageUrl('postImage');
        }
        return image;
      });
    }

    // Clean post videos
    let videos = data.videos || [];
    if (Array.isArray(videos)) {
      videos = videos.map((video: string) => {
        if (!video || video.trim() === '' || ProfileImageService.isLocalFile(video)) {
          console.warn(`⚠️ Invalid post video in post ${docId}: ${video}`);
          return ProfileImageService.getDefaultImageUrl('postImage');
        }
        return video;
      });
    }

    return {
      id: docId,
      userId: data.userId,
      userName: data.userName || 'Anonymous',
      userAvatar,
      userCollege: data.userCollege || '',
      content: data.content || '',
      images,
      videos,
      emoji: data.emoji || '',
      likes: data.likes || 0,
      comments: data.comments || 0,
      reports: data.reports || 0,
      isEdited: data.isEdited || false,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Post;
  }

  /**
   * Update a post
   */
  static async updatePost(postId: string, updates: Partial<Post>): Promise<void> {
    try {
      console.log('📝 Updating post:', postId);
      const postRef = doc(db, 'posts', postId);
      
      // Handle media uploads if provided
      let finalUpdates = { ...updates };
      
      if (updates.images) {
        const uploadedImages = await this.uploadMediaToFirebase(
          updates.images, 
          updates.userId || '', 
          postId, 
          'image'
        );
        finalUpdates.images = uploadedImages;
      }
      
      if (updates.videos) {
        const uploadedVideos = await this.uploadMediaToFirebase(
          updates.videos, 
          updates.userId || '', 
          postId, 
          'video'
        );
        finalUpdates.videos = uploadedVideos;
      }

      await updateDoc(postRef, {
        ...finalUpdates,
        isEdited: true,
        updatedAt: new Date(),
      });
      console.log('✅ Post updated successfully');
    } catch (error) {
      console.error('❌ Error updating post:', error);
      throw error;
    }
  }

  /**
   * Delete a post and all associated data
   */
  static async deletePost(postId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting post:', postId);
      
      const batch = writeBatch(db);
      
      // Delete the post
      batch.delete(doc(db, 'posts', postId));
      
      // Delete all likes for this post
      const likesQuery = query(collection(db, 'posts', postId, 'likes'));
      const likesSnapshot = await getDocs(likesQuery);
      likesSnapshot.forEach((likeDoc) => {
        batch.delete(likeDoc.ref);
      });
      
      // Delete all comments for this post
      const commentsQuery = query(collection(db, 'posts', postId, 'comments'));
      const commentsSnapshot = await getDocs(commentsQuery);
      commentsSnapshot.forEach((commentDoc) => {
        batch.delete(commentDoc.ref);
      });
      
      // Delete all reports for this post
      const reportsQuery = query(collection(db, 'posts', postId, 'reports'));
      const reportsSnapshot = await getDocs(reportsQuery);
      reportsSnapshot.forEach((reportDoc) => {
        batch.delete(reportDoc.ref);
      });
      
      await batch.commit();
      console.log('✅ Post and associated data deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting post:', error);
      throw error;
    }
  }

  /**
   * Check if user has liked a post
   */
  static async hasUserLiked(postId: string, userId: string): Promise<boolean> {
    try {
      const likeDoc = await getDoc(doc(db, 'posts', postId, 'likes', userId));
      return likeDoc.exists();
    } catch (error) {
      console.error('Error checking like status:', error);
      return false;
    }
  }

  /**
   * Toggle like on a post with proper validation
   */
  static async toggleLike(postId: string, userId: string): Promise<void> {
    try {
      const likeRef = doc(db, 'posts', postId, 'likes', userId);
      const likeDoc = await getDoc(likeRef);
      const postRef = doc(db, 'posts', postId);
      
      if (likeDoc.exists()) {
        // Unlike - remove like document and decrement count
        await deleteDoc(likeRef);
        await updateDoc(postRef, {
          likes: increment(-1)
        });
        console.log('✅ Post unliked successfully');
      } else {
        // Like - create like document and increment count
        await setDoc(likeRef, {
          userId,
          timestamp: serverTimestamp()
        });
        await updateDoc(postRef, {
          likes: increment(1)
        });
        console.log('✅ Post liked successfully');
        // XP: award like received to post owner
        try {
          const postSnap = await getDoc(postRef);
          const postOwnerId = postSnap.data()?.userId;
          if (postOwnerId && postOwnerId !== userId) {
            xpService.awardForLikeReceived(postOwnerId).catch(console.error);
          }
        } catch (e) {
          console.warn('Could not award XP for like received:', e);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error;
    }
  }

  /**
   * Subscribe to comments for a post
   */
  static subscribeToComments(postId: string, callback: (comments: Comment[]) => void) {
    try {
      const q = query(
        collection(db, 'posts', postId, 'comments')
      );
      
      return onSnapshot(q, (snapshot) => {
        const comments: Comment[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          comments.push({
            id: doc.id,
            postId,
            userId: data.userId,
            userName: data.userName || 'Anonymous',
            userAvatar: data.userAvatar || ProfileImageService.getDefaultImageUrl('profile'),
            content: data.content,
            createdAt: data.createdAt?.toDate() || new Date(),
          } as Comment);
        });
        
        // Sort comments by creation date (newest first) in JavaScript
        comments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        callback(comments);
      });
    } catch (error) {
      console.error('Error subscribing to comments:', error);
      return () => {};
    }
  }

  /**
   * Add a comment to a post
   */
  static async addComment(
    postId: string,
    userId: string,
    userName: string,
    userAvatar: string,
    content: string
  ): Promise<void> {
    try {
      const commentData = {
        userId,
        userName,
        userAvatar,
        content: content.trim(),
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'posts', postId, 'comments'), commentData);
      
      // Update post comment count
      await updateDoc(doc(db, 'posts', postId), {
        comments: increment(1)
      });
      
      console.log('✅ Comment added successfully');

      // XP: award for comment creation and comment received
      xpService.awardForComment(userId).catch(console.error);
      try {
        const postSnap = await getDoc(doc(db, 'posts', postId));
        const postOwnerId = postSnap.data()?.userId;
        if (postOwnerId && postOwnerId !== userId) {
          xpService.awardForCommentReceived(postOwnerId).catch(console.error);
        }
      } catch (e) {
        console.warn('Could not award XP for comment received:', e);
      }

    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  /**
   * Report a post
   */
  static async reportPost(
    postId: string,
    userId: string,
    userName: string,
    reason: Report['reason']
  ): Promise<void> {
    try {
      const reportData = {
        userId,
        userName,
        reason,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'posts', postId, 'reports'), reportData);
      
      // Update post report count
      await updateDoc(doc(db, 'posts', postId), {
        reports: increment(1)
      });
      
      console.log('✅ Post reported successfully');
      // XP: deduct for valid report on post owner
      try {
        const postSnap = await getDoc(doc(db, 'posts', postId));
        const postOwnerId = postSnap.data()?.userId;
        if (postOwnerId) {
          xpService.deductForReport(postOwnerId).catch(console.error);
        }
      } catch (e) {
        console.warn('Could not apply XP deduction for report:', e);
      }
    } catch (error) {
      console.error('Error reporting post:', error);
      throw error;
    }
  }

  /**
   * Get posts (for backward compatibility)
   */
  static async getPosts(): Promise<Post[]> {
    try {
      const snapshot = await getDocs(collection(db, 'posts'));
      const posts: Post[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const cleanedPost = this.cleanPostData(data, doc.id);
        posts.push(cleanedPost);
      });
      
      return posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('❌ Error getting posts:', error);
      throw error;
    }
  }

  /**
   * Get a single post by ID
   */
  static async getPost(postId: string): Promise<Post | null> {
    try {
      const postDoc = await getDoc(doc(db, 'posts', postId));
      if (postDoc.exists()) {
        const data = postDoc.data();
        return this.cleanPostData(data, postId);
      }
      return null;
    } catch (error) {
      console.error('Error getting post:', error);
      return null;
    }
  }

  /**
   * Get user's post count
   */
  static async getUserPostCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'posts'),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error getting user post count:', error);
      return 0;
    }
  }
} 