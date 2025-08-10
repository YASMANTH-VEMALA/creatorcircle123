import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SuggestedUser } from '../services/suggestedPeopleService';
import { FollowService } from '../services/followService';
import { useAuth } from '../contexts/AuthContext';

interface SuggestedPeopleCardProps {
  user: SuggestedUser;
  onFollowChange?: () => void;
}

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const cardsPerRow = isMobile ? 2 : 4;
const cardWidth = (width - 40 - (cardsPerRow - 1) * 12) / cardsPerRow;

const SuggestedPeopleCard: React.FC<SuggestedPeopleCardProps> = ({
  user,
  onFollowChange,
}) => {
  const { user: currentUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollow = async () => {
    if (!currentUser?.uid || isLoading) return;

    setIsLoading(true);
    try {
      if (isFollowing) {
        await FollowService.unfollowUser(currentUser.uid, user.uid);
        setIsFollowing(false);
      } else {
        await FollowService.followUser(currentUser.uid, user.uid);
        setIsFollowing(true);
      }
      onFollowChange?.();
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getVerifiedBadgeColor = () => {
    switch (user.verifiedBadge) {
      case 'gold':
        return '#FFD700';
      case 'silver':
        return '#C0C0C0';
      default:
        return 'transparent';
    }
  };

  const renderSkillsAndInterests = () => {
    const allItems = [...user.sharedSkills, ...user.sharedInterests];
    const displayItems = allItems.slice(0, 3);
    const remainingCount = allItems.length - 3;

    return (
      <View style={styles.skillsContainer}>
        {displayItems.map((item, index) => (
          <View key={index} style={styles.skillTag}>
            <Text style={styles.skillText}>{item}</Text>
          </View>
        ))}
        {remainingCount > 0 && (
          <Text style={styles.moreText}>+{remainingCount} more</Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.card, { width: cardWidth }]}>
      {/* CreatorCircle Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          <Text style={styles.creatorText}>Creator</Text>
          <Text style={styles.circleText}>Circle</Text>
        </Text>
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <Image
            source={
              user.profilePhotoUrl
                ? { uri: user.profilePhotoUrl }
                : { uri: 'https://via.placeholder.com/60x60/007AFF/FFFFFF?text=' + (user.name?.charAt(0) || 'U') }
            }
            style={styles.avatar}
            defaultSource={{ uri: 'https://via.placeholder.com/60x60/007AFF/FFFFFF?text=' + (user.name?.charAt(0) || 'U') }}
          />
          {user.verifiedBadge !== 'none' && (
            <View style={[styles.verifiedBadge, { backgroundColor: getVerifiedBadgeColor() }]}>
              <Ionicons name="checkmark" size={12} color="white" />
            </View>
          )}
        </View>

        <Text style={styles.name} numberOfLines={1}>
          {user.name}
        </Text>

        <Text style={styles.college} numberOfLines={1}>
          {user.college}
        </Text>

        {renderSkillsAndInterests()}

        <TouchableOpacity
          style={[
            styles.followButton,
            isFollowing && styles.followingButton,
            isLoading && styles.loadingButton,
          ]}
          onPress={handleFollow}
          disabled={isLoading}
        >
          <Text style={[
            styles.followButtonText,
            isFollowing && styles.followingButtonText,
          ]}>
            {isLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  banner: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  bannerText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  creatorText: {
    color: 'white',
  },
  circleText: {
    color: '#FFD700', // Yellow color
  },
  profileSection: {
    padding: 12,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  college: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 4,
  },
  skillTag: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  skillText: {
    fontSize: 10,
    color: '#666',
  },
  moreText: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
  },
  followButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#E0E0E0',
  },
  loadingButton: {
    opacity: 0.7,
  },
  followButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#666',
  },
});

export default SuggestedPeopleCard; 