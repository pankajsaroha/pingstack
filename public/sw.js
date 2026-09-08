// PingStack Web Push Service Worker v2.3
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const handlePush = async () => {
    try {
      let payload = {};
      try {
        payload = event.data.json();
      } catch {
        payload = { title: 'PingStack', body: event.data.text() };
      }

      const title = payload.title || 'PingStack';
      const notifTag = payload.tag || ('whatsapp-inbound-' + (payload.messageId || Date.now()));
      const options = {
        body: payload.body || 'You received a new message.',
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: notifTag,
        renotify: true,
        data: {
          url: payload.url || '/inbox',
          contactId: payload.contactId,
          tenantId: payload.tenantId,
          timestamp: payload.timestamp || Date.now(),
        },
      };

      const tasks = [];

      // 1. Always display the OS notification banner
      tasks.push(
        self.registration.showNotification(title, options).catch(async (err) => {
          console.error('[SW] showNotification error with full options, retrying fallback:', err);
          return self.registration.showNotification(title, {
            body: payload.body || 'You received a new message.',
            icon: '/icons/icon-192x192.png',
          });
        })
      );

      // 2. Update app icon badge if Badging API is supported
      if (typeof payload.unreadConversationCount === 'number') {
        try {
          if ('setAppBadge' in self.navigator && typeof self.navigator.setAppBadge === 'function') {
            if (payload.unreadConversationCount > 0) {
              tasks.push(self.navigator.setAppBadge(payload.unreadConversationCount).catch(() => null));
            } else {
              tasks.push(self.navigator.clearAppBadge().catch(() => null));
            }
          }
        } catch {
          // Badging API unsupported - safely ignore
        }
      }

      await Promise.all(tasks);
    } catch (err) {
      console.error('[Service Worker] Push event handler error:', err);
    }
  };

  event.waitUntil(handlePush());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/inbox';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a PingStack tab is already open, focus and navigate it
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
