import { afterEach } from "vitest";
import {
  db,
  billPaymentsTable,
  billPaymentAuditTable,
  repCommissionsTable,
  usersTable,
  walletTransactionsTable,
  walletsTable,
  taecelProductCacheTable,
} from "@workspace/db";
import { inArray } from "drizzle-orm";

// ─── KNOWN TEST FIXTURE IDENTIFIERS ──────────────────────────────────────────
// Each identifier is OWNED by exactly one test file. Do NOT reuse these in new
// test files — add a new unique identifier and note the owner here instead.
//
// Why not per-test transaction rollback: route handlers share a module-level
// db singleton. Injecting a per-test transaction-scoped handle would require
// intercepting all module imports at test time — a larger refactor deferred to
// a future sprint.
//
// Owner: src/billpay/tests/billpay.test.ts
const BILLPAY_PHONES = ["3221234567", "523221234567"];
// Owner: src/wallet/tests/card-topup.test.ts
const CARDTOPUP_PHONES = ["+52000000cardtest01", "+52000000000099"];
// Owner: src/wallet/tests/card-webhook.test.ts
const CARDWEBHOOK_PHONES = ["+52000000cardwhtest01"];
// Owner: src/services/tests/derivedSignals.test.ts
const DERIVED_PHONES = ["quarantest01", "0000000000"];
// Owner: src/services/tests/ptiSnapshotIntegration.test.ts
const PTI_PHONES = ["stage2testA", "stage2testB"];
// Owner: src/services/tests/missions.test.ts
const MISSIONS_PHONES = ["missionstest1", "missionstest2"];

const ALL_FIXTURE_PHONES = [
  ...BILLPAY_PHONES,
  ...CARDTOPUP_PHONES,
  ...CARDWEBHOOK_PHONES,
  ...DERIVED_PHONES,
  ...PTI_PHONES,
  ...MISSIONS_PHONES,
];

// ─── GLOBAL TEARDOWN ─────────────────────────────────────────────────────────
// Targeted teardown: delete ONLY rows belonging to known test-fixture phone
// numbers. This is safe to run even if file-level parallelism is re-enabled
// later, because it never touches rows owned by other test files or by
// production data. The deletion order satisfies FK constraints.
//
// With fileParallelism: false (see vitest.config.ts), this afterEach runs
// serially between every it() across the entire suite — one file at a time.
afterEach(async () => {
  // ── wallet_transactions ── (child of wallets; must go first)
  const fixtureWallets = await db
    .select({ id: walletsTable.id })
    .from(walletsTable)
    .where(inArray(walletsTable.userId, ALL_FIXTURE_PHONES));
  const fixtureWalletIds = fixtureWallets.map((w) => w.id);

  if (fixtureWalletIds.length > 0) {
    await db
      .delete(walletTransactionsTable)
      .where(inArray(walletTransactionsTable.walletId, fixtureWalletIds));
  }

  // ── wallets ──
  await db.delete(walletsTable).where(inArray(walletsTable.userId, ALL_FIXTURE_PHONES));

  // ── rep_commissions + bill_payment_audit ── (children of bill_payments)
  const fixturePayments = await db
    .select({ id: billPaymentsTable.id })
    .from(billPaymentsTable)
    .where(inArray(billPaymentsTable.telefono, ALL_FIXTURE_PHONES));
  const fixturePaymentIds = fixturePayments.map((p) => p.id);

  if (fixturePaymentIds.length > 0) {
    await db
      .delete(billPaymentAuditTable)
      .where(inArray(billPaymentAuditTable.paymentId, fixturePaymentIds));
    await db
      .delete(repCommissionsTable)
      .where(inArray(repCommissionsTable.billPaymentId, fixturePaymentIds));
  }

  // ── bill_payments ──
  await db
    .delete(billPaymentsTable)
    .where(inArray(billPaymentsTable.telefono, ALL_FIXTURE_PHONES));

  // ── users ──
  await db.delete(usersTable).where(inArray(usersTable.telefono, ALL_FIXTURE_PHONES));

  // ── taecel_product_cache ── no user FK; safe to wipe fully
  await db.delete(taecelProductCacheTable);
});
