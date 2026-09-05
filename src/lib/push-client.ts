// Client-side Web Push helper & platform capability detection

export interface PlatformInfo {
  isIOS: boolean;
  isStandalone: boolean;
  isPushSupported: boolean;
  permission: NotificationPermission;
}

export function getPlatformInfo(): PlatformInfo {
  if (typeof window === 'undefined') {
    return {
      isIOS: false,
      isStandalone: false,
      isPushSupported: false,
      permission: 'default',
    };
  }

  const ua = window.navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

  const isStandalone =
    Boolean((window.navigator as any).standalone) ||
    window.matchMedia('(display-mode: standalone)').matches;

  const isPushSupported =
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const permission: NotificationPermission =
    typeof Notification !== 'undefined' ? Notification.permission : 'default';

  return {
    isIOS,
    isStandalone,
    isPushSupported,
    permission,
  };
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register Service Worker and subscribe to Web Push
 */
export async function subscribeToWebPush(): Promise<{ success: boolean; error?: string }> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      return { success: false, error: 'Web Push is not supported in this browser' };
    }

    // 1. Request notification permission
    const permissionResult = await Notification.requestPermission();
    if (permissionResult !== 'granted') {
      return {
        success: false,
        error: permissionResult === 'denied'
          ? 'Notification permission was denied in browser settings'
          : 'Notification permission was dismissed',
      };
    }

    // 2. Register Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    // 3. Get VAPID public key from backend
    const keyRes = await fetch('/api/notifications/subscribe', { credentials: 'include' });
    if (!keyRes.ok) {
      return { success: false, error: 'Failed to retrieve notification configuration' };
    }
    const { vapidPublicKey } = await keyRes.json();

    if (!vapidPublicKey) {
      return { success: false, error: 'VAPID public key not configured on server' };
    }

    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    // 4. Subscribe with PushManager
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any,
      });
    }

    // 5. Send subscription to PingStack server
    const subRes = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
      }),
    });

    if (!subRes.ok) {
      return { success: false, error: 'Failed to register subscription with workspace' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[WebPush Subscribe Error]:', err);
    return { success: false, error: err?.message || 'Failed to enable notifications' };
  }
}

/**
 * Unsubscribe from Web Push
 */
export async function unsubscribeFromWebPush(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return true;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    await fetch('/api/notifications/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ endpoint }),
    });

    return true;
  } catch (err) {
    console.error('[WebPush Unsubscribe Error]:', err);
    return false;
  }
}
