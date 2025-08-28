import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notificationService';
import { collaborationService } from '../services/collaborationService';
import NotificationPostModal from '../components/NotificationPostModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationItem {
  id: string;
  type: 'like' | 'comment' | 'comment_reply' | 'comment_like' | 'collab_request' | 'request_accepted' | 'request_rejected' | 'report_warning' | 'follow';
  message: string;
  timestamp: any;
  read: boolean;
  senderId: string;
  senderName: string;
  senderVerified: boolean;
  senderProfilePic?: string;
  relatedPostId?: string;
  relatedCommentId?: string;
}

interface CollaborationRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderProfilePic?: string;
  message: string;
  createdAt: any;
  status: 'pending' | 'accepted' | 'rejected';
  senderCollege?: string;
}

const NotificationsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  
  // State management
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<CollaborationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);
  
  // Modal state
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Load notifications when user changes
  useEffect(() => {
    if (user?.uid) {
      loadNotifications();
      loadPendingRequests();
    }
  }, [user?.uid]);

  // Check for pending post preview when screen is focused
  useFocusEffect(
    useCallback(() => {
      checkForPendingPostPreview();
    }, [])
  );

  const checkForPendingPostPreview = async () => {
    try {
      const pendingPostId = await AsyncStorage.getItem('cc.pendingPostPreview');
      if (pendingPostId) {
        console.log('Found pending post preview:', pendingPostId);
        setSelectedPostId(pendingPostId);
        setShowPostModal(true);
        await AsyncStorage.removeItem('cc.pendingPostPreview');
      }
    } catch (error) {
      console.error('Error checking for pending post preview:', error);
    }
  };

  const loadNotifications = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const unsubscribe = notificationService.listenToNotifications(user.uid, (notifications) => {
        const convertedNotifications: NotificationItem[] = notifications.map(notification => ({
          id: notification.id,
          type: notification.type,
          message: notification.message || `${notification.senderName} sent you a notification`,
          timestamp: notification.timestamp,
          read: notification.read || false,
          senderId: notification.senderId,
          senderName: notification.senderName,
          senderVerified: notification.senderVerified || false,
          senderProfilePic: notification.senderProfilePic,
          relatedPostId: notification.relatedPostId,
          relatedCommentId: notification.relatedCommentId,
        }));
        
        setNotifications(convertedNotifications);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
      setLoading(false);
    }
  }, [user?.uid]);

  const loadPendingRequests = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const unsubscribe = collaborationService.listenToPendingRequests(user.uid, (requests) => {
        setPendingRequests(requests);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading pending requests:', error);
      setPendingRequests([]);
    }
  }, [user?.uid]);

  const handleNotificationPress = useCallback(async (item: NotificationItem) => {
    console.log('Notification pressed:', item);
    
    // Mark as read immediately
    if (!item.read && user?.uid) {
      try {
        await notificationService.markNotificationAsRead(user.uid, item.id);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Handle different notification types
    switch (item.type) {
      case 'like':
      case 'comment':
      case 'comment_reply':
      case 'comment_like':
        if (item.relatedPostId) {
          console.log('Showing post modal for:', item.relatedPostId);
          setSelectedPostId(item.relatedPostId);
          setShowPostModal(true);
        } else {
          Alert.alert('Error', 'Post not found');
        }
        break;
        
      case 'collab_request':
        if (item.senderId) {
          navigation.navigate('UserProfile' as never, { userId: item.senderId } as never);
        }
        break;
        
      case 'request_accepted':
        if (item.senderId) {
          navigation.navigate('Chat' as never, { 
            otherUserId: item.senderId,
            otherUserName: item.senderName 
          } as never);
        }
        break;
        
      case 'request_rejected':
        // Just show a message, no navigation needed
        Alert.alert('Request Declined', 'The collaboration request was declined.');
        break;
        
      case 'report_warning':
        if (item.relatedPostId) {
          setSelectedPostId(item.relatedPostId);
          setShowPostModal(true);
        }
        break;
        
      case 'follow':
        if (item.senderId) {
          navigation.navigate('UserProfile' as never, { userId: item.senderId } as never);
        }
        break;
        
      default:
        console.log('Unknown notification type:', item.type);
    }
  }, [user?.uid, navigation]);

  const handleAcceptRequest = useCallback(async (request: CollaborationRequest) => {
    if (!user?.uid) return;

    try {
      setResponding(request.id);
      await collaborationService.respondToRequest(request.id, 'accepted');
      
      Alert.alert(
        'Request Accepted!',
        'You can now chat with this creator and see their live location.',
        [
          { text: 'OK' },
          { 
            text: 'Open Chat', 
            onPress: () => {
              navigation.navigate('Chat' as never, { 
                otherUserId: request.senderId, 
                otherUserName: request.senderName 
              } as never);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Error', 'Failed to accept request. Please try again.');
    } finally {
      setResponding(null);
    }
  }, [user?.uid, navigation]);

  const handleRejectRequest = useCallback(async (request: CollaborationRequest) => {
    if (!user?.uid) return;

    try {
      setResponding(request.id);
      await collaborationService.respondToRequest(request.id, 'rejected');
      
      Alert.alert(
        'Request Declined',
        'The request has been declined.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error rejecting request:', error);
      Alert.alert('Error', 'Failed to reject request. Please try again.');
    } finally {
      setResponding(null);
    }
  }, [user?.uid]);

  const handleClosePostModal = useCallback(() => {
    console.log('Closing post modal');
    setShowPostModal(false);
    setSelectedPostId(null);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadNotifications();
      await loadPendingRequests();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadNotifications, loadPendingRequests]);

  const formatTimestamp = useCallback((timestamp: any) => {
    if (!timestamp) return 'Just now';
    
    try {
      let date: Date;
      
      if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp && typeof timestamp.toMillis === 'function') {
        date = new Date(timestamp.toMillis());
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        date = new Date();
      }
      
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Just now';
    }
  }, []);

  const getNotificationIcon = useCallback((type: string) => {
    switch (type) {
      case 'like': return { name: 'heart', color: '#FF3B30' };
      case 'comment': return { name: 'chatbubble', color: '#007AFF' };
      case 'comment_reply': return { name: 'chatbubble', color: '#007AFF' };
      case 'comment_like': return { name: 'heart', color: '#FF3B30' };
      case 'collab_request': return { name: 'people', color: '#FF9500' };
      case 'request_accepted': return { name: 'checkmark-circle', color: '#34C759' };
      case 'request_rejected': return { name: 'close-circle', color: '#FF3B30' };
      case 'report_warning': return { name: 'warning', color: '#FF9500' };
      case 'follow': return { name: 'person-add', color: '#5856D6' };
      default: return { name: 'notifications', color: '#666' };
    }
  }, []);

  const renderNotificationItem = useCallback(({ item }: { item: NotificationItem }) => {
    const icon = getNotificationIcon(item.type);
    
    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.read && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationIcon}>
          {item.senderProfilePic ? (
            <Image 
              source={{ uri: item.senderProfilePic }} 
              style={styles.userAvatar}
            />
          ) : (
            <View style={styles.defaultAvatar}>
              <Text style={styles.defaultAvatarText}>
                {item.senderName?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.notificationContent}>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>
          
          <View style={styles.notificationFooter}>
            <Text style={styles.senderName}>
              {item.senderName}
              {item.senderVerified && (
                <Ionicons name="checkmark-circle" size={14} color="#007AFF" style={{ marginLeft: 4 }} />
              )}
            </Text>
            <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
          </View>
        </View>
        
        <View style={styles.notificationAction}>
          <Ionicons name={icon.name as any} size={20} color={icon.color} />
          {!item.read && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  }, [handleNotificationPress, formatTimestamp, getNotificationIcon]);

  const renderPendingRequest = useCallback(({ item }: { item: CollaborationRequest }) => (
    <View style={styles.requestItem}>
      <View style={styles.requestHeader}>
        <View style={styles.requestUserInfo}>
          {item.senderProfilePic ? (
            <Image source={{ uri: item.senderProfilePic }} style={styles.requestAvatar} />
          ) : (
            <View style={styles.defaultAvatar}>
              <Text style={styles.defaultAvatarText}>
                {item.senderName?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View style={styles.requestUserDetails}>
            <Text style={styles.requestUserName}>{item.senderName}</Text>
            {item.senderCollege && (
              <Text style={styles.requestUserCollege}>{item.senderCollege}</Text>
            )}
          </View>
        </View>
        <Text style={styles.requestTimestamp}>{formatTimestamp(item.createdAt)}</Text>
      </View>
      
      <Text style={styles.requestMessage}>{item.message}</Text>
      
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.requestButton, styles.acceptButton]}
          onPress={() => handleAcceptRequest(item)}
          disabled={responding === item.id}
        >
          {responding === item.id ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="checkmark" size={16} color="white" />
              <Text style={styles.requestButtonText}>Accept</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.requestButton, styles.rejectButton]}
          onPress={() => handleRejectRequest(item)}
          disabled={responding === item.id}
        >
          {responding === item.id ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="close" size={16} color="white" />
              <Text style={styles.requestButtonText}>Decline</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  ), [handleAcceptRequest, handleRejectRequest, responding, formatTimestamp]);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptySubtitle}>
        You'll see notifications here when people interact with your content
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Loading notifications...</Text>
    </View>
  );

  if (loading) {
    return renderLoadingState();
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={
          pendingRequests.length > 0 ? (
            <View style={styles.requestsSection}>
              <Text style={styles.sectionTitle}>Collaboration Requests</Text>
              {pendingRequests.map((request) => (
                <View key={request.id}>
                  {renderPendingRequest({ item: request } as any)}
                </View>
              ))}
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContainer}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
      />

      {/* Post Preview Modal */}
      <NotificationPostModal
        isVisible={showPostModal}
        postId={selectedPostId || undefined}
        onClose={handleClosePostModal}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
  requestsSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 16,
  },
  notificationItem: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  notificationIcon: {
    marginRight: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  defaultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e1e5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  senderName: {
    fontSize: 12,
    color: '#999',
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  notificationAction: {
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    position: 'absolute',
    top: -2,
    right: -2,
  },
  requestItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  requestUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  requestUserDetails: {
    flex: 1,
  },
  requestUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 2,
  },
  requestUserCollege: {
    fontSize: 12,
    color: '#666',
  },
  requestTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  requestMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  requestButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
});

export default NotificationsScreen; 