import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface AvatarProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  source?: string;
  fallback?: string;
  verified?: boolean;
  style?: ViewStyle;
}

interface AvatarImageProps {
  source: string;
  size: 'small' | 'medium' | 'large' | 'xlarge';
  style?: ViewStyle;
}

interface AvatarFallbackProps {
  text: string;
  size: 'small' | 'medium' | 'large' | 'xlarge';
  style?: ViewStyle;
}

interface VerifiedBadgeProps {
  size: 'small' | 'medium' | 'large' | 'xlarge';
}

const AvatarImage: React.FC<AvatarImageProps> = ({ source, size, style }) => {
  const sizeConfig = getSizeConfig(size);
  
  return (
    <Image
      source={{ uri: source }}
      style={[
        styles.avatarImage,
        {
          width: sizeConfig.size,
          height: sizeConfig.size,
          borderRadius: sizeConfig.size / 2,
        },
        style,
      ]}
      placeholder={require('../../../assets/icon.png') as any}
      contentFit="cover"
      cachePolicy="disk"
      transition={150}
    />
  );
};

const AvatarFallback: React.FC<AvatarFallbackProps> = ({ text, size, style }) => {
  const sizeConfig = getSizeConfig(size);
  
  return (
    <View
      style={[
        styles.avatarFallback,
        {
          width: sizeConfig.size,
          height: sizeConfig.size,
          borderRadius: sizeConfig.size / 2,
        },
        style,
      ]}
    >
      <Text style={[styles.fallbackText, { fontSize: sizeConfig.fontSize }]}>
        {text}
      </Text>
    </View>
  );
};

const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ size }) => {
  const sizeConfig = getSizeConfig(size);
  
  return (
    <View
      style={[
        styles.verifiedBadge,
        {
          width: sizeConfig.badgeSize,
          height: sizeConfig.badgeSize,
          borderRadius: sizeConfig.badgeSize / 2,
        },
      ]}
    >
      <Ionicons
        name="checkmark-circle"
        size={sizeConfig.badgeIconSize}
        color="#FFFFFF"
      />
    </View>
  );
};

const getSizeConfig = (size: 'small' | 'medium' | 'large' | 'xlarge') => {
  switch (size) {
    case 'small':
      return { size: 40, fontSize: 14, badgeSize: 16, badgeIconSize: 10 };
    case 'medium':
      return { size: 50, fontSize: 16, badgeSize: 20, badgeIconSize: 12 };
    case 'large':
      return { size: 70, fontSize: 24, badgeSize: 24, badgeIconSize: 14 };
    case 'xlarge':
      return { size: 120, fontSize: 36, badgeSize: 32, badgeIconSize: 18 };
    default:
      return { size: 50, fontSize: 16, badgeSize: 20, badgeIconSize: 12 };
  }
};

const Avatar: React.FC<AvatarProps> = ({
  size = 'medium',
  source,
  fallback = 'U',
  verified = false,
  style,
}) => {
  const sizeConfig = getSizeConfig(size);
  
  return (
    <View style={[styles.container, style]}>
      {source ? (
        <AvatarImage source={source} size={size} />
      ) : (
        <AvatarFallback text={fallback} size={size} />
      )}
      
      {verified && (
        <VerifiedBadge size={size} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatarImage: {
    resizeMode: 'cover',
  },
  avatarFallback: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});

export { Avatar, AvatarImage, AvatarFallback, VerifiedBadge }; 