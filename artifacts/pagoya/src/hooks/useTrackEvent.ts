import { useCallback } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getPhone(): string {
  try { return localStorage.getItem("pagoya_telefono") ?? ""; } catch { return ""; }
}

export type EventType =
  | "login"
  | "session_end"
  | "bill_paid"
  | "wallet_loaded"
  | "wallet_checked"
  | "game_played"
  | "recarga_initiated"
  | "feature_viewed"
  | "referral_sent"
  | "push_opened"
  | "streak_completed"
  | "loyalty_checked";

/**
 * Silent behavioral event logger for PagoScore credit building.
 * Never throws — all errors are swallowed silently.
 *
 * Usage:
 *   const track = useTrackEvent();
 *   track("login", { hour: new Date().getHours() });
 */
export function useTrackEvent() {
  return useCallback(async (event_type: EventType, metadata: Record<string, unknown> = {}) => {
    const telefono = getPhone();
    if (!telefono) return;
    try {
      await fetch(`${BASE}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono, event_type, metadata }),
      });
    } catch {
      // intentionally silent — never surface to user
    }
  }, []);
}

/**
 * One-shot tracker for use outside React components (e.g. on page unload).
 */
export function trackEvent(event_type: EventType, metadata: Record<string, unknown> = {}) {
  const telefono = getPhone();
  if (!telefono) return;
  const BASE_URL = (import.meta.env?.BASE_URL ?? "/").replace(/\/$/, "");
  try {
    navigator.sendBeacon(
      `${BASE_URL}/api/events`,
      new Blob([JSON.stringify({ telefono, event_type, metadata })], { type: "application/json" }),
    );
  } catch {
    // silent
  }
}
