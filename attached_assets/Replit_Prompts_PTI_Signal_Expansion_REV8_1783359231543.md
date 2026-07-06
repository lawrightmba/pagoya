# Replit Agent Prompts — PTI Signal Expansion (v4.2 → v4.3) — REV 8
### Consolidates the fixture inventory into ONE authoritative copy and re-scopes the compiler-safety framing. No code changed yet.

**Why this revision exists:** REV 7 corrected the fixture count (11→9) in a standalone "Prompt 1 correction" section, but Prompt 2's own CONTEXT block still carried an independent, uncorrected copy of the eleven-location list — including `services/fairLendingAdjustment.ts`, which is confirmed by direct grep to never touch `PTIDataSnapshot`. Two copies of the same fact drifted apart, which is the exact failure mode this plan has spent seven revisions trying to design out of the *code*. REV 8 fixes it at the *document* level too: there is now exactly one fixture inventory, referenced everywhere, duplicated nowhere.

**Changes from REV 7:**
1. **Stale duplicate deleted.** Prompt 2's embedded eleven-location CONTEXT list is removed. Prompt 2 now references the single inventory (below) instead of repeating it.
2. **Fixture count re-confirmed at 9 files / ~12 sites**, with `services/fairLendingAdjustment.ts` explicitly and permanently excluded, flagged as a boundary a build agent must not "fix" by adding a reference there.
3. **Compiler-safety framing re-grounded, and it's worse than REV 7 assumed.** Whether `REQUIRED_SNAPSHOT_DEFAULTS` and the ~9 other typed-literal fixture sites are compiler-enforced depends entirely on whether new `PTIDataSnapshot` fields are declared *required* or *optional*. Given Part C's own requirement that `computePTI()` return byte-identical v4.2 scores, and given that no production hydration path (`computePTIForUser()`) appears anywhere in the fixture list, the fields are almost certainly meant to be **optional** — which means TypeScript enforces nothing at ANY of the ten sites, not just the two `as`-cast ones. The realistic starting assumption is now **zero compiler protection, ten silent sites**, not "seven safe, three risky."
4. **Structural fix, not just a stricter test:** rather than ask ten independently-written literals to each remember every new field (the same duplication pattern that caused this exact bug class), Prompt 1 now requires a **single exported defaults constant** that every fixture site spreads/references, so there is one place a new field's default lives, not ten. The schema-completeness test then becomes a genuine backstop against someone bypassing that constant, not the only thing standing between "a field exists" and "a field reaches every fixture."
5. **Schema-completeness test re-scoped:** exact key-set equality (`Object.keys(fixtureObject)` vs. the full declared `PTIDataSnapshot` field list, via `keyof` reflection or an explicit field-name array kept in the same file as the type), asserted identically at all ten sites — not a soft "fails if something's missing," and not dependent on TS optional/required enforcement to catch a miss.

**Execution order: 0 → 0.5 → 1 → 1.5 → 2 → 3 → 4. This is the authoritative document going forward — REV 4 through REV 7's Prompt 1/2 text is superseded by what follows.**

---

## THE SINGLE FIXTURE INVENTORY (referenced by Prompt 1 and Prompt 2 — do not duplicate this list elsewhere)

Confirmed by direct codebase read. 9 files, ~12 construction/assertion sites, that construct or assert on a full `PTIDataSnapshot`:

Runtime/service code:
1. `services/pti.ts` — the type definition itself, plus `computePTI()`
2. `services/licenseeApi.ts:317` — `REQUIRED_SNAPSHOT_DEFAULTS`. Drives runtime behavior: `licenseeApi.ts:344-345` builds every outgoing licensee payload by iterating `Object.keys(REQUIRED_SNAPSHOT_DEFAULTS)`. A field missing here is silently omitted from every licensee payload at runtime — no compiler error, no test failure. Almost certainly the cause of the prior version-bump divergence. Treat as compiler-silent regardless of the type's required/optional status (see finding #3 above).
3. `services/licenseeSandboxFixtures.ts:19` — `zeroDataSnapshot: PTIDataSnapshot` (typed literal)
4. `services/licenseeSandboxFixtures.ts:80` — `... as unknown as PTIDataSnapshot` (cast — bypasses TS regardless of field optionality)
5. `services/syntheticPopulation.ts:185,266,281,292` — `synthFromLatents` / `coldBaseline` / `buildColdStart` / `buildContradictory`, all typed as returning `PTIDataSnapshot`

Dev/analysis scripts:
6. `scripts/ptiAblationStudy.ts:121` — `toSnapshot(): PTIDataSnapshot`
7. `scripts/ptiStressTest.ts:116` — `toSnapshot(): PTIDataSnapshot`
8. `scripts/fairLendingClampStressTest.ts:77` — `... as PTIDataSnapshot` (cast)

Test fixtures (each file has its own `baseSnapshot()` helper — no shared factory today; this plan is about to introduce one):
9. `services/tests/pti.test.ts:10` — `baseSnapshot(): PTIDataSnapshot`
10. `services/tests/licenseeApi.test.ts:11` — `baseSnapshot(): PTIDataSnapshot`
11. `services/tests/fairLendingAdjustment.test.ts:114` — `baseSnapshot(): PTIDataSnapshot`

**Permanently excluded, confirmed by direct grep — do not add to this list under any circumstance:** `services/fairLendingAdjustment.ts` (non-test). It operates exclusively on its own isolated `FairLendingSnapshot` type (containing `colonia`/`declaredIncomeBucket`) and contains zero references to `PTIDataSnapshot`. This is by design — it is the isolation boundary the `licenseeApi.test.ts` guard exists to enforce. **If any future grep or agent pass finds what looks like a `PTIDataSnapshot`-shaped construction inside this specific file, stop and treat it as a regression/violation to report, not a fixture to update.** (Its test counterpart, `fairLendingAdjustment.test.ts`, item 11 above, IS correctly in scope — it has its own separate `baseSnapshot()` helper for its own test needs.)

---

## PROMPT 1 — Stage 1: payment-timing + generic transforms + categoria fix + shared defaults constant (REV 8)

```
CONTEXT: PTI v4.2. computePTI() in pti.ts is pure over PTIDataSnapshot. computePTIForUser() hydrates it. derivedSignals.ts is quarantined — do not touch.

SCHEMA GROUND TRUTH (confirmed):
- bill_payments has NO due_date/paid_at. Timing signal is days_from_due (CONFIRMED BY CODE: schema comment states positive = paid early, negative = paid late; the populating formula in billpay.ts, days_from_due = payment_day − EXTRACT(DAY FROM NOW()), mathematically produces this — no re-verification needed), plus created_at (timestamp WITHOUT time zone).
- KNOWN LIMITATION — month-boundary artifact: that formula has no month-rollover handling. A bill due day 2, paid the 28th, computes as −26 instead of true ~5-day lateness (and the reverse near the other boundary). days_from_due magnitudes beyond roughly ±15 are more likely boundary artifacts than genuine extremes. Add this as an explicit code comment on paymentTimingMeanDays/paymentTimingVarianceDays, and winsorize/clamp days_from_due to a bounded range (e.g. ±20) before computing variance, so a handful of boundary artifacts don't dominate the primary timing signal. Document the clamp bound in-code. Do NOT attempt to fix the underlying populating formula — that's existing v4.2 logic, out of scope here; flag it in your summary as a separate follow-up.
- Canonical bill amount column: monto (numeric, notNull). Written identically by all four insert paths in billpay/routes/billpay.ts (lines 267, 332, 447, 1051) and already used by every v4.2 scoring path. platform_fee_mxn is the fee — never an amount signal. amount_due_mxn is never populated — do not use, no COALESCE onto it. bill_amount is a legacy non-ORM column — ignore entirely. monto is amount TRANSACTED, not amount BILLED — document this distinction on any feature built from it.
- REQUIRED FILTER: every feature aggregating over bill_payments must exclude status IN ('fallido', 'solicitud_manual'). Apply this filter once, at the query/snapshot-builder level — not per-feature.
- v4.2 already has recovery_after_miss in Behavioral Consistency. Do not duplicate it as cureTimeMedianHours or anything similar.

ISOLATION REGEX GROUND TRUTH (confirmed by an actual passing test run — vitest run pti.test.ts licenseeApi.test.ts -t "isolation", 2 files / 6 tests passed on current main):
- pti.ts guard (source-text scan): forbids the substrings colonia and declared_income_bucket/declaredIncomeBucket.
- licenseeApi.ts guard (import/call-site scan): forbids importing/requiring fairLendingAdjustment, the call-sites computeFinalPTI( and computeFairLendingAdjustment(, and references to fair_lending_signoff.
- New field/module names in this task are safe as long as they avoid those specific substrings/call-sites. ptiDerivedFeatures.ts and walletBalanceReconstruction.ts are both confirmed clear.

FIXTURE INVENTORY: use THE SINGLE FIXTURE INVENTORY defined above this prompt in the source document. Do not re-derive or re-copy this list into any other file or prompt — if this prompt is ever excerpted or handed off independently, carry a reference to "the REV 8 single fixture inventory," not a pasted copy, so future edits can't drift the way REV 4 through REV 7 did. Before writing the schema-completeness test (Part C), re-grep the codebase for any additional PTIDataSnapshot construction/assertion sites beyond these 9 files/11 sites — this list is a floor, not a ceiling. Confirm explicitly that services/fairLendingAdjustment.ts (non-test) still shows zero PTIDataSnapshot references before proceeding; if it doesn't, stop and report rather than proceeding.

COMPILER-SAFETY GROUND TRUTH (re-scoped — read carefully, this changes how Part C must be built):
Whether any of the 9 typed-literal/typed-return fixture sites actually force a compile error when a field is added depends on whether new PTIDataSnapshot fields are declared required or optional on the interface. Given that computePTI() must remain byte-identical on v4.2 inputs (Part C step 8) and that no computePTIForUser() production callers appear in this fixture inventory, the new fields in this task MUST be declared OPTIONAL on PTIDataSnapshot. This means: assume ZERO compiler enforcement at all ten construction/assertion sites, including REQUIRED_SNAPSHOT_DEFAULTS and the typed literals — not just the two `as`-cast sites. Do not rely on "TypeScript will catch it" anywhere in this task.

TASK — new module ptiDerivedFeatures.ts:

Part A — Payment-timing distribution features, built against days_from_due, on the filtered row set (status NOT IN ('fallido','solicitud_manual')):
1. paymentTimingMeanDays: mean(days_from_due) over trailing 90 days.
2. paymentTimingVarianceDays: variance(winsorized days_from_due, clamped per the month-boundary note above) over the same window. Primary signal.
3. cureTimeMedianHours is NOT built — duplicates recovery_after_miss at worse granularity. Document this decision.

Part B — Generic temporal-derivative transform layer:
Apply ONLY to existing snapshot inputs that are simple event counts/amounts over time — NOT anything requiring balance reconstruction (Stage 1.5 handles that). Where an input is bill_payments-derived, apply the same status filter as Part A.
4. rolling30dStdDev, rolling60dStdDev, rolling90dStdDev per qualifying input.
5. velocity30d: first difference of consecutive 30-day means.
6. interEventRegularity: normalized entropy of inter-event intervals, minimum 5 events else null. (Expect null for essentially the entire current population given production volumes — expected, not a bug.)
Implement as generic pure functions, unit-tested on synthetic arrays first, then applied per qualifying input.

Part C — Integration at ZERO weight, with a single canonical defaults source:
7. Extend PTIDataSnapshot with new fields from Parts A–B only, ALL declared optional (per the compiler-safety ground truth above).
8. computePTI() must return byte-identical scores for identical v4.2 inputs — add the regression test. computePTI() must treat any missing/undefined new field exactly as its documented default (e.g. null-safe defaults for the new features), so partial adoption never changes v4.2 scoring behavior.
9. Create ONE exported defaults constant — e.g. DERIVED_FEATURE_DEFAULTS — in ptiDerivedFeatures.ts, containing the default value for every new field this task adds. This is the single source of truth for "what does an absent new field default to," so the ten fixture sites don't each independently hardcode their own copy of the same defaults (the exact duplication pattern that caused the REQUIRED_SNAPSHOT_DEFAULTS risk in the first place). Every one of the 9 typed-literal/typed-return fixture sites in the inventory must spread or reference DERIVED_FEATURE_DEFAULTS for the new fields rather than manually listing them. The two `as`-cast sites (licenseeSandboxFixtures.ts:80, fairLendingClampStressTest.ts:77) must also be updated to incorporate it, by hand, with an added code comment flagging that these specific two sites are compiler-invisible casts and must be checked manually on every future snapshot-shape change.
10. Update all 9 files / ~12 sites in the single fixture inventory, in this same PR, to use DERIVED_FEATURE_DEFAULTS.
11. Add a schema-completeness test that does NOT rely on "fails if something's missing" as a vague description — it must assert exact key-set equality: Object.keys() of each of the ten fixture objects (dereferencing to the actual runtime object where the site is a function, e.g. call toSnapshot() with representative inputs and check its output's keys) against the full canonical PTIDataSnapshot field list (derive this list once, e.g. via a keyof-based helper or an explicit exported array kept adjacent to the type definition, and reuse it — don't hand-type the full field list a second time inside the test either). This single test is the actual defense for all ten sites, given the compiler-safety finding above — write it as if TypeScript is providing no help at all, because for optional fields, it isn't. Give REQUIRED_SNAPSHOT_DEFAULTS its own explicitly named assertion within this test (not just bundled anonymously with the other nine), since it's the one site with a demonstrated history of causing a real production divergence.

Part D — Ablation readiness:
12. Extend syntheticPopulation.ts / ptiStressTest.ts / ptiAblationStudy.ts / fairLendingClampStressTest.ts (all four) to generate plausible values for new fields via DERIVED_FEATURE_DEFAULTS where appropriate, including synthetic rows with status='fallido'/'solicitud_manual' specifically to verify the filter excludes them correctly. Report per-feature distributions/correlations against existing flagged proxy variables.

Part E — categoria capture-point fix:
13. Populate categoria from the biller record at all four bill_payments insert paths (billpay.ts lines 267, 332, 447, 1051). No backfill.

GUARDRAILS: no touching derivedSignals.ts, weights, or fair-lending code. Do NOT add or modify anything in services/fairLendingAdjustment.ts (non-test) under any circumstance, even if a grep pass suggests it "should" have a snapshot reference — it should not, by design. All isolation tests pass. All existing tests pass.

DEFINITION OF DONE: v4.2 scores unchanged (proven by test, including the case where all new optional fields are entirely absent from the input); status filter applied once and verified via synthetic fallido/solicitud_manual rows; new fields declared optional; DERIVED_FEATURE_DEFAULTS exists as the single source of truth and all 9 files/~12 sites reference it rather than duplicating default values; the two cast sites updated by hand with a flagging comment; the schema-completeness test asserts exact key-set equality (not a soft check) at all ten construction sites, with REQUIRED_SNAPSHOT_DEFAULTS individually and explicitly asserted; services/fairLendingAdjustment.ts (non-test) confirmed untouched and still zero-references PTIDataSnapshot; cureTimeMedianHours explicitly not built with reasoning documented; categoria populating at all four insert paths; suite green.
```

---

## PROMPT 1.5 — Balance reconstruction helper — unchanged from REV 7

No findings from this round touch wallet_transactions, its type/status vocabulary, or the COALESCE ordering logic. Run REV 7's Prompt 1.5 exactly as specified (`SIGNUP_BONUS` as the sole COALESCE-fallback test, `spei_in` pending→confirmed test, etc.).

---

## PROMPT 2 — Stage 2: cash-flow features + event detection + Paula mechanics (conditional) (REV 8 — fixture list deduplicated, defaults-constant pattern extended)

```
CONTEXT: Stage 1 and 1.5 merged. Same guardrails: no weight changes, no derivedSignals.ts changes, fixture-completeness test (from Prompt 1) stays green.

FIXTURE INVENTORY: use THE SINGLE FIXTURE INVENTORY defined in the REV 8 source document (9 files / ~12 sites). Do NOT re-embed a separate copy of this list in this prompt or in any code comment — reference it. services/fairLendingAdjustment.ts (non-test) remains permanently excluded; if any new feature in this task seems to need something from that file, stop and ask rather than reaching into it.

DEFAULTS PATTERN: any new field this task adds to PTIDataSnapshot must be added to the same DERIVED_FEATURE_DEFAULTS constant introduced in Prompt 1 (extend it, don't create a second constant), and must be declared optional, for the same compiler-safety reasons established in Prompt 1 — assume zero TypeScript enforcement across all fixture sites. Extend Prompt 1's schema-completeness test to cover the new fields; do not write a second, separate completeness test.

CONFIRMED FROM PROMPT 0 / 0.5 (do not re-derive, do not re-litigate):
- message_templates does not exist in production or dev. paula_inbound_log has 0 rows in the last 30 days even though paula_send_queue has 6 outbound attempts. TWO independent blockers — Part D is skipped.
- user_billers has 0 rows in production. Forward-obligation features are buildable but will return null for the entire current population.
- Canonical amount column: monto, notNull, status-filtered (exclude 'fallido','solicitud_manual'), semantically "transacted" not "billed."
- Biller grouping key: service_id (notNull, stable) — prefer over service_name/empresa, display-only fields.

PART LETTERING: Part A = cash-flow micro-structure. Part B = forward-obligation features. Part C = event detection (scarcity + bill-shock) — NO Paula dependency, ALWAYS BUILD. Part D = Paula interaction mechanics — SKIP (both blockers confirmed; do not attempt).

Part A — Cash-flow micro-structure (uses reconstructBalanceSeries from Stage 1.5 — balance-real filtering to {confirmed, completed} and COALESCE(confirmed_at, created_at) ordering are handled INSIDE that helper; do not re-filter or re-order in this stage, and do not re-derive whether analogous pending/failed states exist on wallet_transactions — they do, and Stage 1.5 already accounts for them, including SIGNUP_BONUS):
1. minBalanceBuffer30d: minimum value of the reconstructed balance series over trailing 30 days.
2. daysAtZeroPerMonth: reconstructBalanceSeries returns per-transaction points, not per-calendar-day. Add an explicit forward-fill step: for each calendar day in the trailing 30, take the balance as of the last transaction at or before end-of-day (via toComparableTimestamp() for tz alignment), count days where that value = 0. Implement and unit-test this bucketing step explicitly.
3. drawdownVelocity: for each load, sum all spend-type transactions within 72 hours of that load's timestamp, divide by the load amount, cap at 1.0. Document in-code that this is an attribution convention (balance is commingled), not a traced-dollar claim. Median across loads.
4. loadIntervalEntropy: reuse Stage 1's entropy transform on load events.
5. loadAmountCV: coefficient of variation of load amounts, trailing 90 days.

Part B — Forward-obligation features, anchored to user_billers:
6. preDueStagingIndex: using user_billers.payment_day + typical_amount + the reconstructed balance series, fraction of predicted due-dates in trailing 90 days where balance ≥ typical_amount at least 48h prior. Return null for users with zero saved billers — currently ALL users. Verify this null-case behaves correctly against a real query today.
7. loadToObligationRatio: same null-handling.

Part C — Event-detection features (new module ptiEventFeatures.ts), on the status-filtered bill_payments row set — ALWAYS BUILD:
8. Scarcity event: balance < sum of upcoming user_billers obligations within 7 days. Record which biller (grouped by service_id) got paid first. Feature: sequencingStability (null if < 2 events).
9. Bill-shock event: a bill_payments row (status NOT IN ('fallido','solicitud_manual')) where monto ≥ 1.5× that service_id's trailing-6-payment median of monto. Feature: billShockResponse categorical, plus shockPaidFullRate. Document explicitly: this measures a spike in transacted amount relative to the user's own payment history for that biller — NOT deviation from the true bill face value, since amount_due_mxn is never populated.
Unit-test on synthetic data covering: single bill, same-day bills, zero-balance start, a user with no user_billers rows (the current real-world case for 100% of users), and synthetic fallido/solicitud_manual rows to confirm exclusion from the trailing-6 median.

Part D — SKIP. Do not build. Note in your summary that both blockers were independently confirmed in the Prompt 0 production report.

Part E — Integration: snapshot extension at zero weight via DERIVED_FEATURE_DEFAULTS, all 9 fixture files/~12 sites updated in this PR, all four ablation/stress scripts extended, v4.2 regression test still passing, schema-completeness test extended (not duplicated) to cover the new fields.

DEFINITION OF DONE: every balance-dependent feature uses the Stage 1.5 helper as-is; daysAtZeroPerMonth's calendar-bucketing step implemented and tested; drawdownVelocity's attribution rule documented in-code; bill-shock keyed on service_id with its "transacted not billed" limitation documented in-code; status filter verified via synthetic fallido/solicitud_manual rows; forward-obligation features correctly return null given zero user_billers rows (verified against a real query); Part C always built; Part D skipped with evidence cited; new fields added to the SAME DERIVED_FEATURE_DEFAULTS constant and the SAME schema-completeness test from Prompt 1, not duplicated; services/fairLendingAdjustment.ts confirmed untouched.
```

---

## Prompts 0, 0.5, 3, 4 — unchanged

No findings from this round touch production verification, the amount-column trace, the quarantine tier, or v4.3 rebalancing/signoff. Prompt 4 should be reminded, when it runs, that the schema-completeness test it depends on for its own regression check is the same single test extended across Prompts 1 and 2 — not a new one.

---

## Sequencing notes — final

- **The document-drift bug (stale duplicate fixture list in Prompt 2) is the same species of bug as every code bug this plan has caught**, just one level up: a fact stated in two places will eventually disagree with itself. REV 8's structural fix — one inventory, referenced everywhere, plus one defaults constant in code that all fixtures pull from instead of independently duplicating — closes this pattern at both the document layer and the code layer at once.
- **The compiler-safety re-grounding is the more consequential finding of this round.** If new fields are optional (required by the byte-identical-scores constraint), TypeScript is not protecting any of the ten fixture sites, not just the two casts. The schema-completeness test is not a backstop for edge cases — it is the entire safety mechanism. Build it accordingly: exact key-set equality, explicitly asserted, with REQUIRED_SNAPSHOT_DEFAULTS singled out by name given its history.
- **`services/fairLendingAdjustment.ts` (non-test) is now flagged three separate times across Prompt 1 and Prompt 2** specifically because a build agent grepping for "things that construct PTIDataSnapshot-shaped objects" could plausibly land there and "fix" it by adding a reference — which would be a real isolation-boundary violation, not a false positive to shrug off. Treat any such finding as an incident to report, not a task to complete.
- **Ready for handoff.** Run Prompt 1 as specified above (REV 8 is now the authoritative version — REV 4 through REV 7's Prompt 1/2 bodies are superseded), then Prompt 1.5 per REV 7 unchanged, then Prompt 2 as specified above.
