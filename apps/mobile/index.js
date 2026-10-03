import messaging from '@react-native-firebase/messaging';
import RNCallKeep from 'react-native-callkeep';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
  const data = remoteMessage.data || {};
  if (data.type === 'call') {
    // Show native incoming call UI
    RNCallKeep.displayIncomingCall(
      data.contextId || 'unknown',
      data.callerIdentifier || 'VUZKI User',
      data.callerName || 'Incoming Call',
      'generic',
      data.hasVideo === 'true'
    );
  }
});

// App routing and setup handled by Expo Router
import 'expo-router/entry';
