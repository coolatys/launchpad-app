self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || 'New Notification';
      const options = {
        body: data.body || 'You have a new update.',
        icon: '/icon.png', // Assuming there's a default icon in public/
        badge: '/icon.png',
        data: data.url || '/',
      };

      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      console.error('Error parsing push data', e);
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const urlToOpen = event.notification.data || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
