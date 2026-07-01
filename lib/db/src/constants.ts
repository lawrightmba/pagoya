/**
 * Shared PagoYa constants — imported by any service that needs them.
 * Single source of truth so scoring and data-capture never quietly diverge.
 */

/**
 * Number of days a bill must be overdue before it is recorded as "missed"
 * in the expected_payments table and counted in PTI binary signals.
 *
 * Must stay in sync with any future PTI v3 binary late-payment signal.
 * If you change this value, also review ptiCron.ts P0/P1 logic.
 */
export const MISSED_THRESHOLD_DAYS = 5;

/**
 * Minimum-N floors for statistical fields written to credit_profiles.
 * Return NULL (not a number) when the user is below these floors.
 * Buyers use data_reliability to weight fields — not data_completeness.
 */
export const MIN_N_PAYMENT_CV     = 8;   // per-service payment_amount_cv
export const MIN_N_BILLER_SLOPE   = 3;   // biller_count_slope_90d snapshots
export const MIN_N_PRIORITY_RANK  = 3;   // multi-bill-day events for priority_rank_json
