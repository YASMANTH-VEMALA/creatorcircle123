import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notificationService';

interface NotificationIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  showCount?: boolean;
  style?: any;
}

const NotificationIndicator: React.FC<NotificationIndicatorProps> = ({ 
  size = 'medium', 
  showCount = true,
  style 
}) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = notificationService.listenToNotifications(user.uid, (notifications) => {
      const count = notifications.filter(notification => !notification.read).length;
      setUnreadCount(count);
    });

    return unsubscribe;
  }, [user?.uid]);

  if (unreadCount === 0) return null;

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: { width: 8, height: 8, borderRadius: 4 },
          text: { fontSize: 8 }
        };
      case 'large':
        return {
          container: { width: 20, height: 20, borderRadius: 10 },
          text: { fontSize: 12 }
        };
      default:
        return {
          container: { width: 16, height: 16, borderRadius: 8 },
          text: { fontSize: 10 }
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View style={[styles.container, sizeStyles.container, style]}>
      {showCount && unreadCount > 0 && (
        <Text style={[styles.count, sizeStyles.text]}>
          {unreadCount > 99 ? '99+' : unreadCount.toString()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -2,
    right: -2,
  },
  count: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default NotificationIndicator; 