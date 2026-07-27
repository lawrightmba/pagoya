import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/billpay/tests/setup.ts"],
    testTimeout: 15000,
    hookTimeout: 15000,
    // ─── FILE-LEVEL PARALLELISM DISABLED ─────────────────────────────────────
    // Root cause of intermittent failures: setup.ts registers a global afterEach
    // that does full-table DELETE (no WHERE) on 7 core tables. When test files
    // run concurrently, File A's afterEach wipe deletes rows File B just seeded
    // but hasn't asserted yet — producing non-deterministic failures in
    // billpay, card-topup, card-webhook, derivedSignals, missions, and
    // ptiSnapshotIntegration.
    //
    // Per-test transaction rollback is the ideal long-term fix but requires
    // injecting a transaction-scoped DB handle into every route-handler module
    // at test time — a larger refactor than is safe here. fileParallelism: false
    // eliminates the race condition. setup.ts teardown is also being scoped to
    // known fixture identifiers (see setup.ts) so parallelism can be revisited
    // later without reintroducing the race.
    fileParallelism: false,
  },
});
