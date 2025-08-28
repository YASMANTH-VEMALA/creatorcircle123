import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { FollowService } from '../services/followService';

interface FollowButtonProps {
  targetUserId: string;
  targetUserName: string;
  onFollowStatusChange?: (isFollowing: boolean) => void;
  style?: any;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  targetUserId,
  targetUserName,
  onFollowStatusChange,
  style,
}) => {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [canFollow, setCanFollow] = useState(false);
  const [followMessage, setFollowMessage] = useState('');

  useEffect(() => {
    if (user?.uid && targetUserId) {
      checkFollowStatus();
      checkFollowEligibility();
    }
  }, [user?.uid, targetUserId]);

  const checkFollowStatus = async () => {
    if (!user?.uid) return;
    
    try {
      const following = await FollowService.isFollowing(user.uid, targetUserId);
      setIsFollowing(following);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const checkFollowEligibility = async () => {
    if (!user?.uid) return;
    
    try {
      const eligibility = await FollowService.canFollowUser(user.uid, targetUserId);
      setCanFollow(eligibility.canFollow);
      setFollowMessage(eligibility.message);
    } catch (error) {
      console.error('Error checking follow eligibility:', error);
      setCanFollow(false);
      setFollowMessage('Error checking follow eligibility');
    }
  };

  const handleFollowToggle = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to follow users');
      return;
    }

    if (!canFollow && !isFollowing) {
      Alert.alert('Cannot Follow', followMessage);
      return;
    }

    setIsLoading(true);

    try {
      if (isFollowing) {
        // Unfollow
        await FollowService.unfollowUser(user.uid, targetUserId);
        setIsFollowing(false);
        onFollowStatusChange?.(false);
        Alert.alert('Success', `You have unfollowed ${targetUserName}`);
      } else {
        // Follow
        await FollowService.followUser(user.uid, targetUserId);
        setIsFollowing(true);
        onFollowStatusChange?.(true);
        Alert.alert('Success', `You are now following ${targetUserName}!`);
      }
    } catch (error: any) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', error.message || 'Failed to update follow status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonStyle = () => {
    if (isFollowing) {
      return [styles.button, styles.followingButton, style];
    }
    if (!canFollow) {
      return [styles.button, styles.disabledButton, style];
    }
    return [styles.button, styles.followButton, style];
  };

  const getButtonText = () => {
    if (isFollowing) {
      return 'Following';
    }
    if (!canFollow) {
      return 'Cannot Follow';
    }
    return 'Follow';
  };

  const getButtonIcon = () => {
    if (isFollowing) {
      return 'checkmark';
    }
    if (!canFollow) {
      return 'close-circle';
    }
    return 'add';
  };

  const getButtonColor = () => {
    if (isFollowing) {
      return '#34C759';
    }
    if (!canFollow) {
      return '#FF3B30';
    }
    return '#007AFF';
  };

  if (!user?.uid || user.uid === targetUserId) {
    return null; // Don't show follow button for yourself
  }

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={handleFollowToggle}
      disabled={isLoading || (!canFollow && !isFollowing)}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <>
          <Ionicons name={getButtonIcon()} size={16} color="white" />
          <Text style={styles.buttonText}>{getButtonText()}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    minWidth: 100,
  },
  followButton: {
    backgroundColor: '#007AFF',
  },
  followingButton: {
    backgroundColor: '#34C759',
  },
  disabledButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FollowButton; 