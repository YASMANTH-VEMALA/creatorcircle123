import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { UserLocation } from '../services/locationService';

interface UserMapMarkerProps {
  user: UserLocation;
  onPress?: () => void;
}

const { width } = Dimensions.get('window');

const UserMapMarker: React.FC<UserMapMarkerProps> = ({ user, onPress }) => {
  const getVerifiedBadgeColor = () => {
    switch (user.verified) {
      case true:
        return '#007AFF'; // Blue
      default:
        return 'transparent';
    }
  };

  const renderSkillsAndInterests = () => {
    const allItems = [...user.skills, ...user.interests];
    const displayItems = allItems.slice(0, 2);
    const remainingCount = allItems.length - 2;

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
    <Marker
      coordinate={{
        latitude: user.location.latitude,
        longitude: user.location.longitude,
      }}
      onPress={onPress}
    >
      {/* Custom Marker */}
      <View style={styles.markerContainer}>
        <View style={styles.avatarContainer}>
          <Image
            source={
              user.photoURL
                ? { uri: user.photoURL }
                : { uri: `https://via.placeholder.com/40x40/007AFF/FFFFFF?text=${user.displayName?.charAt(0) || 'U'}` }
            }
            style={styles.avatar}
            defaultSource={{ uri: `https://via.placeholder.com/40x40/007AFF/FFFFFF?text=${user.displayName?.charAt(0) || 'U'}` }}
          />
          {user.verified && (
            <View style={[styles.verifiedBadge, { backgroundColor: getVerifiedBadgeColor() }]}>
              <Ionicons name="checkmark" size={8} color="white" />
            </View>
          )}
        </View>
        <View style={styles.markerArrow} />
      </View>

      {/* Callout/Info Window */}
      <Callout style={styles.callout}>
        <View style={styles.calloutContent}>
          <View style={styles.calloutHeader}>
            <Image
              source={
                user.photoURL
                  ? { uri: user.photoURL }
                  : { uri: `https://via.placeholder.com/50x50/007AFF/FFFFFF?text=${user.displayName?.charAt(0) || 'U'}` }
              }
              style={styles.calloutAvatar}
              defaultSource={{ uri: `https://via.placeholder.com/50x50/007AFF/FFFFFF?text=${user.displayName?.charAt(0) || 'U'}` }}
            />
            <View style={styles.calloutUserInfo}>
              <Text style={styles.calloutName}>{user.displayName}</Text>
              <Text style={styles.calloutDistance}>
                {user.distance ? `${(user.distance * 1000).toFixed(0)}m away` : 'Nearby'}
              </Text>
            </View>
            {user.verified && (
              <View style={[styles.calloutVerifiedBadge, { backgroundColor: getVerifiedBadgeColor() }]}>
                <Ionicons name="checkmark" size={12} color="white" />
              </View>
            )}
          </View>
          
          {renderSkillsAndInterests()}
          
          <View style={styles.calloutActions}>
            <Text style={styles.calloutActionText}>Tap to view profile</Text>
          </View>
        </View>
      </Callout>
    </Marker>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  markerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'white',
    marginTop: -1,
  },
  callout: {
    width: Math.min(width * 0.8, 280),
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  calloutContent: {
    padding: 16,
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  calloutAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  calloutUserInfo: {
    flex: 1,
  },
  calloutName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  calloutDistance: {
    fontSize: 12,
    color: '#666',
  },
  calloutVerifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 4,
  },
  skillTag: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
  calloutActions: {
    alignItems: 'center',
  },
  calloutActionText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
});

export default UserMapMarker; 