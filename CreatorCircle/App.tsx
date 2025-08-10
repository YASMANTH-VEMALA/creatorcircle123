import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { UserService } from './src/services/userService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
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
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
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

  useEffect(() => {
    let subscription: Notifications.Subscription | null = null;

    const init = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token && user?.uid) {
          await UserService.updateUserProfile(user.uid, { pushToken: token });
          console.log('Push token saved to user profile');
        }

        // Optional: listen to notifications received while app is foregrounded
        subscription = Notifications.addNotificationReceivedListener((notification) => {
          console.log('Notification received in foreground:', notification);
        });
      } catch (error) {
        console.error('Error in push registration:', error);
      }
    };

    init();

    return () => {
      if (subscription) {
        Notifications.removeNotificationSubscription(subscription);
      }
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
