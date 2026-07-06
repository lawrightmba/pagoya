# Replit Agent Prompts — PTI Signal Expansion (v4.2 → v4.3)
### Staged build plan · July 2026 · Companion to PTI_Signal_Expansion_Gap_Analysis.md

**Execution order is strict: Prompt 0 → 1 → 2 → 3 → 4. Do not start a stage until the prior stage's Definition of Done is confirmed.**

Decisions encoded in these prompts:
- Biller-category-mix signal is DEFERRED; only the categoria capture-point fix ships this round. No backfill.
- New signals enter the snapshot at Stage 1–2 but carry ZERO scoring weight until Stage 4. Weight changes happen exactly once, in Stage 4, as the v4.3 bump.
- Rebalancing is incremental within the existing four dimensions. No structural dimension changes.
- Sandbox + all licensee defaults move to v4.3 after Stage 4 signoff; opt-in bump pattern retained for any future pinned licensee.

---

## PROMPT 0 — Read-only production verification (run first, change nothing)

```
This is a READ-ONLY verification task. Do not modify any code, schema, or data. Produce a written report only.

PRE-FLIGHT (run all, paste results into the report):
1. SELECT column_name FROM information_schema.columns WHERE table_name = 'message_templates';
2. SELECT COUNT(*), COUNT(*) FILTER (WHERE active = true) FROM message_templates;  -- run against PRODUCTION, not dev
3. SELECT COUNT(*) FROM paula_send_queue WHERE created_at > NOW() - INTERVAL '30 days';
4. SELECT COUNT(*) FROM paula_inbound_log WHERE created_at > NOW() - INTERVAL '30 days';
5. SELECT COUNT(*), COUNT(categoria) FROM bill_payments;  -- confirm categoria population rate in prod
6. SELECT column_name FROM information_schema.columns WHERE table_name IN ('bill_payments','wallet_transactions','paula_send_queue','paula_inbound_log') ORDER BY table_name, ordinal_position;

REPORT REQUIREMENTS:
A. message_templates production status: does the schema exist in prod? How many active templates (expected: 24 if the known fix landed; 0 means the fix is still open)? Is paula_send_queue receiving rows in the last 30 days? This gates all Paula-signal work in Stage 2.
B. Confirm bill_payments.categoria population rate (expected ~0%).
C. Inventory every snapshot fixture location that must be updated when PTIDataSnapshot gains fields. Known locations: REQUIRED_SNAPSHOT_DEFAULTS in licenseeApi.ts, licenseeSandboxFixtures.ts, and all test snapshot fixtures referenced by pti.test.ts and licenseeApi.test.ts. Search the codebase for any additional files that construct or assert on a full PTIDataSnapshot object and list them exhaustively — a missed fixture caused silent scoring divergence in a prior version bump.
D. Confirm the source-scan isolation tests in pti.test.ts and licenseeApi.test.ts are passing on current main, and document exactly which import/field patterns they forbid, so new modules can be named to comply.
E. Confirm which timestamps exist on bill_payments (due date, paid-at) and wallet_transactions (created_at, amount, direction/type, balance-after if present). Flag any field the Stage 1–2 features assume but that does not exist.

Output: a single markdown report. No code changes.
```

**Definition of done:** report delivered; message_templates prod status is a definitive yes/no; fixture inventory is exhaustive; any missing timestamp/field assumptions flagged.

---

## PROMPT 1 — Stage 1: P0 derivative feature layer (zero-weight)

```
CONTEXT: PTI v4.2. computePTI() in pti.ts is a pure function over a PTIDataSnapshot. computePTIForUser(telefono) hydrates the snapshot from Postgres. derivedSignals.ts is the quarantined computed-not-scored tier and must NOT be touched in this task. Source-scan isolation tests in pti.test.ts and licenseeApi.test.ts regex-block forbidden imports into the scorer — all new code must pass them.

PRE-FLIGHT (mandatory before writing any code):
1. SELECT column_name FROM information_schema.columns WHERE table_name = 'bill_payments';
2. SELECT column_name FROM information_schema.columns WHERE table_name = 'wallet_transactions';
3. Read pti.ts fully. List the current PTIDataSnapshot fields and the exact fixture files that construct full snapshots (use the inventory from the Stage 0 report — do not rediscover from scratch, but verify it).
Do not proceed if any field the features below depend on is missing; stop and report instead.

TASK — create a new module ptiDerivedFeatures.ts (name must not collide with derivedSignals.ts and must not trip the isolation regex — verify against the patterns documented in Stage 0):

Part A — Payment-timing distribution features (computed per user from bill_payments):
1. paymentTimingMeanDays: mean of (due_date - paid_at) in days across the trailing 90 days.
2. paymentTimingVarianceDays: variance of the same distribution. Variance is the primary signal; mean is secondary.
3. cureTimeMedianHours: median time from a payment becoming late to it being completed, across all late-then-paid events in trailing 180 days. Null if no late events (null ≠ 0; a user with no misses has no cure time, not a perfect one).
4. preDueStagingIndex: fraction of paid bills in trailing 90 days where the wallet balance covered the bill amount ≥ 48 hours before due date (requires reconstructing balance from wallet_transactions ordered by created_at; if a balance-after column exists per Stage 0, use it instead of reconstructing).

Part B — Generic temporal-derivative transform layer, applied to existing snapshot inputs:
For each numeric time-series-derivable input already in the snapshot (payments per period, logins, wallet loads, Paula interactions):
5. rolling30dStdDev, rolling60dStdDev, rolling90dStdDev
6. velocity30d: first difference of consecutive 30-day means
7. interEventRegularity: normalized entropy of inter-event intervals (0 = perfectly regular, 1 = maximally irregular), minimum 5 events else null.
Implement the transforms as generic pure functions (arrays of timestamped values in, features out) with unit tests on synthetic arrays, then apply them per input. Target on the order of 100+ derived fields total; exact count driven by which inputs qualify.

Part C — Integration at ZERO weight:
8. Extend PTIDataSnapshot with the new fields. The snapshot builder in computePTIForUser populates them.
9. Do NOT change any dimension weights, point allocations, tier thresholds, or the 0–100 / 350–850 mappings. computePTI() must return byte-identical scores for identical v4.2 inputs. Add a regression test asserting this on the existing fixture set.
10. Update EVERY fixture location from the Stage 0 inventory in this same PR: REQUIRED_SNAPSHOT_DEFAULTS in licenseeApi.ts, licenseeSandboxFixtures.ts, and all test snapshots. Missing one caused silent scoring divergence in a prior version bump — treat completeness of fixture updates as a hard acceptance criterion. Add a schema-completeness test that fails if any fixture is missing a snapshot field, so this class of bug is structurally impossible going forward.

Part D — Ablation readiness:
11. Extend syntheticPopulation.ts / ptiStressTest.ts so synthetic profiles generate plausible values for all new fields, and the stress-test harness reports per-feature distributions and correlations against the existing 7–8 flagged proxy variables. Do not run fairness conclusions — just make the harness emit the data.

Part E — categoria capture-point fix (side task, minimal):
12. Locate the write path that inserts into bill_payments and populate categoria going forward from the biller record. Do not backfill historical rows. Do not build any scoring feature on categoria.

GUARDRAILS:
- Do not touch derivedSignals.ts, fair-lending adjustment code, weights, or anything in the quarantine tier.
- Do not modify any data-capture path except the categoria insert (Part E).
- All isolation tests must pass. All existing tests must pass. New fields must be deterministic pure functions of the snapshot inputs.

DEFINITION OF DONE: v4.2 scores unchanged (regression test proves it); new fields present in snapshot, all fixtures, and stress-test harness; fixture-completeness test added; categoria populating on new inserts; full test suite green.
```

---

## PROMPT 2 — Stage 2: P1 cash-flow micro-structure + event detection (+ Paula mechanics if unblocked)

```
CONTEXT: Stage 1 is merged. PTIDataSnapshot now carries derivative features at zero weight. Same guardrails: no weight changes, no derivedSignals.ts changes, all fixtures updated in the same PR, fixture-completeness test must stay green.

PRE-FLIGHT:
1. Re-run the wallet_transactions and bill_payments column checks.
2. Confirm the Stage 0 report's verdict on message_templates production status. If production active-template count is 0 or paula_send_queue has no recent rows, SKIP Part C entirely and note it in the summary — do not build signal math on an empty feed.

Part A — Cash-flow micro-structure (wallet_transactions):
1. minBalanceBuffer30d: minimum reconstructed balance over trailing 30 days.
2. daysAtZeroPerMonth: count of days with end-of-day balance = 0, trailing 30 days.
3. drawdownVelocity: median fraction of each load spent within 72 hours of the load.
4. loadIntervalEntropy: inter-load interval regularity (reuse Stage 1's generic entropy transform).
5. loadAmountCV: coefficient of variation of load amounts, trailing 90 days.
6. loadToObligationRatio: median of (load amount ÷ total bills due in the following 14 days), where upcoming obligations are inferable.

Part B — Event-detection features (new logic, not aggregation — keep in a separate module, e.g. ptiEventFeatures.ts):
7. Scarcity event: point in time where wallet balance < sum of bills due within 7 days. For each event, record which bill was paid first by category/biller. Feature: sequencingStability = consistency of first-paid priority across the user's scarcity events (null if < 2 events).
8. Bill-shock event: a bill ≥ 1.5× that biller's trailing-6-payment median. Feature: billShockResponse categorical {paid_full_ontime, paid_partial, paid_late, unpaid_30d} for the most recent shock, plus shockPaidFullRate across all shocks.
Event detectors must be pure functions over transaction/bill arrays with dedicated unit tests covering edge cases (single bill, same-day bills, zero-balance start).

Part C — Paula interaction mechanics (ONLY if Stage 0 confirmed prod templates active):
9. paulaResponseLatencyMedianMin and paulaResponseLatencyVariance from paula_send_queue → paula_inbound_log message pairing.
10. nudgeIndependenceRatio: self-initiated payments ÷ (self-initiated + nudge-attributed) trailing 90 days, where nudge-attributed = payment within 24h of a relevant outbound nudge. Track 30/60/90 trend.
11. streakRepairRate: fraction of broken streaks re-established within 30 days, all-time.

Part D — Integration: snapshot extension at zero weight, all fixture locations updated, stress-test harness extended for the new fields, v4.2 score-regression test still passing.

DEFINITION OF DONE: same bar as Stage 1 — scores unchanged, fixtures complete, harness extended, suite green, Part C explicitly built or explicitly skipped with reason.
```

---

## PROMPT 3 — Stage 3: P2 quarantine tier (extend derivedSignals.ts only)

```
CONTEXT: This task touches ONLY derivedSignals.ts and its tests. These signals are computed and logged but must NEVER be imported by pti.ts or reachable from computePTI(). The source-scan isolation tests enforce this — they must pass, and you must extend them to cover the new field names.

PRE-FLIGHT: read derivedSignals.ts fully and follow its existing pattern (as used by paymentRailSwitching, kycStaleness, inflowCV) exactly.

ADD three quarantined signals:
1. quincenaAlignmentIndex: fraction of loads + payments occurring within ±2 days of the 15th or last day of month, trailing 90 days.
2. loadChannelFormalityMix: distribution of load amounts by rail type (SPEI / card / cash-network), expressed as fraction via formal banking rails.
3. sessionTimeOfDayConcentration: normalized entropy of session start hours, trailing 30 days, plus lateNightSessionFraction (00:00–05:00 local).

REQUIREMENTS:
- Same computed-logged-never-scored pattern as the existing signals in this file.
- Extend the isolation regex tests so these three field names are explicitly forbidden in pti.ts / licenseeApi.ts.
- Add an export path (CSV or JSON dump function) producing the quarantined-signal corpus per synthetic-population run, formatted for external fair-lending analysis — this corpus is the test set for the fairness re-engagement. No PII: keyed on the HMAC-hashed identifier consistent with the pti_export_safe approach, never raw telefono.

DEFINITION OF DONE: three signals computing in the quarantine tier, isolation tests extended and green, export function producing the fairness-analysis corpus, zero changes outside derivedSignals.ts and tests.
```

---

## PROMPT 4 — Stage 4: v4.3 rebalancing, signoff, licensee version (run only after ablation review)

**Gate: do not run this prompt until (a) the stress-test ablation results from Stages 1–2 have been reviewed by a human, (b) per-feature proxy-correlation output has gone to the fair-lending workstream, and (c) you have decided final weight allocations. The agent does not choose weights — you do, from the ablation data.**

```
CONTEXT: Stages 1–3 merged. All new signals present at zero weight. Ablation and proxy-correlation review is complete. This task graduates approved signals into scoring as PTI v4.3.

INPUTS I WILL PROVIDE IN THIS PROMPT (fill in before running):
- The list of signals approved for scoring, with point allocations per dimension. Constraint: dimension totals remain PR 30 / CF 25 / BC 25 / Biller 20 — rebalancing is within-dimension only.
- Signals that remain at zero weight (present in snapshot, not scored).

TASK:
1. Apply the weight allocations in computePTI(). Version-stamp the formula as v4.3.
2. Update reason-code generation so every newly-weighted signal has a plain-language reason code (consumer Spanish via Paula phrasing conventions, B2B English for the API), consistent with the existing explainability layer.
3. Fair-lending signoff machinery: the existing signoff is version-pinned to v4.2 and does not cover new fields. Create the v4.3 signoff record in the three-state system as PENDING, wire classifyReportOutcome() to the expanded field set, and ensure the fair-lending adjustment layer remains inert pending fresh signoff. v4.3 must not be servable to licensees while signoff is PENDING — enforce in code, not convention.
4. Licensee versioning: register v4.3 in the version registry. Default the sandbox and all new-licensee defaults to v4.3 once signoff flips to approved. Retain bumpLicenseeVersion() opt-in for any pinned licensee. Zero live partners exist, so no migration path is needed — but the version gate must still work.
5. Regression: fixture-completeness test green; v4.2 remains computable and pinned-servable (do not delete v4.2 paths); full suite green.

DEFINITION OF DONE: v4.3 scoring live behind PENDING signoff gate, reason codes complete for all weighted signals, sandbox defaults staged, v4.2 untouched and still servable.
```

---

## Sequencing notes (for you, not the agent)

- **Stage 0 output feeds three places:** the Stage 1 fixture inventory, the Stage 2 Part C go/no-go, and (if message_templates is still broken) a re-scope of the existing bug-sweep brief — the Paula signal family is worthless until that fix is confirmed *in production*.
- **Stage 3 can run in parallel with Stage 2** — different files, no shared surface. Stages 1→2 are sequential (Stage 2 reuses Stage 1's transform functions).
- **The Stage 4 gate is where Dr. Franklin re-enters.** The quarantine corpus export (Stage 3) plus the proxy-correlation harness output (Stages 1–2) is the package to send her — it converts "re-engage on the disparate-impact finding" from an open-ended ask into a scoped review of a specific feature set.
- **Backtest tie-in:** the rail-agnostic feature definitions in Stages 1–2 (timing variance, cure time, load regularity, shock response) are exactly the fields to put in the MFI backtest data-spec. Once Stage 2 merges, the backtest spec can be drafted from the snapshot type definition directly.
