import { useState, useEffect, useCallback } from "react";

interface PushState {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  loading: boolean;
  error: string | null;
}

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/push/vapid-public-key`);
    if (!res.ok) return null;
    const data = (await res.json()) as { publicKey?: string };
    return data.publicKey ?? null;
  } catch {
    return null;
  }
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
}

async function saveSubscription(telefono: string, subscription: PushSubscription): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telefono,
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function usePushNotifications(telefono: string | null) {
  const [state, setState] = useState<PushState>({
    supported: typeof window !== "undefined" && "PushManager" in window && "serviceWorker" in navigator,
    permission: typeof Notification !== "undefined" ? Notification.permission : "unsupported",
    subscribed: false,
    loading: false,
    error: null,
  });

  // Check existing subscription on mount
  useEffect(() => {
    if (!state.supported || !telefono) return;

    navigator.serviceWorker.getRegistration("/sw.js").then((reg) => {
      if (!reg) return;
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) {
          setState((s) => ({ ...s, subscribed: true }));
        }
      });
    });
  }, [state.supported, telefono]);

  const subscribe = useCallback(async () => {
    if (!state.supported || !telefono) return;

    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      setState((s) => ({ ...s, permission }));

      if (permission !== "granted") {
        setState((s) => ({ ...s, loading: false, error: "Permiso de notificaciones denegado." }));
        return;
      }

      // Get VAPID key
      const vapidKey = await getVapidPublicKey();
      if (!vapidKey) {
        setState((s) => ({ ...s, loading: false, error: "Notificaciones no disponibles en este momento." }));
        return;
      }

      // Register SW
      const reg = await registerServiceWorker();
      if (!reg) {
        setState((s) => ({ ...s, loading: false, error: "Error al registrar el service worker." }));
        return;
      }

      // Subscribe to push
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
      });

      // Save to server
      const saved = await saveSubscription(telefono, subscription);
      if (!saved) {
        setState((s) => ({ ...s, loading: false, error: "Error al guardar la suscripción." }));
        return;
      }

      setState((s) => ({ ...s, loading: false, subscribed: true }));
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: String(err) }));
    }
  }, [state.supported, telefono]);

  const unsubscribe = useCallback(async () => {
    if (!telefono) return;
    setState((s) => ({ ...s, loading: true }));

    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await fetch(`${API_BASE}/api/push/unsubscribe`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telefono, endpoint: sub.endpoint }),
          });
        }
      }
      setState((s) => ({ ...s, loading: false, subscribed: false }));
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: String(err) }));
    }
  }, [telefono]);

  return { ...state, subscribe, unsubscribe };
}
