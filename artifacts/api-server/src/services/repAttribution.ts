import { eq, and } from "drizzle-orm";
import { db, repsTable } from "@workspace/db";
import { logger } from "../lib/logger.js";

export interface RepAttribution {
  /** Value to store in users.signup_ref_code (raw code preserved even when invalid). */
  refCode: string;
  /** Value to store in users.signup_source. */
  source: string;
  /** True when the code resolved to an ACTIVE rep. */
  valid: boolean;
}

/**
 * Resolve a raw referral code into attribution fields at user creation.
 *
 * Rules (WS1 — attribution must never be silently defaulted):
 * - No code / "WEB"            → organic source, refCode "WEB".
 * - Code matches an ACTIVE rep → source "rep_referral", refCode = rep's code.
 * - Code present but unknown, or rep is inactive → log ERROR and STORE THE
 *   RAW CODE in signup_ref_code for manual review; source stays organic.
 */
export async function resolveRepAttribution(
  rawCode: string | undefined | null,
  organicSource: "web_organic" | "whatsapp_organic",
  context: string,
): Promise<RepAttribution> {
  const code = rawCode?.trim().toUpperCase() ?? "";
  if (!code || code === "WEB") {
    return { refCode: "WEB", source: organicSource, valid: false };
  }
  try {
    const [rep] = await db
      .select({ repCode: repsTable.repCode })
      .from(repsTable)
      .where(and(eq(repsTable.repCode, code), eq(repsTable.status, "active")))
      .limit(1);
    if (rep?.repCode) {
      return { refCode: rep.repCode, source: "rep_referral", valid: true };
    }
    logger.error(
      { refCode: code, context },
      "repAttribution: referral code present but unknown or inactive — storing raw code for manual review, tagging organic",
    );
    return { refCode: code, source: organicSource, valid: false };
  } catch (err) {
    logger.error({ err, refCode: code, context }, "repAttribution: rep lookup failed — storing raw code, tagging organic");
    return { refCode: code, source: organicSource, valid: false };
  }
}
