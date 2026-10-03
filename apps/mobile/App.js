import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Alert, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';

export default function App() {
  const [token, setToken] = useState('');

  useEffect(() => {
    async function requestUserPermission() {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Authorization status:', authStatus);
        const fcmToken = await messaging().getToken();
        setToken(fcmToken);
        console.log('FCM Token:', fcmToken);
      } else {
        console.log('FCM Permission denied');
      }
    }

    requestUserPermission();

    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      Alert.alert('A new FCM message arrived!', JSON.stringify(remoteMessage));
      console.log('Foreground Message:', remoteMessage);
    });

    const unsubscribeOnTokenRefresh = messaging().onTokenRefresh(newToken => {
      console.log('Token Refreshed:', newToken);
      setToken(newToken);
      // Sync to backend via api if authenticated
    });

    return () => {
      unsubscribeOnMessage();
      unsubscribeOnTokenRefresh();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>VUZKI Mobile App</Text>
      <Text style={styles.tokenText} selectable={true}>
        {token ? `Push Token:\n${token}` : 'Requesting push token...'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f14',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 20,
  },
  tokenText: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'center',
  },
});
