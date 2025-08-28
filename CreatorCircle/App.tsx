import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { UserService } from './src/services/userService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { locationService } from './src/services/locationService';
import { navigationRef } from './src/navigation/navigationRef';

// Conditionally import expo-notifications to avoid Android issues
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (error) {
  console.warn('expo-notifications not available:', error);
}

// Define a safe type for notification subscription
type NotificationSubscription = any;

// Configure notification handler for better UX
if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async (notification: any) => {
        try {
          // Handle notification when app is in foreground
          const { data } = notification.request.content;
          
          // Return appropriate response based on notification type
          return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          };
        } catch (error) {
          console.warn('Error in notification handler:', error);
          // Return default response on error
          return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          };
        }
      },
    });
  } catch (error) {
    console.warn('Failed to set notification handler:', error);
  }
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Notifications) {
    console.warn('Notifications not available, skipping push registration');
    return null;
  }

  try {
    // Check if we're on a supported platform
    if (Platform.OS === 'web') {
      console.warn('Web platform not supported for push notifications');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('Push notification permission not granted');
      return null;
    }

    // Try to get projectId from different sources
    let projectId: string | null = null;
    
    try {
      // Try to get from app.json config
      const Constants = require('expo-constants');
      projectId = Constants?.expoConfig?.extra?.eas?.projectId || 
                  Constants?.easConfig?.projectId ||
                  Constants?.manifest?.extra?.eas?.projectId;
    } catch (error) {
      console.warn('Could not load Constants:', error);
    }

    // If still no projectId, try to get from environment or use a fallback
    if (!projectId || projectId === 'your-project-id') {
      console.warn('Missing or invalid EAS projectId. Push notifications will be disabled.');
      console.warn('To enable push notifications:');
      console.warn('1. Run: npx eas init');
      console.warn('2. Update app.json with the real projectId');
      return null;
    }

    console.log('Using projectId for push notifications:', projectId);

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      } catch (error) {
        console.warn('Failed to set Android notification channel:', error);
        // Continue without the channel - notifications will still work
      }
    }

    console.log('Push notification token obtained:', token);
    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

const PushRegistration: React.FC = () => {
  const { user } = useAuth();
  const notificationListener = useRef<NotificationSubscription | null>(null);
  const responseListener = useRef<NotificationSubscription | null>(null);

  // Handle notification response and navigate accordingly
  const handleNotificationResponse = async (data: any) => {
    try {
      console.log('🔔 Push notification response received:', data);
      
      if (!data) {
        console.log('No data in notification response');
        return;
      }

      const { type, relatedPostId, senderId, relatedCommentId } = data;
      console.log('Notification data:', { type, relatedPostId, senderId, relatedCommentId });
      
      // Use the navigation reference to navigate
      if (!navigationRef.current) {
        console.warn('Navigation not ready yet, storing post ID for later');
        // Store the post ID even if navigation isn't ready
        if (relatedPostId && (type === 'like' || type === 'comment' || type === 'comment_reply' || type === 'comment_like' || type === 'report_warning')) {
          try {
            await AsyncStorage.setItem('cc.pendingPostPreview', relatedPostId);
            console.log('Stored post ID for later preview:', relatedPostId);
          } catch (error) {
            console.error('Error storing pending post preview:', error);
          }
        }
        return;
      }

      // Navigate based on notification type
      switch (type) {
        case 'like':
        case 'comment':
        case 'comment_reply':
        case 'comment_like':
          if (relatedPostId) {
            console.log('Storing post ID for preview modal:', relatedPostId);
            // Store the post ID for preview modal
            try {
              await AsyncStorage.setItem('cc.pendingPostPreview', relatedPostId);
              console.log('Successfully stored post ID for preview');
            } catch (error) {
              console.error('Error storing pending post preview:', error);
            }
            // Navigate to notifications screen which will show the post preview modal
            console.log('Navigating to notifications screen');
            navigationRef.current.navigate('Notifications');
          } else {
            console.log('No related post ID found for notification type:', type);
            navigationRef.current.navigate('Notifications');
          }
          break;
          
        case 'collab_request':
        case 'request_accepted':
        case 'request_rejected':
          if (senderId) {
            console.log('Navigating to user profile:', senderId);
            navigationRef.current.navigate('UserProfile', { userId: senderId });
          } else {
            console.log('No sender ID found, navigating to notifications');
            navigationRef.current.navigate('Notifications');
          }
          break;
          
        case 'report_warning':
          if (relatedPostId) {
            console.log('Storing post ID for report warning preview:', relatedPostId);
            try {
              await AsyncStorage.setItem('cc.pendingPostPreview', relatedPostId);
            } catch (error) {
              console.error('Error storing pending post preview:', error);
            }
            navigationRef.current.navigate('Notifications');
          } else {
            console.log('No related post ID for report warning, navigating to notifications');
            navigationRef.current.navigate('Notifications');
          }
          break;
          
        default:
          console.log('Unknown notification type, navigating to notifications:', type);
          navigationRef.current.navigate('Notifications');
      }
    } catch (error) {
      console.error('❌ Error handling notification response:', error);
      // Fallback: navigate to notifications screen
      if (navigationRef.current) {
        navigationRef.current.navigate('Notifications');
      }
    }
  };

  useEffect(() => {
    let subscription: NotificationSubscription | null = null;

    const init = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token && user?.uid) {
          await UserService.updateUserProfile(user.uid, { pushToken: token });
          console.log('Push token saved to user profile');
        }

        // Listen to notifications received while app is foregrounded
        if (Notifications) {
          try {
            subscription = Notifications.addNotificationReceivedListener((notification: any) => {
              console.log('Notification received in foreground:', notification);
              // You can add custom handling here if needed
            });
          } catch (error) {
            console.warn('Failed to add notification received listener:', error);
          }

          // Listen to notification responses (when user taps notification)
          try {
            responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
              console.log('Notification response received:', response);
              
              const { data } = response.notification.request.content;
              handleNotificationResponse(data);
            });
          } catch (error) {
            console.warn('Failed to add notification response listener:', error);
          }
        }
      } catch (error) {
        console.error('Error in push registration:', error);
      }
    };

    init();

    return () => {
      if (subscription && Notifications) {
        try {
          Notifications.removeNotificationSubscription(subscription);
        } catch (error) {
          console.warn('Error removing notification subscription:', error);
        }
      }
      if (responseListener.current && Notifications) {
        try {
          Notifications.removeNotificationSubscription(responseListener.current);
        } catch (error) {
          console.warn('Error removing response listener:', error);
        }
      }
    };
  }, [user?.uid]);

  return null;
};

const LocationSharingBootstrap: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    let isCancelled = false;

    const bootstrap = async () => {
      try {
        if (!user?.uid) return;

        const saved = await AsyncStorage.getItem('cc.location.sharingEnabled');
        const enabled = saved ? JSON.parse(saved) : false;
        if (!enabled) return;

        // Only auto-resume if permissions are already granted to avoid prompting on launch
        const fgGranted = await locationService.checkLocationPermission();
        const bgGranted = await locationService.checkBackgroundPermission();
        if (!fgGranted || !bgGranted) return;

        const profile = await UserService.getUserProfile(user.uid);
        if (!profile || isCancelled) return;

        await locationService.startBackgroundUpdates(user.uid, {
          displayName: profile.name || user.email || 'Unknown',
          college: profile.college || 'Unknown',
          skills: profile.skills || [],
          interests: profile.interests || [],
          verified: profile.isVerified || false,
          photoURL: profile.profilePhotoUrl || undefined,
        });
        console.log('Background location sharing resumed on app launch');
      } catch (e) {
        console.warn('Location bootstrap failed:', e);
      }
    };

    bootstrap();

    return () => {
      isCancelled = true;
    };
  }, [user?.uid]);

  return null;
};

export default function App() {
  return (
    <AuthProvider>
      <PushRegistration />
      <AppNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
