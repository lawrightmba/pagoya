import { useCallback } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getPhone(): string {
  try { return localStorage.getItem("pagoya_telefono") ?? ""; } catch { return ""; }
}

/**
 * Phase 1 PTI (PagoYa Trust Index) event taxonomy.
 * Phase 2 will add: wallet_balance_snapshot | biller_dropped | tier_upgraded | payment_timing_early
 * Phase 3 will add: p2p_sent | p2p_received | referral_activated | rep_milestone
 */
export type EventType =
  // Core engagement
  | "login"
  | "session_end"
  | "feature_viewed"
  | "push_opened"
  // Payment behavior — financial dimension
  | "bill_paid"
  | "failed_payment_attempt"
  | "payment_recovered"
  // Wallet & load
  | "wallet_loaded"
  | "wallet_checked"
  | "recarga_initiated"
  // Social & community
  | "referral_sent"
  | "game_played"
  | "streak_completed"
  | "loyalty_checked"
  // Trajectory signals (Phase 1 additions)
  | "biller_added"
  | "feature_abandoned"
  | "oxxo_to_digital_upgrade";

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
