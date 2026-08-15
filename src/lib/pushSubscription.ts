// Utility for converting base64 string to Uint8Array required by push manager
const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const enablePushSubscription = async (userId: string) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported by your browser.');
  }

  // 1. Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permission not granted for notifications');
  }

  // 2. Register Service Worker
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  // 3. Subscribe to PushManager
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
  if (!vapidKey) {
    throw new Error('VAPID key not found');
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }

  // 4. Send to our backend
  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'subscribe',
      userId,
      subscription: subscription.toJSON(),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to subscribe on server');
  }

  return true;
};

export const disablePushSubscription = async (userId: string) => {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  
  if (subscription) {
    // Send unsubscribe to backend first to remove DB entry
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'unsubscribe',
        userId,
        subscription: { endpoint: subscription.endpoint },
      }),
    });
    
    // Unsubscribe locally
    await subscription.unsubscribe();
  } else {
    // Just tell backend to turn it off even if we don't have a local sub
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'unsubscribe',
        userId,
      }),
    });
  }
  
  return true;
};
