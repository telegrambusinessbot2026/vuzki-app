importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "env-injected-at-build-or-runtime-placeholder",
  projectId: "vuzki-app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcde"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || 'New VUZKI Notification';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body,
    icon: '/icons/icon-192.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const data = event.notification.data || {};
  let targetUrl = '/app';
  if (data.type === 'message' && data.contextId) targetUrl = `/app/chat/${data.contextId}`;
  if (data.type === 'call') targetUrl = `/app/call/${data.contextId || 'incoming'}`;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === targetUrl && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('fetch', function(event) {});
