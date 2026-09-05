// PingStack Web Push Service Worker v2.1
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    let payload = {};
    try {
      payload = event.data.json();
    } catch {
      payload = { title: 'PingStack Notification', body: event.data.text() };
    }

    const title = payload.title || 'New WhatsApp message';
    const options = {
      body: payload.body || 'You received a new message.',
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-192x192.png',
      tag: payload.tag || 'whatsapp-message',
      renotify: true,
      data: {
        url: payload.url || '/inbox',
        contactId: payload.contactId,
        tenantId: payload.tenantId,
        timestamp: payload.timestamp || Date.now(),
      },
    };

    // Update app icon badge if Badging API is supported and unreadConversationCount is present
    if (typeof payload.unreadConversationCount === 'number') {
      try {
        if (payload.unreadConversationCount > 0) {
          if ('setAppBadge' in self.navigator && typeof self.navigator.setAppBadge === 'function') {
            self.navigator.setAppBadge(payload.unreadConversationCount).catch(() => null);
          }
        } else {
          if ('clearAppBadge' in self.navigator && typeof self.navigator.clearAppBadge === 'function') {
            self.navigator.clearAppBadge().catch(() => null);
          }
        }
      } catch {
        // Badging API unsupported - safely ignore
      }
    }

    event.waitUntil(
      self.registration.showNotification(title, options).catch((err) => {
        console.error('[SW] showNotification failed with options:', err);
        // Fallback with minimal options if complex options failed
        return self.registration.showNotification(title, {
          body: payload.body || 'You received a new message.',
          icon: '/icons/icon-192x192.png',
        });
      })
    );
  } catch (err) {
    console.error('[Service Worker] Push event handler error:', err);
  }
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
