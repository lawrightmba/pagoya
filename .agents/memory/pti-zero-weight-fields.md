---
name: PTI zero-weight field integration pattern
description: How to add new derived/event features to the PTI snapshot pipeline without changing any scoring behavior — used for "compute and expose but don't score yet" work.
---

## Pattern

When a feature is computed (e.g. a new derived-feature or event-detection function) but is not yet meant to affect the PTI score, wire it through as a "zero-weight" field:

1. Add the field to the relevant type (`DerivedFeatureSet` / `PTIDataSnapshot`) and give it a default in `DERIVED_FEATURE_DEFAULTS`.
2. In `pti.ts`, destructure the field from the snapshot alongside the existing ones, but only reference it in a no-op/void statement (mirrors the existing pattern used for prior "not yet scored" fields) — this proves the field flows through the real snapshot builder without silently being dropped, while guaranteeing it contributes 0 to `derivedSignals.ts` weights.
3. In every CLI script that constructs a full snapshot by hand (`ptiStressTest.ts`, `ptiAblationStudy.ts`, `fairLendingClampStressTest.ts`), add the same field destructuring/pass-through even if the synthetic population generator (`syntheticPopulation.ts`) never actually sets it — it will simply fall back to the default. Confirm via grep that the generator doesn't set the field before assuming the default path is exercised.
4. `pti.test.ts`'s schema-completeness test does not need manual edits for new fields — it verifies against `DERIVED_FEATURE_DEFAULTS`, so extending the defaults object automatically extends the schema check without duplicating test logic.

**Why:** This lets you land the compute logic and its full unit-test coverage in one change, then flip a single weight/consumption change later in `derivedSignals.ts` to activate scoring — with no snapshot-plumbing risk at activation time. It also keeps a clean audit trail: any diff touching `derivedSignals.ts` unambiguously means a scoring behavior change, since feature-plumbing changes never need to touch it.

**How to apply:** Any time asked to add a new PTI feature "for later scoring" or under an explicit no-weight-change guardrail. Verify success by re-running `ptiStressTest.ts`, `ptiAblationStudy.ts`, and `fairLendingClampStressTest.ts` standalone — score distributions, disparate-impact figures, and clamp behavior should be bit-for-bit identical to the pre-change baseline.
