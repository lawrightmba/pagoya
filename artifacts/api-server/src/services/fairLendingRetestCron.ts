/**
 * Fair-Lending Retest Cron (Sprint 2b Addendum 3)
 *
 * Daily-only checks for the two automatic retest_due_at triggers that must
 * NOT run on the per-request gate-check path (to avoid adding latency/writes
 * to every scoring call):
 *   1. expireOutdatedMappingVersionSignoffs — cleans up stale-version rows.
 *   2. checkScoredPopulationVolumeGrowth — compares current scored
 *      population against the active signoff's baseline (no-ops while
 *      volume_growth_trigger_pct is unconfigured).
 *
 * Manual retests (forceRetest) are NOT scheduled here — they are always
 * available as a direct function call, independent of this cron.
 */

import { logger } from "../lib/logger.js";
import { expireOutdatedMappingVersionSignoffs, checkScoredPopulationVolumeGrowth } from "./fairLendingAdjustment.js";

export async function runFairLendingRetestSweep(): Promise<void> {
  logger.info("fairLendingRetestCron: daily sweep starting");
  try {
    const expiredCount = await expireOutdatedMappingVersionSignoffs();
    const volumeCheck = await checkScoredPopulationVolumeGrowth();
    logger.info({ expiredCount, volumeCheck }, "fairLendingRetestCron: daily sweep complete");
  } catch (err) {
    logger.error({ err }, "fairLendingRetestCron: daily sweep failed");
  }
}

// ── Daily at 4 AM Mexico City (10:00 UTC) — after the 3 AM monthly PTI batch window ──
export function startFairLendingRetestCron(): void {
  const scheduleNext = () => {
    const now = new Date();
    const next = new Date();
    next.setUTCHours(10, 0, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    const delayMs = next.getTime() - now.getTime();
    logger.info({ nextInMs: delayMs }, "fairLendingRetestCron: scheduled");
    setTimeout(async () => {
      await runFairLendingRetestSweep();
      scheduleNext();
    }, delayMs);
  };
  scheduleNext();
  logger.info("fairLendingRetestCron: registered (daily 4 AM MX)");
}
