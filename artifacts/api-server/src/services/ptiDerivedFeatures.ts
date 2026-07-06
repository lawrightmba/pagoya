/**
 * ptiDerivedFeatures.ts
 *
 * PTI Signal Expansion v4.2 -> v4.3, Prompt 1.
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
 */

export interface DerivedFeatureSet {
  paymentTimingMeanDaysFromDue: number;      // mean days-from-due, winsorized to +/-20
  paymentTimingVarianceDaysFromDue: number;  // sample variance of the same winsorized series
  activityVelocity30d: number;               // generic first-derivative (avg delta) of a 30d activity series
  interEventRegularityScore: number;         // 0-1, regularity of inter-event spacing (1 = perfectly regular)
}

// Zero-weight defaults — every site that builds a PTIDataSnapshot should
// spread this in so the new optional fields are always present, without
// having to know their intended eventual scoring semantics.
export const DERIVED_FEATURE_DEFAULTS: DerivedFeatureSet = {
  paymentTimingMeanDaysFromDue: 0,
  paymentTimingVarianceDaysFromDue: 0,
  activityVelocity30d: 0,
  interEventRegularityScore: 0,
};

const WINSOR_BOUND_DAYS = 20;

function winsorize(value: number, bound: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(-bound, Math.min(bound, value));
}

// ─────────────────────────────────────────────────────────────────────────
// Part A: payment-timing features
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
