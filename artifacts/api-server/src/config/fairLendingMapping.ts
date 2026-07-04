/**
 * Fair-Lending Adjustment — Placeholder Mapping Config (Sprint 2b)
 *
 * This is a PLACEHOLDER config pending bias/fair-lending sign-off. All values
 * ship at 0 so the full pipeline (flag resolution, gating, logging, delta
 * reporting) can be built and demonstrated end-to-end producing adjustment=0
 * everywhere, without any real point values existing yet.
 *
 * IMPORTANT: this file is intentionally editable without a code deploy in
 * spirit — once real values are approved via bias testing, only the numbers
 * below need to change (plus a recorded row in `fair_lending_signoff` whose
 * `approved_mapping_version` matches the new hash). No changes to the
 * adjustment engine (`fairLendingAdjustment.ts`) or to `computePTI()` itself
 * are required at that point.
 *
 * `computePTI()` (pti.ts) must NEVER import or reference this file, or
 * colonia/declared_income_bucket at all. See the regression guard in
 * `pti.test.ts` ("computePTI never references colonia/declared_income_bucket").
 */

import { createHash } from "node:crypto";

export interface FairLendingMapping {
  version: string;
  colonia_tier_adjustment: Record<string, number>;
  income_bucket_adjustment: Record<string, number>;
}

export const FAIR_LENDING_MAPPING: FairLendingMapping = {
  version: "", // computed below via computeMappingVersionHash()

  colonia_tier_adjustment: {
    tier_1_marginacion_muy_bajo: 0, // TODO: pending bias test
    tier_2_marginacion_bajo: 0,     // TODO: pending bias test
    tier_3_marginacion_medio: 0,    // TODO: pending bias test
    tier_4_marginacion_alto: 0,     // TODO: pending bias test
    tier_5_marginacion_muy_alto: 0, // TODO: pending bias test
    unknown: 0,
  },

  income_bucket_adjustment: {
    bucket_1_lowest: 0,  // TODO: pending bias test
    bucket_2: 0,         // TODO: pending bias test
    bucket_3: 0,         // TODO: pending bias test
    bucket_4: 0,         // TODO: pending bias test
    bucket_5_highest: 0, // TODO: pending bias test
    unknown: 0,
  },
};

/**
 * Deterministic version hash of the mapping table's point VALUES (not the
 * TODO comments — those are TS source comments and never reach this object).
 * Any change to the point values must produce a new hash, which is what
 * `fair_lending_signoff.approved_mapping_version` must match for the
 * adjustment layer to ever activate in production.
 */
export function computeMappingVersionHash(
  mapping: Omit<FairLendingMapping, "version"> = FAIR_LENDING_MAPPING,
): string {
  const canonical = JSON.stringify({
    colonia_tier_adjustment: sortedEntries(mapping.colonia_tier_adjustment),
    income_bucket_adjustment: sortedEntries(mapping.income_bucket_adjustment),
  });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}

function sortedEntries(obj: Record<string, number>): [string, number][] {
  return Object.entries(obj).sort(([a], [b]) => a.localeCompare(b));
}

export const FAIR_LENDING_MAPPING_VERSION = computeMappingVersionHash(FAIR_LENDING_MAPPING);
