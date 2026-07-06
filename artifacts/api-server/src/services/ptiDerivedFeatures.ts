/**
 * ptiDerivedFeatures.ts
 *
 * PTI Signal Expansion v4.2 -> v4.3, Prompt 1 (Parts A/B below).
 * PTI Signal Expansion Prompt 2, Stage 2 (Parts C/D below) — cash-flow
 * micro-structure and forward-obligation features.
 *
 * Unlike `derivedSignals.ts` (a fully standalone service, imported by
 * nothing, not part of PTIDataSnapshot at all), the features here ARE added
 * directly onto `PTIDataSnapshot` as optional fields — but wired in at ZERO
 * WEIGHT. `computePTI()` accepts them with null-safe defaults (via
 * `DERIVED_FEATURE_DEFAULTS`) but does not use them in any dimension score
 * yet. This lets the shape land everywhere (fixtures, scripts, tests) ahead
 * of any decision to actually score them — see the byte-identical
 * regression guard in `tests/pti.test.ts`.
 *
 * Part A: payment-timing features — pure functions over arrays of
 *         days-from-due (positive = paid early, negative = paid late),
 *         winsorized to tame outliers before aggregating.
 * Part B: generic temporal-derivative transforms — reusable over ANY
 *         chronologically-ordered numeric series or timestamp list, not
 *         specific to payments. Kept generic so future signal work (logins,
 *         wallet loads, Paula replies, etc.) can reuse them without
 *         duplicating the math.
 * Prompt 2 / Stage 2, Part A: cash-flow micro-structure — built ON TOP of
 *         `reconstructBalanceSeries()` (walletBalanceReconstruction.ts).
 *         Balance-real filtering ({confirmed, completed}) and
 *         COALESCE(confirmed_at, created_at) ordering are handled INSIDE
 *         that helper and are NOT re-derived or re-filtered here.
 *         (Labeled distinctly from Prompt 1's "Part A" above to avoid
 *         collision — this file accumulates section labels per prompt, not
 *         one global A/B/C/D scheme.)
 * Prompt 2 / Stage 2, Part B: forward-obligation features anchored to
 *         `user_billers`. As of July 2026, production has 0 rows in
 *         `user_billers` for the entire user base (confirmed Prompt 0/0.5)
 *         — these functions are fully implemented (not stubs) but return
 *         `null` whenever the caller supplies zero billers, which today is
 *         every real user.
 */

import {
  type WalletTransactionInput,
  type BalancePoint,
  isBalanceRealStatus,
  classifyTransactionDirection,
  resolveOrderingTimestamp,
  toComparableTimestamp,
  OPENING_BALANCE_MXN,
} from "./walletBalanceReconstruction.js";

export interface DerivedFeatureSet {
  paymentTimingMeanDaysFromDue: number;      // mean days-from-due, winsorized to +/-20
  paymentTimingVarianceDaysFromDue: number;  // sample variance of the same winsorized series
  activityVelocity30d: number;               // generic first-derivative (avg delta) of a 30d activity series
  interEventRegularityScore: number;         // 0-1, regularity of inter-event spacing (1 = perfectly regular)

  // Part C (Prompt 2, Stage 2) — cash-flow micro-structure
  minBalanceBuffer30d: number;   // min of the reconstructed balance series, trailing 30 days, MXN
  daysAtZeroPerMonth: number;    // count of calendar days (trailing 30) with forward-filled balance === 0
  drawdownVelocity: number;      // median, across loads, of (spend within 72h of load / load amount), capped at 1.0
  loadIntervalEntropy: number;   // 0-1 regularity (via computeInterEventRegularity) of wallet-load event spacing
  loadAmountCV: number;          // coefficient of variation of load amounts, trailing 90 days

  // Part D (Prompt 2, Stage 2) — forward-obligation, anchored to user_billers.
  // null whenever the caller has zero saved billers (today: every real user).
  preDueStagingIndex: number | null;   // fraction of predicted due-dates (90d) where balance >= typicalAmount >=48h prior
  loadToObligationRatio: number | null; // trailing-90d wallet loads / trailing-90d predicted obligation total

  // Part E (Prompt 2, Stage 2) — event-detection, computed in ptiEventFeatures.ts
  sequencingStability: number | null;      // scarcity-event biller-priority consistency; null if <2 events (incl. 0 billers)
  shockPaidFullRate: number;               // fraction of bill-shock-threshold ATTEMPTS ultimately paid successfully
  billShockWalletResponseRate: number;     // of successful shock events with a known channel, fraction paid via wallet_balance
}

// Zero-weight defaults — every site that builds a PTIDataSnapshot should
// spread this in so the new optional fields are always present, without
// having to know their intended eventual scoring semantics.
export const DERIVED_FEATURE_DEFAULTS: DerivedFeatureSet = {
  paymentTimingMeanDaysFromDue: 0,
  paymentTimingVarianceDaysFromDue: 0,
  activityVelocity30d: 0,
  interEventRegularityScore: 0,
  minBalanceBuffer30d: 0,
  daysAtZeroPerMonth: 0,
  drawdownVelocity: 0,
  loadIntervalEntropy: 0,
  loadAmountCV: 0,
  preDueStagingIndex: null,
  loadToObligationRatio: null,
  sequencingStability: null,
  shockPaidFullRate: 0,
  billShockWalletResponseRate: 0,
};

// 20 days rather than a round 30 (a full month): the bound is meant to cap
// outliers within a single billing cycle, not span one. Most bills here are
// due on a fixed day-of-month, so a payment more than ~20 days early/late is
// already bleeding into the adjacent cycle's own due date — at that point
// it's better modeled as "paid against the wrong month" than as an extreme
// value of the same distribution, so clamping stops short of the 30-day
// month boundary instead of running up to it.
const WINSOR_BOUND_DAYS = 20;

function winsorize(value: number, bound: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(-bound, Math.min(bound, value));
}

// ─────────────────────────────────────────────────────────────────────────
// Part A: payment-timing features
//
// A third candidate signal, `cureTimeMedianHours` (median hours between a
// payment going late and the user curing it), was considered alongside
// `paymentTimingMeanDaysFromDue`/`paymentTimingVarianceDaysFromDue` and
// rejected for this pass: cure-time needs a "late -> paid" event pair per
// payment, which isn't reliably derivable from the days-from-due series
// alone (a late-but-never-cured payment and a payment that cured same-day
// both collapse to similar days-from-due values). Revisit only alongside a
// proper late/cure event log, not by approximating it off this array.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mean days-from-due across a set of payments, winsorized to +/-20 days so
 * a single wildly early/late outlier can't dominate the average.
 * Empty input -> 0 (neutral, matches DERIVED_FEATURE_DEFAULTS).
 */
export function computePaymentTimingMeanDays(daysFromDue: number[]): number {
  if (!daysFromDue || daysFromDue.length === 0) return 0;
  const winsorized = daysFromDue.map((d) => winsorize(d, WINSOR_BOUND_DAYS));
  const sum = winsorized.reduce((acc, d) => acc + d, 0);
  return sum / winsorized.length;
}

/**
 * Sample variance of winsorized days-from-due. Requires >=2 data points to
 * be meaningful; fewer -> 0 (neutral).
 */
export function computePaymentTimingVarianceDays(daysFromDue: number[]): number {
  if (!daysFromDue || daysFromDue.length < 2) return 0;
  const winsorized = daysFromDue.map((d) => winsorize(d, WINSOR_BOUND_DAYS));
  const mean = winsorized.reduce((acc, d) => acc + d, 0) / winsorized.length;
  const sumSq = winsorized.reduce((acc, d) => acc + (d - mean) ** 2, 0);
  return sumSq / (winsorized.length - 1);
}

// ─────────────────────────────────────────────────────────────────────────
// Part B: generic temporal-derivative transforms
// ─────────────────────────────────────────────────────────────────────────

/**
 * Rolling (trailing) standard deviation over a sliding window. Generic over
 * any numeric series ordered chronologically. Returns one value per input
 * element (early elements use whatever partial window is available).
 */
export function rollingStdDev(values: number[], window: number): number[] {
  if (!values || values.length === 0 || window < 2) return [];
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    if (slice.length < 2) {
      out.push(0);
      continue;
    }
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / (slice.length - 1);
    out.push(Math.sqrt(variance));
  }
  return out;
}

/**
 * Generic first-derivative / velocity of a chronologically-ordered numeric
 * series: the average delta between consecutive points. Positive = trending
 * up, negative = trending down, 0 = flat or insufficient data.
 */
export function computeVelocity(values: number[]): number {
  if (!values || values.length < 2) return 0;
  const deltas: number[] = [];
  for (let i = 1; i < values.length; i++) {
    deltas.push(values[i] - values[i - 1]);
  }
  return deltas.reduce((a, b) => a + b, 0) / deltas.length;
}

/**
 * Regularity of spacing between events, given a list of event timestamps
 * (any consistent unit, e.g. ms since epoch). Computed as the inverse of
 * the coefficient of variation of inter-event intervals, bounded to (0, 1]:
 * perfectly evenly-spaced events -> cv=0 -> regularity=1; highly irregular
 * spacing pushes regularity toward 0. Requires >=3 events (>=2 intervals);
 * fewer -> 0 (neutral, insufficient data).
 */
export function computeInterEventRegularity(timestampsMs: number[]): number {
  if (!timestampsMs || timestampsMs.length < 3) return 0;
  const sorted = [...timestampsMs].sort((a, b) => a - b);
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push(sorted[i] - sorted[i - 1]);
  }
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  if (mean === 0) return 0;
  const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
  const cv = Math.sqrt(variance) / mean;
  return 1 / (1 + cv);
}

// ─────────────────────────────────────────────────────────────────────────
// Prompt 2 / Stage 2, Part A: cash-flow micro-structure
//
// All functions below consume either the raw `WalletTransactionInput[]`
// (the same shape `reconstructBalanceSeries()` takes) or its output,
// `BalancePoint[]`. None of them re-implement balance-real filtering or
// COALESCE(confirmed_at, created_at) ordering — both are Stage 1.5's job.
// ─────────────────────────────────────────────────────────────────────────

const LOAD_TYPES = new Set(["load_oxxo", "load_card", "spei_in", "load_banco"]);

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Minimum value of the reconstructed balance series over the trailing 30
 * days ending at `asOf`. Carries the balance forward from before the window
 * (via the last point at or before window start) so a quiet window with no
 * transactions correctly reflects the balance that was actually sitting
 * there the whole time, not a spurious 0.
 */
export function computeMinBalanceBuffer30d(series: BalancePoint[], asOf: Date): number {
  const windowStartMs = asOf.getTime() - 30 * 24 * 60 * 60 * 1000;
  const sorted = [...series].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  let carried = OPENING_BALANCE_MXN;
  for (const point of sorted) {
    if (point.timestamp.getTime() < windowStartMs) carried = point.balance;
  }

  let min = carried;
  for (const point of sorted) {
    const t = point.timestamp.getTime();
    if (t >= windowStartMs && t <= asOf.getTime() && point.balance < min) {
      min = point.balance;
    }
  }
  return min;
}

/**
 * Explicit calendar-day forward-fill bucketing step: `reconstructBalanceSeries`
 * returns one point per transaction, not per calendar day, so this walks
 * each of the trailing 30 calendar days ending at `asOf` and asks "what was
 * the balance as of the end of this day?" (last transaction at or before
 * end-of-day), counting days where that forward-filled value is exactly 0.
 *
 * The end-of-day cutoff is built via `toComparableTimestamp()`: the day is
 * first resolved in UTC calendar terms, then re-anchored through
 * `toComparableTimestamp` so this function's day-boundary convention stays
 * identical to the one bill_payments-derived features must use (naive
 * local-getter timestamp -> UTC), even though wallet_transactions
 * timestamps are already tz-aware. This keeps the two data sources
 * comparable if they are ever merged in one caller.
 */
export function computeDaysAtZeroPerMonth(series: BalancePoint[], asOf: Date): number {
  const sorted = [...series].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  let zeroDays = 0;
  for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
    const dayInstant = new Date(asOf.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    // Build a "naive" end-of-day marker using UTC calendar fields, then run
    // it through toComparableTimestamp so the cutoff is derived the same
    // way a naive bill_payments timestamp would be.
    const naiveEndOfDay = new Date(
      dayInstant.getUTCFullYear(),
      dayInstant.getUTCMonth(),
      dayInstant.getUTCDate(),
      23, 59, 59, 999,
    );
    const cutoffMs = toComparableTimestamp(naiveEndOfDay).getTime();

    let balanceAsOfDay = OPENING_BALANCE_MXN;
    for (const point of sorted) {
      if (point.timestamp.getTime() <= cutoffMs) {
        balanceAsOfDay = point.balance;
      } else {
        break;
      }
    }
    if (balanceAsOfDay === 0) zeroDays++;
  }
  return zeroDays;
}

/**
 * For each wallet-load transaction, sums all debit ("spend-type")
 * transactions that land within 72 hours AFTER that load, divides by the
 * load amount, and caps the ratio at 1.0. Returns the median ratio across
 * all loads (0 if there are none).
 *
 * ATTRIBUTION CONVENTION, NOT A TRACED-DOLLAR CLAIM: wallet balance is
 * commingled — there is no way to prove any specific spend transaction
 * "used" money from any specific load. This is a temporal-proximity
 * heuristic (spend-after-load within a fixed window), not a ledger trace.
 * Treat drawdownVelocity as "how quickly does spend activity follow a
 * load, in aggregate," not "what fraction of THIS load was spent."
 */
export function computeDrawdownVelocity(transactions: WalletTransactionInput[]): number {
  const balanceReal = transactions.filter((t) => isBalanceRealStatus(t.status));
  const loads = balanceReal.filter((t) => LOAD_TYPES.has(t.type));
  const spends = balanceReal.filter((t) => classifyTransactionDirection(t.type) === "debit");

  if (loads.length === 0) return 0;

  const ratios = loads.map((load) => {
    const loadMs = resolveOrderingTimestamp(load).getTime();
    const windowEndMs = loadMs + 72 * 60 * 60 * 1000;
    const spendSum = spends
      .filter((s) => {
        const ms = resolveOrderingTimestamp(s).getTime();
        return ms >= loadMs && ms <= windowEndMs;
      })
      .reduce((acc, s) => acc + s.amountMxn, 0);
    if (load.amountMxn <= 0) return 0;
    return Math.min(1, spendSum / load.amountMxn);
  });

  return median(ratios);
}

/**
 * Reuses `computeInterEventRegularity` (Part B) over the timestamps of
 * wallet-load events specifically (load_oxxo/load_card/spei_in/load_banco,
 * balance-real only) — no separate entropy math, per spec: "reuse Stage 1's
 * entropy transform on load events."
 */
export function computeLoadIntervalEntropy(transactions: WalletTransactionInput[]): number {
  const balanceReal = transactions.filter((t) => isBalanceRealStatus(t.status));
  const loads = balanceReal.filter((t) => LOAD_TYPES.has(t.type));
  const timestamps = loads.map((t) => resolveOrderingTimestamp(t).getTime());
  return computeInterEventRegularity(timestamps);
}

/**
 * Coefficient of variation of wallet-load amounts in the trailing 90 days
 * ending at `asOf`. Requires >=2 loads in-window to be meaningful; fewer ->
 * 0 (neutral, matches DERIVED_FEATURE_DEFAULTS).
 */
export function computeLoadAmountCV(transactions: WalletTransactionInput[], asOf: Date): number {
  const windowStartMs = asOf.getTime() - 90 * 24 * 60 * 60 * 1000;
  const balanceReal = transactions.filter((t) => isBalanceRealStatus(t.status));
  const loads = balanceReal.filter((t) => {
    if (!LOAD_TYPES.has(t.type)) return false;
    const ms = resolveOrderingTimestamp(t).getTime();
    return ms >= windowStartMs && ms <= asOf.getTime();
  });

  if (loads.length < 2) return 0;
  const amounts = loads.map((t) => t.amountMxn);
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  if (mean === 0) return 0;
  const variance = amounts.reduce((a, b) => a + (b - mean) ** 2, 0) / (amounts.length - 1);
  return Math.sqrt(variance) / mean;
}

// ─────────────────────────────────────────────────────────────────────────
// Prompt 2 / Stage 2, Part B: forward-obligation features, anchored to user_billers
//
// As of July 2026, user_billers has 0 rows in production for the entire
// user base (confirmed Prompt 0/0.5) — both functions below are fully
// implemented, real logic, NOT stubs, but return null whenever the caller
// supplies zero billers, which today describes every real user. This is
// the documented, expected behavior, not a placeholder to "come back to."
// ─────────────────────────────────────────────────────────────────────────

export interface UserBillerInput {
  billerId: string;
  paymentDay: number;      // day-of-month, 1-31 (user_billers.payment_day)
  typicalAmount: number;   // user_billers.typical_amount
}

/**
 * All occurrences of `paymentDay` (clamped to each month's actual length)
 * that fall within [windowStart, windowEnd], one Date per occurrence.
 */
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

function balanceAsOf(series: BalancePoint[], asOfMs: number): number {
  const sorted = [...series].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  let balance = OPENING_BALANCE_MXN;
  for (const point of sorted) {
    if (point.timestamp.getTime() <= asOfMs) balance = point.balance;
    else break;
  }
  return balance;
}

/**
 * Fraction of predicted due-dates (trailing 90 days) where the reconstructed
 * balance was >= that biller's typicalAmount at least 48 hours before the
 * predicted due date. Returns null if the user has zero saved billers, or
 * if billers exist but none produce a predicted due-date inside the window
 * (both are "no signal," not "0% staged").
 */
export function computePreDueStagingIndex(
  billers: UserBillerInput[],
  series: BalancePoint[],
  asOf: Date,
): number | null {
  if (billers.length === 0) return null;

  const windowStart = new Date(asOf.getTime() - 90 * 24 * 60 * 60 * 1000);
  let total = 0;
  let staged = 0;

  for (const biller of billers) {
    const dueDates = predictedDueDatesInWindow(biller.paymentDay, windowStart, asOf);
    for (const dueDate of dueDates) {
      const checkpointMs = dueDate.getTime() - 48 * 60 * 60 * 1000;
      const balance = balanceAsOf(series, checkpointMs);
      total += 1;
      if (balance >= biller.typicalAmount) staged += 1;
    }
  }

  if (total === 0) return null;
  return staged / total;
}

/**
 * Ratio of trailing-90d wallet loads (MXN) to trailing-90d predicted
 * obligation total (sum of typicalAmount across every predicted due-date
 * in-window). Returns null if the user has zero saved billers, or if
 * billers exist but produce zero total predicted obligation in-window
 * (division would be meaningless, not "infinite coverage").
 */
export function computeLoadToObligationRatio(
  billers: UserBillerInput[],
  transactions: WalletTransactionInput[],
  asOf: Date,
): number | null {
  if (billers.length === 0) return null;

  const windowStart = new Date(asOf.getTime() - 90 * 24 * 60 * 60 * 1000);
  let totalObligation = 0;
  for (const biller of billers) {
    const dueDates = predictedDueDatesInWindow(biller.paymentDay, windowStart, asOf);
    totalObligation += dueDates.length * biller.typicalAmount;
  }
  if (totalObligation <= 0) return null;

  const balanceReal = transactions.filter((t) => isBalanceRealStatus(t.status));
  const totalLoads90d = balanceReal
    .filter((t) => {
      if (!LOAD_TYPES.has(t.type)) return false;
      const ms = resolveOrderingTimestamp(t).getTime();
      return ms >= windowStart.getTime() && ms <= asOf.getTime();
    })
    .reduce((acc, t) => acc + t.amountMxn, 0);

  return totalLoads90d / totalObligation;
}
