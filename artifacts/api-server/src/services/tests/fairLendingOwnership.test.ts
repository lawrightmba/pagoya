import { describe, it, expect, afterEach } from "vitest";
import { sql } from "drizzle-orm";
import {
  getCurrentThresholdOwner,
  reassignThresholdOwner,
  getThresholdOwnerHistory,
  verifyThresholdOwnerAuthorization,
} from "../fairLendingOwnership.js";

// Extracted 2026-07-10 from fairLendingAdjustment.test.ts as part of PTI v5.0
// Phase B4 (retirement of the ±5/±2 fair-lending adjustment layer per
// docs/fair-lending/phase3-implementation-spec.md §3.2). fairLendingOwnership.ts
// itself was NOT retired — it is a generic threshold-owner authorization
// utility not explicitly named for deletion by the spec — so its own test
// coverage is preserved here, independent of the deleted adjustment layer.
describe("fairLendingOwnership — threshold-owner authorization (Addendum 3, live DB)", () => {
  afterEach(async () => {
    const { db } = await import("@workspace/db");
    await db.execute(sql`DELETE FROM fair_lending_threshold_owner_log WHERE assigned_by LIKE 'test-harness-owner%'`);
  });

  it("getCurrentThresholdOwner returns the seeded owner by default", async () => {
    const owner = await getCurrentThresholdOwner();
    console.log("[ownership] current owner:", owner);
    expect(owner.ownerName).toBeTruthy();
  });

  it("verifyThresholdOwnerAuthorization throws when actingIdentity does not match the current owner", async () => {
    const owner = await getCurrentThresholdOwner();
    await expect(
      verifyThresholdOwnerAuthorization(`definitely-not-${owner.ownerName}`),
    ).rejects.toThrow();
  });

  it("verifyThresholdOwnerAuthorization resolves when actingIdentity matches the current owner", async () => {
    const owner = await getCurrentThresholdOwner();
    await expect(verifyThresholdOwnerAuthorization(owner.ownerName)).resolves.not.toThrow();
  });

  it("reassignThresholdOwner REJECTS an empty newOwner or empty reason", async () => {
    await expect(
      reassignThresholdOwner({ newOwner: "", effectiveDate: new Date(), reason: "valid reason", assignedBy: "test-harness-owner" }),
    ).rejects.toThrow();
    await expect(
      reassignThresholdOwner({ newOwner: "New Owner", effectiveDate: new Date(), reason: "", assignedBy: "test-harness-owner" }),
    ).rejects.toThrow();
  });

  it("reassignThresholdOwner appends a new owner and subsequent authorization checks use it", async () => {
    const before = await getCurrentThresholdOwner();
    await reassignThresholdOwner({
      newOwner: "test-harness-owner-new",
      effectiveDate: new Date(),
      reason: "test-harness reassignment for automated coverage",
      assignedBy: "test-harness-owner",
    });
    const after = await getCurrentThresholdOwner();
    console.log("[ownership] before:", before, "after:", after);
    expect(after.ownerName).toBe("test-harness-owner-new");

    await expect(verifyThresholdOwnerAuthorization(before.ownerName)).rejects.toThrow();
    await expect(verifyThresholdOwnerAuthorization("test-harness-owner-new")).resolves.not.toThrow();

    const history = await getThresholdOwnerHistory();
    console.log("[ownership] history length after reassignment:", history.length);
    expect(history.length).toBeGreaterThanOrEqual(2);

    // Restore original owner so other tests / prod state aren't left mutated.
    await reassignThresholdOwner({
      newOwner: before.ownerName,
      effectiveDate: new Date(),
      reason: "test-harness restoring original owner after automated coverage",
      assignedBy: "test-harness-owner",
    });
  });
});
