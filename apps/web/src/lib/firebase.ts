import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "placeholder",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "vuzki-app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID || "1234567890",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1234567890:web:abcde"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export async function getWebPushToken() {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;
  
  try {
    const messaging = getMessaging(app);
    // Requires VAPID key configured in environment
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) return null;
    
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    return token;
  } catch (error) {
    console.warn('FCM Web Token Error:', error);
    return null;
  }
}
