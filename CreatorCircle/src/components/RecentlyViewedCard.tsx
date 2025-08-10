import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ViewedProfile } from '../services/searchHistoryService';
import { Avatar } from './ui/Avatar';

const { width } = Dimensions.get('window');

interface RecentlyViewedCardProps {
  profile: ViewedProfile;
  onPress: (profile: ViewedProfile) => void;
  onRemove: (userId: string) => void;
}

const RecentlyViewedCard: React.FC<RecentlyViewedCardProps> = ({
  profile,
  onPress,
  onRemove,
}) => {
  const formatTimeAgo = (viewedAt: any) => {
    const now = new Date();
    let viewedDate: Date;
    
    // Handle Firestore timestamp
    if (viewedAt && typeof viewedAt.toDate === 'function') {
      viewedDate = viewedAt.toDate();
    } else if (viewedAt instanceof Date) {
      viewedDate = viewedAt;
    } else if (viewedAt && typeof viewedAt === 'object' && viewedAt.seconds) {
      // Handle Firestore timestamp object
      viewedDate = new Date(viewedAt.seconds * 1000);
    } else {
      // Fallback to current time if invalid
      viewedDate = new Date();
    }
    
    const diffInMinutes = Math.floor((now.getTime() - viewedDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(profile)}
      activeOpacity={0.9}
    >
      <View style={styles.glassContainer}>
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.6)',
            'rgba(255, 255, 255, 0.4)',
            'rgba(255, 255, 255, 0.2)',
            'rgba(255, 255, 255, 0.1)'
          ]}
          style={styles.gradientOverlay}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <BlurView intensity={60} style={styles.blurContainer}>
            <View style={styles.content}>
              <View style={styles.avatarContainer}>
                <Avatar
                  size="medium"
                  source={profile.profilePhotoUrl}
                  fallback={profile.name.charAt(0).toUpperCase()}
                  verified={false}
                />
              </View>
              
              <View style={styles.textContainer}>
                <Text style={styles.name} numberOfLines={1}>
                  {profile.name}
                </Text>
                <Text style={styles.college} numberOfLines={1}>
                  {profile.college}
                </Text>
                <Text style={styles.timeAgo}>
                  {formatTimeAgo(profile.viewedAt)}
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => onRemove(profile.userId)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={20} color="rgba(0, 0, 0, 0.7)" />
              </TouchableOpacity>
            </View>
          </BlurView>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    // Enhanced liquid glass shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  glassContainer: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(255, 248, 240, 0.3)', // Cream background
    // Enhanced inner shadow for depth
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  gradientOverlay: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  blurContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 248, 240, 0.1)', // Subtle cream tint
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  avatarContainer: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    marginRight: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000', // Black text
    marginBottom: 4,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  college: {
    fontSize: 15,
    color: '#333333', // Dark gray text
    marginBottom: 3,
    fontWeight: '500',
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  timeAgo: {
    fontSize: 13,
    color: '#666666', // Medium gray text
    fontStyle: 'italic',
    fontWeight: '400',
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  removeButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
});

export default RecentlyViewedCard; 