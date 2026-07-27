/**
 * Backtesting Scaffold — Task #7 Part D
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SCAFFOLDING ONLY — interfaces and stub functions.
 *
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠  NO IMPLEMENTATION IN THIS FILE                                      ║
 * ║                                                                           ║
 * ║  Every stub intentionally throws "SCAFFOLDING: not implemented".         ║
 * ║  Do NOT add real backtesting logic here without a dedicated sprint that:  ║
 * ║    1. Defines the lending-partner data contract with legal sign-off.      ║
 * ║    2. Establishes a point-in-time feature store with no leakage guards.   ║
 * ║    3. Agrees fairness slice definitions with a domain expert.             ║
 * ║    4. Uses ONLY real historical outcomes — no synthetic labels.           ║
 * ║                                                                           ║
 * ║  Fabricating outcome data here would introduce look-ahead bias and        ║
 * ║  produce misleading performance numbers.  Any metric from a stub-based    ║
 * ║  run is meaningless and must never be shown to lending partners.          ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * PURPOSE of this file (as scaffolding):
 *   • Document the intended interface so the implementation sprint can start
 *     with a stable API contract.
 *   • Provide import-safe stubs for type-checking and CI coverage.
 *   • Act as a checklist: every TODO below is a prerequisite for a real run.
 */

// ─── TODO checklist before implementing ───────────────────────────────────────
//
//  [ ] Lending partner provides historical loan-outcome CSV with agreed columns.
//  [ ] Legal reviews PII handling and data-sharing scope.
//  [ ] Point-in-time feature extraction is audited for look-ahead leakage.
//  [ ] Fairness slice definitions are reviewed by a domain expert.
//  [ ] Test harness uses only REAL outcomes — no synthetic labels, no imputed
//      values, no fabricated default/repayment flags.
//  [ ] Performance thresholds (AUC, KS, Gini) are agreed before a first run.
//  [ ] Fairness thresholds (max disparity per slice) are agreed before a first run.
//
// ─────────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — PARTNER DATA CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * One row from a lending partner's outcome dataset.
 * All fields are provisional — the real contract is negotiated per partner.
 *
 * SCAFFOLDING — do not treat these as the definitive schema until a partner
 * data-sharing agreement specifies the actual column set.
 */
export interface PartnerRecord {
  /** Hashed identifier — never the raw phone number. */
  hashedId:          string;
  /** ISO-8601 date when the loan was originated. */
  originationDate:   string;
  /** Loan amount in MXN. */
  principalMxn:      number;
  /** True if the loan was repaid on schedule; false if it defaulted. */
  repaidOnSchedule:  boolean;
  /** Days past due at the time the outcome was observed, or null if current. */
  daysPastDue:       number | null;
  /** Source partner identifier — used to segment reports by lender. */
  partnerId:         string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — BACKTEST WINDOW
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Time window parameters for a single backtest run.
 * Point-in-time features must be extracted AS OF `featureCutoffDate` to prevent
 * look-ahead bias — no events after the cutoff may inform the feature vector.
 */
export interface BacktestWindow {
  /** Features are computed as-of this date (YYYY-MM-DD). */
  featureCutoffDate:  string;
  /** Outcomes observed from this date forward (YYYY-MM-DD). */
  outcomeStartDate:   string;
  /** Outcomes observed up to and including this date (YYYY-MM-DD). */
  outcomeEndDate:     string;
  /** Human-readable label for this window (e.g. "Q1-2026"). */
  label:              string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — POINT-IN-TIME FEATURE EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The PTI feature vector computed as-of a specific cutoff date.
 * Must contain ONLY information available strictly before featureCutoffDate.
 *
 * SCAFFOLDING — field set is illustrative, not final.
 */
export interface PointInTimeFeatures {
  hashedId:             string;
  featureCutoffDate:    string;
  /** PTI v5 composite score as computed on featureCutoffDate. */
  ptiScore:             number;
  /** PTI tier ("Bronce" | "Plata" | "Oro") as of featureCutoffDate. */
  ptiTier:              string;
  /** Individual dimension breakdown as-of cutoff. */
  breakdown: {
    payment_reliability:    number;
    cashflow_stability:     number;
    engagement_depth:       number;
    behavioral_consistency: number;
  };
  /** Consecutive payment months as-of cutoff. */
  consecutivePaymentMonths: number;
  /** Days since account was created. */
  accountAgeDays:           number;
}

/**
 * Build a PointInTimeFeatures vector for one user as-of the given cutoff date.
 *
 * SCAFFOLDING — implementation not provided.
 *
 * TODO: Query pti_scores and bill_payments rows with `recorded_at < cutoffDate`
 *       only.  Any query that touches rows after the cutoff is a leakage bug.
 */
export async function buildPointInTimeFeatures(
  _hashedId:          string,
  _featureCutoffDate: string,
): Promise<PointInTimeFeatures> {
  throw new Error(
    "SCAFFOLDING: not implemented — see backtestingScaffold.ts TODO checklist",
  );
}

/**
 * Assert that a PointInTimeFeatures row was computed without look-ahead leakage.
 * Should be called on every row before it enters a backtest run.
 *
 * SCAFFOLDING — implementation not provided.
 *
 * TODO: Check that no DB row used in feature computation has a timestamp after
 *       featureCutoffDate.  This requires an audit log attached to the feature
 *       extraction pipeline.
 */
export function assertNoLeakage(
  _features:          PointInTimeFeatures,
  _partnerRecord:     PartnerRecord,
): void {
  throw new Error(
    "SCAFFOLDING: not implemented — see backtestingScaffold.ts TODO checklist",
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — REPORT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * One row in the performance metrics table.
 * Metrics must be computed from REAL outcomes only — no synthetic labels.
 */
export interface PerformanceMetricRow {
  /** BacktestWindow.label this row belongs to. */
  windowLabel:    string;
  /** Number of loans in this window. */
  n:              number;
  /** Area Under the ROC Curve. Range [0, 1]; > 0.7 is a typical baseline. */
  auc:            number;
  /** Kolmogorov-Smirnov statistic. Range [0, 1]. */
  ks:             number;
  /** Gini coefficient derived from AUC: 2 × AUC − 1. */
  gini:           number;
  /** Fraction of loans that defaulted in this window. */
  defaultRate:    number;
  /** Fraction correctly classified at the chosen operating threshold. */
  accuracy:       number;
}

/**
 * One row in the fairness analysis table.
 * Slice is a demographic or behavioral segment (e.g. "gender:F", "state:CDMX").
 *
 * SCAFFOLDING — slice definitions must be agreed with a domain expert and must
 * not introduce discrimination risk under Mexican financial regulation.
 */
export interface FairnessSliceRow {
  windowLabel:    string;
  sliceKey:       string;
  sliceValue:     string;
  n:              number;
  /** Approval rate for this slice at the operating threshold. */
  approvalRate:   number;
  /** Default rate for this slice. */
  defaultRate:    number;
  /**
   * Disparity ratio vs. the overall population.
   * Values < 0.8 or > 1.25 may indicate disparate impact.
   */
  disparityRatio: number;
}

/**
 * Top-level backtest report aggregating all windows and fairness slices.
 */
export interface BacktestReport {
  /** ISO-8601 timestamp when the report was generated. */
  generatedAt:          string;
  /** PTI model version used for all feature extraction. */
  modelVersion:         string;
  /** All backtest windows included in this run. */
  windows:              BacktestWindow[];
  /** Performance metrics per window. */
  performance:          PerformanceMetricRow[];
  /** Fairness analysis per window × slice. */
  fairness:             FairnessSliceRow[];
  /** Free-form notes attached to this run (e.g. data-quality caveats). */
  notes:                string[];
}

/**
 * Build a BacktestReport for a set of partner records and backtest windows.
 *
 * SCAFFOLDING — implementation not provided.
 *
 * TODO (requires dedicated sprint):
 *   1. For each partner record × window: call buildPointInTimeFeatures + assertNoLeakage.
 *   2. Score each feature vector with the PTI model at the cutoff-date model version.
 *   3. Compute AUC / KS / Gini from (score, outcome) pairs — real outcomes only.
 *   4. Segment by fairness slices defined with domain expert.
 *   5. Compute disparity ratios and flag > 0.8 / > 1.25 violations.
 *   6. Return fully populated BacktestReport.
 */
export async function buildBacktestReport(
  _partnerRecords: PartnerRecord[],
  _windows:        BacktestWindow[],
  _modelVersion:   string,
): Promise<BacktestReport> {
  throw new Error(
    "SCAFFOLDING: not implemented — see backtestingScaffold.ts TODO checklist",
  );
}
