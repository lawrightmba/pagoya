const CACHE_NAME = 'pagoya-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: 'PagoYa', body: event.data?.text() ?? '' };
  }

  const title = data.title || 'PagoYa';
  const options = {
    body: data.body || '',
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/', telefono: data.telefono || '' },
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  const telefono = event.notification.data?.telefono || '';

  // Log push_opened event for PTI behavioral scoring (fire-and-forget)
  if (telefono) {
    const basePath = self.location.pathname.replace(/\/sw\.js$/, '');
    event.waitUntil(
      fetch(`${basePath}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono, event_type: 'push_opened', metadata: { url } }),
      }).catch(() => {})
    );
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
