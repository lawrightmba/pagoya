---
name: PWA push notifications
description: Full-stack push notification system — VAPID, service worker, backend service, frontend hook
---

# PWA Push Notifications

## The rule
Push subscriptions are stored per-user (telefono) in `push_subscriptions` table. The `sendPushToUser(telefono, payload)` function is called fire-and-forget after key events.

**Why:** We need per-user targeting so payment confirmations go only to the paying user, not a broadcast.

## How to apply
- VAPID keys in env vars: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` (shared env)
- Backend: `artifacts/api-server/src/services/pushService.ts` — `sendPushToUser`, `broadcastPush`
- Routes: `artifacts/api-server/src/routes/push.ts` — GET `/api/push/vapid-public-key`, POST `/api/push/subscribe`, DELETE `/api/push/unsubscribe`
- Service worker: `artifacts/pagoya/public/sw.js` — handles `push` and `notificationclick` events
- Manifest: `artifacts/pagoya/public/manifest.json` — linked from `index.html` (updated)
- Frontend hook: `artifacts/pagoya/src/hooks/usePushNotifications.ts` — fetches VAPID key, registers SW, subscribes, saves to API
- UI: push opt-in banner in `Home.tsx` wallet section — shows once, dismissible, persisted in localStorage key `push_banner_v1`
- Trigger: after successful bill payment in `billpay.ts` (alongside earnPoints + WhatsApp receipt)

## DB table
`push_subscriptions`: id, telefono, endpoint (UNIQUE with telefono), p256dh, auth, user_agent, created_at
Expired subscriptions (410/404 from web-push) are auto-deleted.
