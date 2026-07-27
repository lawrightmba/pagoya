/**
 * testUtils.ts — shared test polling utilities
 *
 * Replaces fixed-delay tick() / setTimeout() waits with deterministic DB
 * polling. Each helper retries a condition every `intervalMs` (default 50 ms)
 * up to `timeoutMs` (default 2 000 ms), then throws if the condition was
 * never satisfied.
 *
 * Why polling instead of fixed sleeps:
 *   Fixed sleeps are fragile under CPU load: 80 ms may be enough on a quiet
 *   machine but not when the test runner is busy. Polling waits only as long
 *   as needed and fails loudly with a descriptive message instead of producing
 *   a flaky pass/fail depending on machine speed.
 *
 * Note on "no-change" assertions: when a test expects that a side effect did
 * NOT happen (e.g., wallet balance stays zero), polling for absence would always
 * wait the full timeout before the assertion can run — that is slow and unhelpful.
 * Use a short `settleMs()` call instead for those cases.
 */

import { db, walletsTable, walletTransactionsTable, repCommissionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// ─── GENERIC CONDITION POLLER ─────────────────────────────────────────────────

/**
 * Polls `check()` every `intervalMs` until it returns true or `timeoutMs`
 * elapses. Throws a descriptive error on timeout.
 */
export async function waitForCondition(
  check: () => Promise<boolean>,
  {
    intervalMs = 50,
    timeoutMs = 2_000,
    label = "condition",
  }: { intervalMs?: number; timeoutMs?: number; label?: string } = {},
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise<void>((r) => setTimeout(r, intervalMs));
  }
  throw new Error(
    `waitForCondition: timed out after ${timeoutMs} ms waiting for: ${label}`,
  );
}

// ─── DOMAIN-SPECIFIC HELPERS ─────────────────────────────────────────────────

/**
 * Polls until the wallet identified by `walletId` has a balance greater than
 * or equal to `expectedMinBalance`. Useful after webhook/route handlers that
 * credit wallets asynchronously.
 */
export async function waitForWalletBalance(
  walletId: string,
  expectedMinBalance: number,
  opts?: { timeoutMs?: number },
): Promise<void> {
  await waitForCondition(
    async () => {
      const [w] = await db
        .select({ b: walletsTable.balanceMxn })
        .from(walletsTable)
        .where(eq(walletsTable.id, walletId))
        .limit(1);
      return parseFloat(w?.b ?? "0") >= expectedMinBalance;
    },
    {
      label: `wallet ${walletId} balance >= ${expectedMinBalance}`,
      ...(opts ?? {}),
    },
  );
}

/**
 * Polls until the wallet_transaction identified by `conektaOrderId` has the
 * expected `status`. Useful after webhook handlers that update tx status
 * asynchronously.
 */
export async function waitForTxStatus(
  conektaOrderId: string,
  expectedStatus: string,
  opts?: { timeoutMs?: number },
): Promise<void> {
  await waitForCondition(
    async () => {
      const [tx] = await db
        .select({ status: walletTransactionsTable.status })
        .from(walletTransactionsTable)
        .where(eq(walletTransactionsTable.conektaOrderId, conektaOrderId))
        .limit(1);
      return tx?.status === expectedStatus;
    },
    {
      label: `tx ${conektaOrderId} status = ${expectedStatus}`,
      ...(opts ?? {}),
    },
  );
}

/**
 * Polls until at least one rep_commissions row exists for `repId`. Useful
 * after card top-up or bill-pay routes that write commissions asynchronously.
 */
export async function waitForCommission(
  repId: string,
  opts?: { timeoutMs?: number },
): Promise<void> {
  await waitForCondition(
    async () => {
      const rows = await db
        .select({ id: repCommissionsTable.id })
        .from(repCommissionsTable)
        .where(eq(repCommissionsTable.repId, repId))
        .limit(1);
      return rows.length > 0;
    },
    { label: `commission for rep ${repId}`, ...(opts ?? {}) },
  );
}

/**
 * Short fixed settle for "no-change" assertions — cases where we expect a side
 * effect did NOT happen and polling for absence would always wait the full
 * timeout. 150 ms is generous enough to catch most async writes while keeping
 * the suite fast.
 */
export async function settleMs(ms = 150): Promise<void> {
  await new Promise<void>((r) => setTimeout(r, ms));
}
