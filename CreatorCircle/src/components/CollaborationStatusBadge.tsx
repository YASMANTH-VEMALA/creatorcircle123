import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface CollaborationStatus {
  status: 'none' | 'pending' | 'accepted' | 'rejected';
  requestId?: string;
  isSender?: boolean;
  message?: string;
}

interface CollaborationStatusBadgeProps {
  status: CollaborationStatus | null;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  onPress?: () => void;
}

export const CollaborationStatusBadge: React.FC<CollaborationStatusBadgeProps> = ({
  status,
  size = 'medium',
  showText = true,
  onPress
}) => {
  if (!status || status.status === 'none') {
    return null;
  }

  const getStatusConfig = () => {
    switch (status.status) {
      case 'accepted':
        return {
          icon: 'people',
          color: '#4CAF50',
          backgroundColor: '#E8F5E8',
          text: 'Collaborated'
        };
      case 'pending':
        return {
          icon: 'time-outline',
          color: '#FF9500',
          backgroundColor: '#FFF8E1',
          text: status.isSender ? 'Pending...' : 'Respond'
        };
      case 'rejected':
        return {
          icon: 'close-circle-outline',
          color: '#FF3B30',
          backgroundColor: '#FFEBEE',
          text: 'Rejected'
        };
      default:
        return {
          icon: 'help-outline',
          color: '#666',
          backgroundColor: '#F5F5F5',
          text: 'Unknown'
        };
    }
  };

  const config = getStatusConfig();
  const sizeConfig = {
    small: { padding: 4, fontSize: 10, iconSize: 12 },
    medium: { padding: 6, fontSize: 12, iconSize: 14 },
    large: { padding: 8, fontSize: 14, iconSize: 16 }
  };

  const currentSize = sizeConfig[size];

  return (
    <View style={[
      styles.badge,
      {
        backgroundColor: config.backgroundColor,
        paddingHorizontal: currentSize.padding,
        paddingVertical: currentSize.padding / 2,
      }
    ]}>
      <Ionicons 
        name={config.icon as any} 
        size={currentSize.iconSize} 
        color={config.color} 
      />
      {showText && (
        <Text style={[
          styles.text,
          {
            color: config.color,
            fontSize: currentSize.fontSize,
            marginLeft: 4,
          }
        ]}>
          {config.text}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '500',
  },
});

export default CollaborationStatusBadge; 