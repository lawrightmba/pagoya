import webpush from "web-push";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL ?? "mailto:soporte@pagoyamx.com";

  if (!publicKey || !privateKey) {
    logger.warn("pushService: VAPID keys not set — push notifications disabled");
    return;
  }

  webpush.setVapidDetails(email, publicKey, privateKey);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  telefono?: string;  // included in notification data so sw.js can log push_opened events
}

export async function sendPushToUser(telefono: string, payload: PushPayload): Promise<void> {
  ensureConfigured();
  if (!configured) return;

  try {
    const rows = await db.execute(
      sql`SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE telefono = ${telefono}`,
    );

    const subscriptions = rows.rows as Array<{ endpoint: string; p256dh: string; auth: string }>;
    if (subscriptions.length === 0) return;

    const payloadStr = JSON.stringify(payload);

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payloadStr,
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 410 || status === 404) {
            // Subscription expired — remove it
            await db.execute(
              sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`,
            ).catch(() => {});
          } else {
            logger.warn({ err, telefono }, "pushService: failed to send push");
          }
        }
      }),
    );
  } catch (err) {
    logger.error({ err, telefono }, "pushService: sendPushToUser error");
  }
}

export async function broadcastPush(payload: PushPayload): Promise<void> {
  ensureConfigured();
  if (!configured) return;

  try {
    const rows = await db.execute(
      sql`SELECT telefono, endpoint, p256dh, auth FROM push_subscriptions`,
    );

    const subscriptions = rows.rows as Array<{ telefono: string; endpoint: string; p256dh: string; auth: string }>;
    const payloadStr = JSON.stringify(payload);

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payloadStr,
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 410 || status === 404) {
            await db.execute(
              sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`,
            ).catch(() => {});
          }
        }
      }),
    );
  } catch (err) {
    logger.error({ err }, "pushService: broadcastPush error");
  }
}
