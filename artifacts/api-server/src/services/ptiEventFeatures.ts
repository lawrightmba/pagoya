/**
 * ptiEventFeatures.ts
 *
 * PTI Signal Expansion Prompt 2, Stage 2, Part C: event-detection features.
 *
 * Unlike ptiDerivedFeatures.ts (continuous transforms over a series), this
 * module detects discrete EVENTS — a scarcity moment, a bill-shock payment —
 * from raw bill_payments / user_billers / reconstructed-balance inputs, then
 * summarizes them into the zero-weight scalar fields that actually land on
 * PTIDataSnapshot (see pti.ts + ptiDerivedFeatures.ts DERIVED_FEATURE_DEFAULTS).
 *
 * Scarcity events (needs user_billers — null-safe, see Part B in
 * ptiDerivedFeatures.ts for why user_billers is empty for every real user
 * today):
 *   A scarcity event occurs when, at a predicted due-date, the reconstructed
 *   balance is less than the sum of ALL obligations (across every biller)
 *   predicted to come due within the next 7 days. When that happens, we
 *   look at the bill_payments rows that follow in that 7-day window and
 *   record which at-risk biller actually got paid first — this is a raw
 *   signal about payment-priority ordering under scarcity, not a score.
 *   `sequencingStability` summarizes it: across all scarcity events with an
 *   observed "paid first" biller, the fraction that agree with the
 *   single most-frequently-chosen biller. This requires >=2 such events to
 *   be meaningful (a lone event can't show "stability" of anything); fewer
 *   -> null, matching the null-for-zero-billers convention in Part B.
 *
 * Bill-shock events (needs bill_payments only — real data exists today):
 *   A bill-shock event is a bill_payments row (status NOT IN
 *   ('fallido','solicitud_manual')) whose `monto` is >= 1.5x that
 *   service_id's trailing-6-payment median `monto` (computed from the
 *   service_id's own history, excluding fallido/solicitud_manual rows so a
 *   run of failed high-amount retries can't distort the baseline).
 *
 *   The classification of "how did the user respond" is genuinely
 *   underspecified by the raw schema — bill_payments has no partial-payment
 *   concept (every non-excluded row IS a completed payment for its full
 *   `monto`), so a shock EVENT is, by construction, already a successful
 *   payment. What varies interestingly is (a) which channel absorbed it
 *   (`channel`: wallet_balance | card_direct — did the spike come out of
 *   savings or get pushed to a card?), and (b) whether the user completed
 *   the payment at all when facing that abnormal amount, which requires
 *   looking at the WIDER candidate set of attempts (including
 *   fallido/solicitud_manual rows, which still carry an attempted `monto`)
 *   that would also have crossed the 1.5x threshold. This module implements
 *   both interpretations explicitly rather than picking one silently —
 *   `billShockWalletResponseRate` covers (a), `shockPaidFullRate` covers (b).
 */

import { toComparableTimestamp } from "./walletBalanceReconstruction.js";
import type { UserBillerInput } from "./ptiDerivedFeatures.js";

const EXCLUDED_STATUSES = new Set(["fallido", "solicitud_manual"]);
const SHOCK_MULTIPLIER = 1.5;
const TRAILING_MEDIAN_WINDOW = 6;

export interface BillPaymentInput {
  serviceId: string;
  monto: number;
  status: string;
  channel: string | null; // "wallet_balance" | "card_direct" | null (pre-channel-field rows)
  createdAt: Date; // naive timestamp, per bill_payments.created_at — run through toComparableTimestamp
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function orderedMs(payment: BillPaymentInput): number {
  return toComparableTimestamp(payment.createdAt).getTime();
}

// ─────────────────────────────────────────────────────────────────────────
// Bill-shock detection
// ─────────────────────────────────────────────────────────────────────────

export interface ShockEvent {
  serviceId: string;
  monto: number;
  baselineMedian: number;
  channel: string | null;
  createdAtMs: number;
}

/**
 * Detects bill-shock EVENTS only among non-excluded (already-paid) rows,
 * per the literal spec definition. The trailing-6 median baseline for each
 * row is computed from that same service_id's non-excluded history strictly
 * before this row (chronological, no look-ahead), so a shock event can
 * never be its own baseline input.
 */
export function detectBillShockEvents(payments: BillPaymentInput[]): ShockEvent[] {
  const byService = new Map<string, BillPaymentInput[]>();
  for (const p of payments) {
    if (!byService.has(p.serviceId)) byService.set(p.serviceId, []);
    byService.get(p.serviceId)!.push(p);
  }

  const events: ShockEvent[] = [];
  for (const [serviceId, rows] of byService) {
    const sorted = [...rows].sort((a, b) => orderedMs(a) - orderedMs(b));
    const cleanHistory: number[] = []; // running non-excluded monto history, chronological

    for (const row of sorted) {
      const isExcluded = EXCLUDED_STATUSES.has(row.status);
      if (!isExcluded) {
        const trailing = cleanHistory.slice(-TRAILING_MEDIAN_WINDOW);
        if (trailing.length >= TRAILING_MEDIAN_WINDOW) {
          const baseline = median(trailing);
          if (baseline > 0 && row.monto >= SHOCK_MULTIPLIER * baseline) {
            events.push({
              serviceId,
              monto: row.monto,
              baselineMedian: baseline,
              channel: row.channel,
              createdAtMs: orderedMs(row),
            });
          }
        }
        cleanHistory.push(row.monto);
      }
    }
  }
  return events.sort((a, b) => a.createdAtMs - b.createdAtMs);
}

/**
 * Fraction of shock-threshold-crossing ATTEMPTS (including fallido /
 * solicitud_manual rows, which still carry an attempted `monto`) that were
 * ultimately paid successfully. This is the "did an abnormally large bill
 * cause the payment to fail" signal — it requires the wider candidate set,
 * not just the successful events detectBillShockEvents returns.
 *
 * Uses the SAME trailing-6-median-of-non-excluded-history baseline as
 * detectBillShockEvents (a failed/manual row never contributes to the
 * baseline itself, only to the candidate-attempt count).
 */
export function computeShockPaidFullRate(payments: BillPaymentInput[]): number {
  const byService = new Map<string, BillPaymentInput[]>();
  for (const p of payments) {
    if (!byService.has(p.serviceId)) byService.set(p.serviceId, []);
    byService.get(p.serviceId)!.push(p);
  }

  let candidates = 0;
  let paidFull = 0;

  for (const rows of byService.values()) {
    const sorted = [...rows].sort((a, b) => orderedMs(a) - orderedMs(b));
    const cleanHistory: number[] = [];

    for (const row of sorted) {
      const isExcluded = EXCLUDED_STATUSES.has(row.status);
      const trailing = cleanHistory.slice(-TRAILING_MEDIAN_WINDOW);
      if (trailing.length >= TRAILING_MEDIAN_WINDOW) {
        const baseline = median(trailing);
        if (baseline > 0 && row.monto >= SHOCK_MULTIPLIER * baseline) {
          candidates += 1;
          if (!isExcluded) paidFull += 1;
        }
      }
      if (!isExcluded) cleanHistory.push(row.monto);
    }
  }

  if (candidates === 0) return 0;
  return paidFull / candidates;
}

/**
 * Among successful shock EVENTS with a known channel, the fraction paid via
 * wallet_balance (as opposed to card_direct) — "did the user absorb the
 * spike out of their own wallet, or reach for a card." Events with a null
 * channel (pre-channel-field rows) are excluded from both numerator and
 * denominator, not counted as either.
 */
export function computeBillShockWalletResponseRate(events: ShockEvent[]): number {
  const withChannel = events.filter((e) => e.channel !== null);
  if (withChannel.length === 0) return 0;
  const walletCount = withChannel.filter((e) => e.channel === "wallet_balance").length;
  return walletCount / withChannel.length;
}

// ─────────────────────────────────────────────────────────────────────────
// Scarcity-event detection (needs user_billers — null-safe)
// ─────────────────────────────────────────────────────────────────────────

export interface BalanceLookup {
  /** Returns the reconstructed balance as of the given instant (forward-filled). */
  balanceAsOf(atMs: number): number;
}

export interface ScarcityEvent {
  dueDateMs: number;
  atRiskBillerIds: string[];
  paidFirstBillerId: string | null;
}

function predictedDueDatesInWindow(paymentDay: number, windowStart: Date, windowEnd: Date): Date[] {
  const dueDates: Date[] = [];
  const cursor = new Date(Date.UTC(windowStart.getUTCFullYear(), windowStart.getUTCMonth(), 1));
  while (cursor.getTime() <= windowEnd.getTime()) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const clampedDay = Math.min(paymentDay, lastDayOfMonth);
    const dueDate = new Date(Date.UTC(year, month, clampedDay));
    if (dueDate.getTime() >= windowStart.getTime() && dueDate.getTime() <= windowEnd.getTime()) {
      dueDates.push(dueDate);
    }
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return dueDates;
}

/**
 * Detects scarcity events across the trailing 90 days ending at `asOf`.
 * Returns [] immediately if there are zero billers — there is no forward
 * obligation to compare balance against, and this is "no signal," not
 * "never scarce." (Callers deriving a snapshot-level summary should treat
 * an empty array the same way Part B treats zero billers: null, not 0 — see
 * computeSequencingStability below.)
 */
export function detectScarcityEvents(
  billers: UserBillerInput[],
  balanceLookup: BalanceLookup,
  billPayments: BillPaymentInput[],
  asOf: Date,
): ScarcityEvent[] {
  if (billers.length === 0) return [];

  const windowStart = new Date(asOf.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Every (dueDate, biller) occurrence across the whole population, needed
  // to compute "obligations due in the next 7 days" from any given due date.
  const allOccurrences: { billerId: string; dueDate: Date; typicalAmount: number }[] = [];
  for (const biller of billers) {
    for (const dueDate of predictedDueDatesInWindow(biller.paymentDay, windowStart, asOf)) {
      allOccurrences.push({ billerId: biller.billerId, dueDate, typicalAmount: biller.typicalAmount });
    }
  }

  const events: ScarcityEvent[] = [];
  for (const occurrence of allOccurrences.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())) {
    const windowEndMs = occurrence.dueDate.getTime() + 7 * 24 * 60 * 60 * 1000;
    const atRisk = allOccurrences.filter(
      (o) => o.dueDate.getTime() >= occurrence.dueDate.getTime() && o.dueDate.getTime() < windowEndMs,
    );
    const totalObligation = atRisk.reduce((acc, o) => acc + o.typicalAmount, 0);
    const balanceBefore = balanceLookup.balanceAsOf(occurrence.dueDate.getTime());

    if (balanceBefore < totalObligation) {
      const atRiskBillerIds = [...new Set(atRisk.map((o) => o.billerId))];
      const candidatePayments = billPayments
        .filter((p) => atRiskBillerIds.includes(p.serviceId))
        .filter((p) => {
          const ms = orderedMs(p);
          return ms >= occurrence.dueDate.getTime() && ms < windowEndMs;
        })
        .sort((a, b) => orderedMs(a) - orderedMs(b));

      events.push({
        dueDateMs: occurrence.dueDate.getTime(),
        atRiskBillerIds,
        paidFirstBillerId: candidatePayments.length > 0 ? candidatePayments[0].serviceId : null,
      });
    }
  }
  return events;
}

/**
 * Fraction of scarcity events (with a known "paid first" biller) that agree
 * with the single most-frequently-chosen biller — a measure of how
 * consistently the user prioritizes the same obligation under scarcity.
 * Requires >=2 events with a known paid-first biller; fewer -> null
 * (insufficient data to call anything "stable" or "unstable"), matching the
 * null-for-insufficient-data convention used throughout Part B.
 */
export function computeSequencingStability(events: ScarcityEvent[]): number | null {
  const withKnownFirst = events.filter((e) => e.paidFirstBillerId !== null);
  if (withKnownFirst.length < 2) return null;

  const counts = new Map<string, number>();
  for (const e of withKnownFirst) {
    counts.set(e.paidFirstBillerId!, (counts.get(e.paidFirstBillerId!) ?? 0) + 1);
  }
  const maxCount = Math.max(...counts.values());
  return maxCount / withKnownFirst.length;
}
