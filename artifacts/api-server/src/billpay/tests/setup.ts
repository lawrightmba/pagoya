import { afterEach } from "vitest";
import { db, billPaymentsTable, billPaymentAuditTable, repCommissionsTable, usersTable, walletTransactionsTable, walletsTable } from "@workspace/db";

// Wipe tables between tests to keep assertions clean.
// Order matters: delete children before parents (FK constraints).
afterEach(async () => {
  await db.delete(walletTransactionsTable);
  await db.delete(walletsTable);
  await db.delete(repCommissionsTable);
  await db.delete(billPaymentAuditTable);
  await db.delete(billPaymentsTable);
  await db.delete(usersTable);
});
