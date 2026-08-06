/**
 * Build 2A — Behavioral Entity Resolution (Package 2A-1)
 *
 * Implements stable Behavioral Entity resolution based on
 * (entity_type, native_system, native_id).
 *
 * Guarantees:
 *   - One stable Build 2A entity ID per (entity_type, native_system, native_id) triple.
 *   - Idempotent: resolving the same identity twice returns the same row.
 *   - Human Tony (entity_type='human_user') and autonomous-agent Tony
 *     (entity_type='autonomous_agent') CANNOT collide — different entity_type.
 *   - Display labels (e.g. "Paula", "Tony") are NEVER used as identity keys.
 *   - Native IDs for human_user entities are NEVER exposed unmasked in admin responses.
 *   - Native reference is preserved without duplicating domain data.
 *
 * Approved entity types: human_user, autonomous_agent, financial_instrument, merchant
 *
 * Native system conventions:
 *   - human_user:        native_system='pagoya_core', native_id=internal_user_id (NOT telefono)
 *   - autonomous_agent:  native_system='build1a_agent_system', native_id=agent_slug
 *   - financial_instrument: native_system='pagoya_core', native_id=clabe_or_card_token
 *   - merchant:          native_system='pagoya_core', native_id=merchant_id_or_biller_code
 */

import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";

export type ApprovedEntityType =
  | "human_user"
  | "autonomous_agent"
  | "financial_instrument"
  | "merchant";

export type BehavioralEntity = {
  id: string;
  entity_type: ApprovedEntityType;
  native_system: string;
  native_id: string;
  created_at: string;
};

export type EntityResolutionResult =
  | { resolved: true; entity: BehavioralEntity; was_created: boolean }
  | { resolved: false; refusal_reason: string; detail: string };

const APPROVED_ENTITY_TYPES = new Set<string>([
  "human_user",
  "autonomous_agent",
  "financial_instrument",
  "merchant",
]);

/**
 * Resolve or create a stable Behavioral Entity for the given identity triple.
 *
 * On first call: creates a new row and returns it with was_created=true.
 * On subsequent calls: returns the existing row with was_created=false.
 * No domain data (payment history, PTI score, etc.) is copied into behavioral_entities.
 *
 * @param entityType   - one of the approved entity types
 * @param nativeSystem - identifies which system owns the native_id (e.g. 'pagoya_core')
 * @param nativeId     - the entity's ID in the native system (opaque string; NOT telefono for humans)
 */
export async function resolveOrCreateEntity(
  entityType: string,
  nativeSystem: string,
  nativeId: string,
): Promise<EntityResolutionResult> {
  if (!APPROVED_ENTITY_TYPES.has(entityType)) {
    return {
      resolved: false,
      refusal_reason: "unapproved_entity_type",
      detail: `'${entityType}' is not an approved entity type. ` +
        `Approved: [${[...APPROVED_ENTITY_TYPES].join(", ")}].`,
    };
  }

  if (!nativeSystem || !nativeId) {
    return {
      resolved: false,
      refusal_reason: "missing_identity_fields",
      detail: "Both native_system and native_id are required and must be non-empty.",
    };
  }

  const { db } = await import("@workspace/db");

  // Attempt to find an existing row first (avoid INSERT race on concurrent calls)
  const existing = await db.execute(sql`
    SELECT id, entity_type, native_system, native_id, created_at
    FROM behavioral_entities
    WHERE entity_type  = ${entityType}
      AND native_system = ${nativeSystem}
      AND native_id     = ${nativeId}
    LIMIT 1
  `);

  if (existing.rows.length > 0) {
    const row = existing.rows[0] as BehavioralEntity;
    logger.debug(
      { entityId: row.id, entityType, nativeSystem },
      "[Build2A/behavioralEntityResolution] existing entity resolved",
    );
    return { resolved: true, entity: row, was_created: false };
  }

  // Insert via ON CONFLICT DO NOTHING + re-fetch to handle concurrent inserts safely
  await db.execute(sql`
    INSERT INTO behavioral_entities (entity_type, native_system, native_id)
    VALUES (${entityType}, ${nativeSystem}, ${nativeId})
    ON CONFLICT (entity_type, native_system, native_id) DO NOTHING
  `);

  const fetched = await db.execute(sql`
    SELECT id, entity_type, native_system, native_id, created_at
    FROM behavioral_entities
    WHERE entity_type  = ${entityType}
      AND native_system = ${nativeSystem}
      AND native_id     = ${nativeId}
    LIMIT 1
  `);

  if (fetched.rows.length === 0) {
    // Should be unreachable after INSERT + DO NOTHING
    logger.error(
      { entityType, nativeSystem },
      "[Build2A/behavioralEntityResolution] entity not found after insert — unexpected",
    );
    return {
      resolved: false,
      refusal_reason: "internal_error",
      detail: "Entity could not be retrieved after insert. Check server logs.",
    };
  }

  const newRow = fetched.rows[0] as BehavioralEntity;
  logger.debug(
    { entityId: newRow.id, entityType, nativeSystem },
    "[Build2A/behavioralEntityResolution] new entity created",
  );
  return { resolved: true, entity: newRow, was_created: true };
}

/**
 * Resolve an entity by its stable Build 2A UUID.
 * Returns null if not found. Native ID is included (caller is responsible for masking).
 */
export async function getEntityById(entityId: string): Promise<BehavioralEntity | null> {
  const { db } = await import("@workspace/db");
  const result = await db.execute(sql`
    SELECT id, entity_type, native_system, native_id, created_at
    FROM behavioral_entities
    WHERE id = ${entityId}::uuid
    LIMIT 1
  `);
  return (result.rows[0] as BehavioralEntity | undefined) ?? null;
}

/**
 * Returns a masked representation of native_id for admin responses.
 * Human users: last-4 chars of native_id, padded with asterisks.
 * Non-human entities: native_id is NOT considered PII (agent slug, biller code, etc.)
 * and may be returned as-is.
 */
export function maskNativeId(entityType: string, nativeId: string): string {
  if (entityType === "human_user") {
    const visible = nativeId.slice(-4);
    return `***${visible}`;
  }
  return nativeId;
}

/**
 * Resolve the stable entity for the autonomous Paula agent.
 * Uses agent slug as native_id to guarantee identity stability.
 * Paula's entity cannot collide with a human named Paula.
 */
export async function resolvePaulaEntity(): Promise<EntityResolutionResult> {
  return resolveOrCreateEntity("autonomous_agent", "build1a_agent_system", "paula");
}

/**
 * Resolve the stable entity for the autonomous Tony analytics agent.
 * Uses agent slug 'tony' as native_id.
 * This CANNOT collide with a human user named Tony:
 *   human Tony → entity_type='human_user', native_system='pagoya_core', native_id=<user_id>
 *   agent Tony  → entity_type='autonomous_agent', native_system='build1a_agent_system', native_id='tony'
 */
export async function resolveTonyAgentEntity(): Promise<EntityResolutionResult> {
  return resolveOrCreateEntity("autonomous_agent", "build1a_agent_system", "tony");
}
