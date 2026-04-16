import { afterEach } from "vitest";
import { db, billPaymentsTable, billPaymentAuditTable } from "@workspace/db";

// Wipe bill pay tables between tests to keep assertions clean
afterEach(async () => {
  await db.delete(billPaymentAuditTable);
  await db.delete(billPaymentsTable);
});
