import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { AuthProvider, useAuth } from '../src/lib/auth';
import messaging from '@react-native-firebase/messaging';
import RNCallKeep from 'react-native-callkeep';
import { Platform } from 'react-native';

const options = {
  ios: {
    appName: 'VUZKI',
    includesCallsInRecents: true,
  },
  android: {
    alertTitle: 'Permissions required',
    alertDescription: 'VUZKI needs to access your phone accounts',
    cancelButton: 'Cancel',
    okButton: 'ok',
    imageName: 'phone_account_icon',
    additionalPermissions: [],
    foregroundService: {
      channelId: 'vuzki_call_channel',
      channelName: 'Foreground service for my app',
      notificationTitle: 'My app is running on background',
      notificationIcon: 'Path to the resource icon of the notification',
    }, 
  }
};

try {
  RNCallKeep.setup(options);
  RNCallKeep.setAvailable(true);
} catch (e) {
  console.log('CallKeep setup failed', e);
}

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/(auth)/login');
      } else {
        router.replace('/(main)/home');
      }
    }
  }, [user, loading]);

  useEffect(() => {
    // Handle background notification tap deep links
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification caused app to open from background:', remoteMessage);
      const data = remoteMessage.data || {};
      if (data.type === 'message' && data.contextId) {
        router.push(`/(main)/chat/${data.contextId}`);
      } else if (data.type === 'call') {
        router.push(`/(main)/call/${data.contextId}`);
      }
    });

    // Handle terminated app opened via notification tap
    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
        console.log('Notification caused app to open from quit state:', remoteMessage);
        const data = remoteMessage.data || {};
        setTimeout(() => {
          if (data.type === 'message' && data.contextId) {
            router.push(`/(main)/chat/${data.contextId}`);
          } else if (data.type === 'call') {
            router.push(`/(main)/call/${data.contextId}`);
          }
        }, 1000); // give it a sec to load auth
      }
    });
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}

import { RealtimeProvider } from '../src/lib/realtime';

export default function RootLayout() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <RootLayoutNav />
      </RealtimeProvider>
    </AuthProvider>
  );
}
