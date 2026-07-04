/**
 * Fair-Lending Threshold Ownership (Sprint 2b Addendum 3)
 *
 * Tracks WHO is authorized to modify `FAIR_LENDING_THRESHOLDS` or attest a
 * fair-lending signoff. Ownership lives in `fair_lending_threshold_owner_log`
 * (append-only; the most recent row by `effective_since` is the current
 * owner) — never as an in-memory config object, so reassignment survives
 * restarts/deploys and carries a durable audit trail.
 *
 * Reassignment is a deliberate function call (`reassignThresholdOwner`), not
 * a row UPDATE — the table is INSERT-only. This gives a complete history of
 * who held the role and why it changed (e.g. advisor turnover during FI
 * negotiations).
 */

import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

export interface ThresholdOwnerRecord {
  id: number;
  ownerName: string;
  effectiveSince: Date;
  reason: string | null;
  assignedBy: string | null;
  createdAt: Date;
}

/**
 * Returns the current authorized threshold owner — the most recent row by
 * `effective_since`. Throws if no owner has ever been recorded (should never
 * happen once seeded, but fails loudly rather than treating "no owner" as
 * "anyone is authorized").
 */
export async function getCurrentThresholdOwner(): Promise<ThresholdOwnerRecord> {
  const { db } = await import("@workspace/db");
  const row = await db.execute(sql`
    SELECT id, owner_name, effective_since, reason, assigned_by, created_at
    FROM fair_lending_threshold_owner_log
    ORDER BY effective_since DESC, id DESC
    LIMIT 1
  `);
  if (row.rows.length === 0) {
    throw new Error(
      "[fairLendingOwnership] No authorized threshold owner is on file. " +
        "Refusing to treat this as 'anyone is authorized' — seed fair_lending_threshold_owner_log first.",
    );
  }
  const r = row.rows[0] as Record<string, unknown>;
  return {
    id: Number(r.id),
    ownerName: String(r.owner_name),
    effectiveSince: new Date(r.effective_since as string),
    reason: r.reason != null ? String(r.reason) : null,
    assignedBy: r.assigned_by != null ? String(r.assigned_by) : null,
    createdAt: new Date(r.created_at as string),
  };
}

/**
 * Throws unless `actingIdentity` matches the current authorized owner
 * (case-sensitive exact match on owner_name). This is the single
 * enforcement point called by both `recordFairLendingSignoff()` and
 * `updateFairLendingThresholds()` — any function that modifies
 * FAIR_LENDING_THRESHOLDS, or attests against it, must route through here.
 *
 * Fails closed: a missing/blank actingIdentity is always a mismatch, never
 * silently treated as authorized.
 */
export async function verifyThresholdOwnerAuthorization(actingIdentity: string | null | undefined): Promise<ThresholdOwnerRecord> {
  const owner = await getCurrentThresholdOwner();
  const identity = (actingIdentity ?? "").trim();
  if (!identity || identity !== owner.ownerName) {
    logger.warn(
      { actingIdentity: identity || null, currentOwner: owner.ownerName },
      "[fairLendingOwnership] authorization check failed — acting identity does not match current threshold owner",
    );
    throw new Error(
      `[fairLendingOwnership] Refusing to proceed: actingIdentity="${identity || "(missing)"}" does not match ` +
        `the current authorized threshold owner ("${owner.ownerName}"). Use reassignThresholdOwner() if ownership ` +
        `should change, rather than proceeding with someone else's numbers.`,
    );
  }
  return owner;
}

export interface ReassignThresholdOwnerParams {
  newOwner: string;
  effectiveDate?: Date;
  reason: string;
  assignedBy?: string;
}

/**
 * Deliberately reassigns the authorized threshold owner. Always appends a
 * new row — never mutates or deletes prior history. Requires a non-empty
 * new owner name and a non-empty reason string; effectiveDate defaults to
 * now.
 */
export async function reassignThresholdOwner(params: ReassignThresholdOwnerParams): Promise<ThresholdOwnerRecord> {
  const newOwner = params.newOwner?.trim();
  const reason = params.reason?.trim();
  if (!newOwner) {
    throw new Error("[fairLendingOwnership] reassignThresholdOwner requires a non-empty newOwner name.");
  }
  if (!reason) {
    throw new Error("[fairLendingOwnership] reassignThresholdOwner requires a non-empty reason string.");
  }

  const previousOwner = await getCurrentThresholdOwner().catch(() => null);
  const effectiveSince = params.effectiveDate ?? new Date();

  const { db } = await import("@workspace/db");
  const row = await db.execute(sql`
    INSERT INTO fair_lending_threshold_owner_log (owner_name, effective_since, reason, assigned_by)
    VALUES (${newOwner}, ${effectiveSince}, ${reason}, ${params.assignedBy ?? null})
    RETURNING id, owner_name, effective_since, reason, assigned_by, created_at
  `);
  const inserted = row.rows[0] as Record<string, unknown>;

  logger.info(
    { previousOwner: previousOwner?.ownerName ?? null, newOwner, effectiveSince, reason, assignedBy: params.assignedBy ?? null },
    "[fairLendingOwnership] threshold owner reassigned",
  );

  return {
    id: Number(inserted.id),
    ownerName: String(inserted.owner_name),
    effectiveSince: new Date(inserted.effective_since as string),
    reason: inserted.reason != null ? String(inserted.reason) : null,
    assignedBy: inserted.assigned_by != null ? String(inserted.assigned_by) : null,
    createdAt: new Date(inserted.created_at as string),
  };
}

/** Full append-only ownership history, most recent first. */
export async function getThresholdOwnerHistory(): Promise<ThresholdOwnerRecord[]> {
  const { db } = await import("@workspace/db");
  const rows = await db.execute(sql`
    SELECT id, owner_name, effective_since, reason, assigned_by, created_at
    FROM fair_lending_threshold_owner_log
    ORDER BY effective_since DESC, id DESC
  `);
  return rows.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: Number(row.id),
      ownerName: String(row.owner_name),
      effectiveSince: new Date(row.effective_since as string),
      reason: row.reason != null ? String(row.reason) : null,
      assignedBy: row.assigned_by != null ? String(row.assigned_by) : null,
      createdAt: new Date(row.created_at as string),
    };
  });
}
