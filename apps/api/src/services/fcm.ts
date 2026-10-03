import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { config } from '../config';

let fcmInitialized = false;

if (config.pushProvider === 'fcm' || config.pushProvider === 'firebase' || process.env.NODE_ENV === 'test') {
  try {
    let credential;
    if (config.fcmServerKey && config.fcmServerKey.startsWith('{')) {
      credential = cert(JSON.parse(config.fcmServerKey));
    }
    
    if (getApps().length === 0) {
      if (credential) {
        initializeApp({ credential });
        fcmInitialized = true;
        console.log('Firebase Admin initialized for Push Notifications');
      } else {
        initializeApp();
        fcmInitialized = true;
        console.log('Firebase Admin initialized with default credentials');
      }
    } else {
      fcmInitialized = true;
    }
  } catch (err) {
    console.error('Failed to initialize Firebase Admin:', err);
  }
}

export async function dispatchPushNotification(tokens: string[], title: string, body: string, data: Record<string, string> = {}) {
  if (!fcmInitialized) return;
  if (!tokens || tokens.length === 0) return;

  const message = {
    notification: { title, body },
    data,
    tokens,
  };

  try {
    const messaging = getMessaging();
    const response = await messaging.sendEachForMulticast(message);
    if (response.failureCount > 0) {
      response.responses.forEach((resp: any, idx: number) => {
        if (!resp.success) {
          console.warn(`FCM send failed for token ${tokens[idx]}:`, resp.error);
        }
      });
    }
  } catch (error) {
    console.error('Error dispatching FCM multicast:', error);
  }
}
