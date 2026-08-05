/**
 * Build 1A — PTI Input Snapshot Persistence
 *
 * Persists the PTIDataSnapshot object that was already produced by
 * buildPTISnapshotFromDb() into pti_score_input_snapshots.
 *
 * CONTRACT:
 * - This function MUST be called fire-and-forget (no await at call site).
 * - Failures are logged and swallowed — they never block the scoring path.
 * - Enabled only when ENABLE_PTI_SNAPSHOT_PERSISTENCE=true.
 * - Only scoring runs created AFTER this build are replayable. Historical
 *   scores have no stored input snapshot and are classified not_replayable.
 *
 * NaN SENTINEL — IMPORTANT FOR REPLAY INTEGRITY:
 * JSON.stringify(NaN) produces "null", which is WRONG for replay because:
 *   - !isNaN(null) === true (null coerces to 0 via Number(null))
 *   - For paulaResponseLatencyMinutes: null ≤ 15 → score 2 instead of 0
 *   - For daysToFirstSpei: null ≤ 7 → score 3 instead of 0
 * To preserve faithful replay, NaN-valid fields are stored as the string
 * sentinel NAN_SENTINEL ("__NaN__") in the JSONB. On replay, callers must
 * call deserializePtiSnapshot() to convert "__NaN__" back to NaN before
 * passing the snapshot to computePTIv5(). This is validated by the
 * build1a.test.ts replay test.
 */

import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";
import type { PTIDataSnapshot } from "../pti.js";

export function isPtiSnapshotPersistenceEnabled(): boolean {
  return process.env.ENABLE_PTI_SNAPSHOT_PERSISTENCE === "true";
}

// ── NaN sentinel ──────────────────────────────────────────────────────────────

/** JSON-serializable sentinel stored in JSONB in place of NaN. */
export const NAN_SENTINEL = "__NaN__";

/**
 * Fields in PTIDataSnapshot that are DOCUMENTED to be NaN when data is
 * unavailable (e.g. user has never paid, never had SPEI, never been late).
 * These are the ONLY fields for which NaN is a valid input to computePTI*.
 * All other required numeric fields must be finite.
 */
export const NAN_VALID_FIELDS: ReadonlySet<string> = new Set([
  "hoursToFirst",
  "daysToFirstSpei",
  "lateRecoveryRatio",
  "paulaResponseLatencyMinutes",
]);

// ── Allow-list field definitions ──────────────────────────────────────────────

/**
 * Required fields: must be present, finite (or NaN for NAN_VALID_FIELDS).
 * If a required non-NaN-valid field is not finite, persistence fails with
 * status='invalid_snapshot'. Scoring is always unaffected.
 */
const REQUIRED_NUMERIC_FIELDS: ReadonlyArray<keyof PTIDataSnapshot> = [
  "streakMonths", "payCount", "domStddev", "dominantDay", "advanceDays", "selfRatio",
  "loginDays30", "hourStd", "scratchPlays", "spinPlays", "missionsDone",
  "loadCount30", "loadDayStd", "paulaInteractions", "confirmed2fa", "declined2fa",
  "pushOpens", "curiosityIndex",
  "billerCount", "utilityRatio", "intentClicks", "deviceScore",
  "currentBalance", "totalLoads", "totalSpend", "amountCV",
  "p2pSendCount", "p2pRecipientCount", "daysOld",
  "oxxoLoadCount", "speiLoadCount", "cardLoadCount",
  "latePaymentCount",
  // NaN-valid: also required, but NaN is acceptable (stored as sentinel)
  "hoursToFirst", "daysToFirstSpei", "lateRecoveryRatio", "paulaResponseLatencyMinutes",
];

const REQUIRED_BOOLEAN_FIELDS: ReadonlyArray<keyof PTIDataSnapshot> = ["kycVerified"];
const REQUIRED_STRING_FIELDS: ReadonlyArray<keyof PTIDataSnapshot> = ["kycTier"];

/**
 * Optional fields (typed as `?` in PTIDataSnapshot). If present, they are
 * included; if undefined, they are omitted. Non-finite values for optional
 * numeric fields cause persistence to fail the same way as required fields.
 */
const OPTIONAL_NUMERIC_FIELDS: ReadonlyArray<keyof PTIDataSnapshot> = [
  "paymentTimingMeanDaysFromDue", "paymentTimingVarianceDaysFromDue",
  "activityVelocity30d", "interEventRegularityScore",
  "minBalanceBuffer30d", "daysAtZeroPerMonth", "drawdownVelocity",
  "loadIntervalEntropy", "loadAmountCV", "preDueStagingIndex",
  "loadToObligationRatio", "sequencingStability",
  "shockPaidFullRate", "billShockWalletResponseRate",
];

/** billShockResponse is an optional string|null enum field. */
const OPTIONAL_STRING_NULL_FIELDS: ReadonlyArray<keyof PTIDataSnapshot> = ["billShockResponse"];

// ── Allow-list serializer ─────────────────────────────────────────────────────

interface SerializeResult {
  status: "ok" | "invalid_snapshot";
  serialized: Record<string, unknown>;
  invalidFields: string[];
}

/**
 * Serialize a PTIDataSnapshot using an explicit allow-list.
 *
 * Rules:
 * - Only permitted fields are copied. Unknown/extra fields are silently dropped
 *   (their field names are logged at warn, never their values).
 * - Required numeric fields must be finite, OR NaN for NAN_VALID_FIELDS (stored
 *   as NAN_SENTINEL). Any other non-finite value → invalid_snapshot.
 * - `false` and `0` are correctly preserved as legitimate values.
 * - `undefined` in optional fields → field omitted.
 * - Infinity/-Infinity → always invalid_snapshot.
 */
export function serializePtiSnapshot(
  snapshot: unknown,
  modelVersion: string,
): SerializeResult {
  const raw = snapshot as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const invalidFields: string[] = [];

  // Check for unexpected fields (log field names only — no values, no PII)
  if (raw && typeof raw === "object") {
    const knownFields = new Set<string>([
      ...REQUIRED_NUMERIC_FIELDS as string[],
      ...REQUIRED_BOOLEAN_FIELDS as string[],
      ...REQUIRED_STRING_FIELDS as string[],
      ...OPTIONAL_NUMERIC_FIELDS as string[],
      ...OPTIONAL_STRING_NULL_FIELDS as string[],
    ]);
    for (const key of Object.keys(raw)) {
      if (!knownFields.has(key)) {
        logger.warn(
          { field: key, modelVersion },
          "[Build1A/ptiSnapshotPersist] Unknown field in PTIDataSnapshot — excluded from snapshot",
        );
      }
    }
  }

  // Required numeric fields
  for (const field of REQUIRED_NUMERIC_FIELDS) {
    const value = raw[field as string];
    const isNanValid = NAN_VALID_FIELDS.has(field as string);

    if (value === undefined || value === null) {
      // Missing required field
      invalidFields.push(`${field as string}:missing`);
      continue;
    }

    const n = value as number;

    if (isNanValid && isNaN(n)) {
      // Documented NaN-sentinel value — store as string to preserve replay fidelity
      out[field as string] = NAN_SENTINEL;
    } else if (!isFinite(n)) {
      // Infinity, -Infinity, or NaN in a non-NaN-valid field
      invalidFields.push(`${field as string}:non_finite`);
    } else {
      out[field as string] = n;
    }
  }

  // Required boolean fields
  for (const field of REQUIRED_BOOLEAN_FIELDS) {
    const value = raw[field as string];
    if (typeof value !== "boolean") {
      invalidFields.push(`${field as string}:not_boolean`);
    } else {
      out[field as string] = value; // preserves false correctly
    }
  }

  // Required string fields
  for (const field of REQUIRED_STRING_FIELDS) {
    const value = raw[field as string];
    if (typeof value !== "string") {
      invalidFields.push(`${field as string}:not_string`);
    } else {
      out[field as string] = value;
    }
  }

  // Optional numeric fields
  for (const field of OPTIONAL_NUMERIC_FIELDS) {
    const value = raw[field as string];
    if (value === undefined) continue; // omit gracefully
    if (value === null) {
      out[field as string] = null; // null is valid for preDueStagingIndex etc.
      continue;
    }
    const n = value as number;
    if (!isFinite(n) && !isNaN(n)) {
      // Infinity/-Infinity not allowed
      invalidFields.push(`${field as string}:non_finite`);
    } else if (isNaN(n)) {
      // NaN in optional fields — store sentinel
      out[field as string] = NAN_SENTINEL;
    } else {
      out[field as string] = n;
    }
  }

  // Optional string|null fields (e.g. billShockResponse enum)
  for (const field of OPTIONAL_STRING_NULL_FIELDS) {
    const value = raw[field as string];
    if (value === undefined) continue;
    if (value === null || typeof value === "string") {
      out[field as string] = value;
    } else {
      invalidFields.push(`${field as string}:unexpected_type`);
    }
  }

  if (invalidFields.length > 0) {
    logger.warn(
      { invalidFields, modelVersion },
      "[Build1A/ptiSnapshotPersist] Invalid/non-finite fields detected — snapshot will not be written as replayable",
    );
    return { status: "invalid_snapshot", serialized: out, invalidFields };
  }

  return { status: "ok", serialized: out, invalidFields: [] };
}

/**
 * Deserialize a stored snapshot JSONB back into a PTIDataSnapshot-compatible
 * object, converting NAN_SENTINEL strings back to NaN.
 *
 * Call this before passing a stored snapshot to computePTIv5() for replay.
 * Without this, NaN-valid fields stored as NAN_SENTINEL would produce wrong
 * scores (e.g. paulaResponseLatencyMinutes = "__NaN__" coerced to 0).
 */
export function deserializePtiSnapshot(
  stored: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...stored };
  for (const key of Object.keys(out)) {
    if (out[key] === NAN_SENTINEL) {
      out[key] = NaN;
    }
  }
  return out;
}

// ── Main persistence function ─────────────────────────────────────────────────

/**
 * Persist a PTIDataSnapshot alongside the score history write.
 *
 * Dispatched fire-and-forget from computePTIv5LiveForUser alongside (not
 * after) the pti_score_history insert. Both operations share capturedAt so
 * the soft link between them is anchored to the same timestamp.
 *
 * Inconsistency directions (documented — no FK by design, pti_score_history
 * schema is frozen):
 *   (a) History row exists but no snapshot row: snapshot dispatch failed after
 *       the history write succeeded, or the flag was disabled. The history row
 *       will be classified 'historical_output_only' by pti_history_replayability.
 *   (b) Snapshot row exists but no matching history row: the history insert
 *       failed (caught and swallowed) after the snapshot was already in flight.
 *       The snapshot will show score_history_recorded_at with no corresponding
 *       history row and be classified 'snapshot_unlinked'.
 * Both directions are detected by the pti_history_replayability view (C2).
 *
 * @param snapshot     The raw PTIDataSnapshot object passed to computePTIv5().
 * @param modelVersion The model_version string from the resulting breakdown.
 * @param telefono     The user's phone number.
 * @param capturedAt   ISO string — same timestamp used for the history insert,
 *                     enabling unambiguous soft-link via (telefono, recorded_at).
 */
export async function persistPtiInputSnapshot(
  snapshot: unknown,
  modelVersion: string,
  telefono: string,
  capturedAt: string,
): Promise<void> {
  if (!isPtiSnapshotPersistenceEnabled()) return;

  try {
    const { status, serialized, invalidFields } = serializePtiSnapshot(snapshot, modelVersion);

    const persistenceStatus = status === "ok" ? "persisted" : "invalid_snapshot";

    if (status !== "ok") {
      // Log field names only — no PII, no field values
      logger.warn(
        { modelVersion, invalidFields, telefono: telefono.slice(-4).padStart(telefono.length, "*") },
        "[Build1A/ptiSnapshotPersist] Snapshot serialization failed — writing invalid_snapshot row, scoring unaffected",
      );
    }

    const { db } = await import("@workspace/db");
    await db.execute(sql`
      INSERT INTO pti_score_input_snapshots
        (telefono, snapshot, model_version, captured_at,
         score_history_recorded_at, score_history_telefono, persistence_status)
      VALUES
        (${telefono}, ${JSON.stringify(serialized)}::jsonb, ${modelVersion},
         ${capturedAt}::timestamptz,
         ${capturedAt}::timestamptz,
         ${telefono},
         ${persistenceStatus})
    `);
  } catch (err) {
    logger.warn(
      { err },
      "[Build1A/ptiSnapshotPersist] Failed to persist snapshot — scoring continues unaffected",
    );
    // Do not rethrow. The scoring path must never be affected by persistence failures.
  }
}
