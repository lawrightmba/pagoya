---
name: PTI Architecture
description: PagoYa Trust Index — dual-model system, DB schema gotchas, cron schedule, frontend widget location
---

## Two separate models

| Model | File | Storage | Schedule | Purpose |
|---|---|---|---|---|
| PagoScore | `api-server/src/services/pagoScore.ts` | `credit_profiles.pago_score` | Nightly 2AM MX | B2B credit profile, Paula AI context, 4-dim (trajectory/financial/routine/social) |
| PTI Widget | `api-server/src/services/pti.ts` | `users.pti_score + pti_breakdown (jsonb)` | Monthly 1st 3AM MX | User-facing scorecard, **v4.1-behavioral** (Sprint 2, July 2026) |

Both registered in `ptiCron.ts → startPtiCron()` called from `app.ts`.

## DB schema gotchas (critical)

- `bill_payments`: has both `service_id` and `empresa`. Status values: `completed`, `success`, `completed_ok`, `confirmed`.
- `wallet_transactions`: NO `telefono` column. Uses `wallet_id` (UUID) → join to `wallets.id`. `wallets.user_id` = telefono.
- P2P transfers stored as `type='transfer_send'` (sender) / `type='transfer_receive'` (receiver) in `wallet_transactions`.
- `user_mission_progress` (NOT `user_missions`): columns `telefono`, `mission_id`, `completed_at`, `rewarded_at`.
- `pti_behavioral_signals` table: per-computation audit trail + B2B export + model training dataset. Has `computed_at` indexed for time-series queries.

## PTI v4.1-behavioral formula (pti.ts — current)

| Dimension | Max | Components |
|---|---|---|
| Payment Reliability (PR) | 30 | payment_streak(20) + payment_day_consistency(10) |
| Behavioral Consistency (BC) | 20 | session_cadence(5) + game_engagement(5) + wallet_load_rhythm(3) + paula_interaction_depth(4) + push_engagement(3) |
| Engagement Depth (ED) | 25 | biller_diversity(8) + kyc_verified(10) + spend_category_mix(4) + signup_utilization_speed(3) |
| Cash-Flow Stability (CF) | 25 | wallet_balance(8) + load_spend_ratio(4) + payment_amount_volatility(3) + p2p_network_activity(3) + account_age(2) + **bancarization_speed(3)** + **funding_channel_mix(2)** |

### Sprint 2 additions (bancarization_speed, funding_channel_mix)
- `bancarization_speed`: days from `users.created_at` to `users.first_spei_load_at` (≤7d→3, ≤30d→2, ≤90d→1, never/NaN→0). Rewards fast graduation from cash (OXXO) to bank-rail (SPEI) funding.
- `funding_channel_mix`: ratio of (spei_load_count + card_load_count) / total loads (≥0.75→2, ≥0.40→1, else 0, gated to 0 if zero loads). Rewards bank-based over cash-based funding mix.
- CF dimension rebalanced to make room (wallet_balance 10→8, load_spend_ratio 7→4, account_age 5→2 collapsed to 2 tiers ≥30d/≥90d, payment_amount_volatility carved out as its own 3pt sub-component from what was previously folded into load_spend_ratio).
- **colonia and declared_income_bucket are explicitly excluded from PTI scoring** (fair-lending risk) — available only for B2B export views, never as scoring inputs.

### Signal sources
- `payment_day_consistency`: STDDEV of bill_payment DOM over 6 months (≤2→10, ≤5→7, ≤8→4, ≤12→2); needs ≥3 payments
- `session_cadence`: COUNT(DISTINCT DATE) from `user_events` WHERE event_type='login' last 30d
- `game_engagement`: scratch_card_plays + spin_results + missions_done×2 last 30d
- `wallet_load_rhythm`: STDDEV of wallet_transactions confirmed load dates over 90d
- `paula_interaction_depth`: COUNT user_events WHERE event_type='paula_interaction' last 30d + 2FA bonus
- `push_notification_engagement`: COUNT user_events WHERE event_type='push_opened' last 30d
- `biller_diversity`: COUNT(DISTINCT service_id) from bill_payments
- `kyc_verified`: kyc_submitted_at IS NOT NULL; full tier = 10pts, simplified = 7pts
- `spend_category_mix`: utility ratio from empresa ILIKE CFE/agua/gas; +1pt if pago_seguro_click or high_value_intent_click exists
- `signup_utilization_speed`: hours from users.created_at to first bill_payment (<6h=3, <24h=2, <72h=1)
- `wallet_balance`: current balance_mxn from wallets
- `load_spend_ratio`: total loads / total spend last 90d
- `p2p_network_activity`: COUNT(transfer_send) + DISTINCT recipients from description field last 90d
- `account_age`: days since users.created_at

### Legacy flat fields
Still written to breakdown JSONB for backward compat; PTIScoreCard reads `is4Dim` flag.

## Event types logged (user_events table) — with source

| event_type | Logged from | Used in |
|---|---|---|
| login | pagoya frontend | session_cadence (BC) |
| push_opened | sw.js notificationclick | push_engagement (BC); requires `telefono` in push payload data |
| paula_interaction | whatsapp-agent.ts (every reply) | paula_depth (BC); has `query_type` metadata |
| paula_2fa_confirmed | whatsapp-agent.ts (payment SÍ) | paula_depth 2FA bonus (BC) |
| paula_2fa_declined | whatsapp-agent.ts (payment NO) | paula_depth 2FA bonus (BC) |
| p2p_sent | p2p.ts (after transfer_send) | p2p_network_activity (CF) |
| pago_seguro_click | BillPaySelector.tsx crossSell | spend_category_mix intent (ED) |
| high_value_intent_click | BillPaySelector.tsx Gas/Renta/Seguro/Predial | spend_category_mix intent (ED) |

## API endpoints

- `GET /api/pti/score?telefono=xxx` — stored score or `{is_new_user: true}` if null
- `POST /api/pti/compute-now` — telefono in body; no admin token required

## Frontend

- `PTIScoreCard` → `artifacts/pagoya/src/components/PTIScoreCard.tsx` — 4 animated DimCard bars; SVG ring
- `PTIIntroModal` → `artifacts/pagoya/src/components/PTIIntroModal.tsx` — localStorage guard `pagoya_pti_intro_seen`
- Both in `Home.tsx`; `refreshKey` increments on intro dismiss → forces score re-fetch

## Compliance

- `AvisoPrivacidad.tsx`: added "Conductuales" row in data table + PTI in Finalidades primarias (Ley Fintech 2018 reference)
- `Register.tsx`: consent text now explicitly covers WhatsApp messages AND behavioral scoring for Trust Index
- Push notifications: `PushPayload.telefono?` field added → sw.js reads it for push_opened event tracking

## WhatsApp notification (monthly batch only)
Fires for users with ≥1 completed payment. Lowest-dimension improvement tip sent.

## Sprint 2b — isolated fair-lending adjustment layer (July 2026)

`fairLendingAdjustment.ts` is a **separate module from pti.ts**, applied strictly post-hoc. `computePTI()`'s 100pt score never sees colonia/declared_income_bucket — enforced by a source-scan regression test in `pti.test.ts` that fails the build if those field names ever appear in `pti.ts`.

- Adjustment is capped `[-5, +5]`, added on top of the 100pt PTI score via `computeFinalPTI()`, never inside `computePTI()`.
- Hard-gated by a real signoff row in `fair_lending_signoff` (prod DB) matching the current `FAIR_LENDING_MAPPING_VERSION` hash — `resolveAdjustmentFlagState()` won't enable without it, even if `ENABLE_GEO_INCOME_ADJUSTMENT=true`.
- `ALLOW_UNSIGNED_ADJUSTMENT_IN_STAGING` bypass only works when `NODE_ENV !== "production"` — hard-locked off in prod regardless of the env var value (logs an error if misconfigured).
- Every call to `computeFinalPTI()` writes an audit row to `pti_fairlending_adjustment_log` (gate_passed, reason, mapping_version always populated, even when not applied).
- `FAIR_LENDING_MAPPING` in `config/fairLendingMapping.ts` is currently all-zero placeholders pending an actual bias-testing study — do not populate real point values without a corresponding signoff row and bias-test report.

### Sprint 2b addendum — report-driven signoff + boot-blocking check
- `fair_lending_signoff` rows are created ONLY via `recordFairLendingSignoff({ reportResult, attestedBy, mappingVersionAtTestTime })` — it throws if `passesBiasThresholds()` fails (4/5ths ratio < 0.8 OR significant residual effect). No manual/role-based INSERT path exists in app code; `attestedBy` is pure metadata, never part of the gate logic.
- `resolveAdjustmentFlagState()` distinguishes `no_signoff_on_file` (zero rows) from `mapping_version_mismatch` (rows exist, none match current `FAIR_LENDING_MAPPING_VERSION` hash) via `checkSignoffStatus()` — matters because the two failure modes need different remediation (never tested vs. config drifted after signoff).
- `assertProductionSafety()` is async and BLOCKS boot: awaited in `api-server/src/index.ts` before `app.listen`, calls `process.exit(1)` on failure. In production with the flag on, it re-verifies the DB-stored `disparate_impact_report` against `passesBiasThresholds()` at boot time (not just "does a row exist") — a stale/failing stored report fails boot even if a matching-version row exists.

### Sprint 2b addendum 2 — three-state signoff outcome (pass/conditional/fail) + expiry gate
- `passesBiasThresholds()` (binary) is superseded by `classifyReportOutcome(report, thresholds?)` → `"pass" | "conditional" | "fail"`, driven by `FAIR_LENDING_THRESHOLDS` in `config/fairLendingMapping.ts` (editable without deploy, same spirit as the mapping table). `passesBiasThresholds` itself is left in place only because the test suite still exercises it directly — production code no longer calls it.
- Escalation is a compounding table, not independent checks: ratio below `fourFifths_conditional_min` → always `fail`; ratio in the borderline band → `conditional` unless a *severe* residual effect (`residualEffectSeverity >= residual_effect_severity_conditional_max`) pushes it to `fail`; ratio fully passing → `pass` unless a residual effect exists, in which case severity again decides `conditional` vs `fail`. A missing `residualEffectSeverity` defaults to 0 (treated as mild, never auto-fails).
- `recordFairLendingSignoff()` throws on `fail`, and separately throws if outcome is `conditional` but `conditionalAcknowledgment` is missing/blank — forces the attester to explicitly articulate acceptance of a conditional result rather than silently defaulting through it.
- A `conditional` signoff gets a reduced `adjustment_cap_override` (from `conditional_adjustment_cap`) and a shorter `retest_due_at` window (`conditional_retest_interval_days`, default 60d vs `standard_retest_interval_days` default 180d for `pass`). `computeFairLendingAdjustment()` clamps to `|adjustmentCapOverride|` when present, else the global default ±5.
- New gate-failure reason `signoff_expired` fires whenever the matching signoff's `retest_due_at` has passed — checked both at request time (`resolveAdjustmentFlagState()`/`checkSignoffStatus()`) and at boot (`assertProductionSafety()`), and is treated identically to a missing signoff (fails closed), regardless of whether the original status was `pass` or `conditional`.
- Ownership note carried into the config file itself: the numeric cutoffs in `FAIR_LENDING_THRESHOLDS` are a bias-testing-methodology decision, not assumed to be any particular person's call — flag ambiguity back to the compliance/legal owner before treating them as final.

### Sprint 2b addendum 3 — threshold-owner authorization + event-driven retest_due_at
- `fairLendingOwnership.ts` (new file) is the single enforcement point for "who is allowed to touch `FAIR_LENDING_THRESHOLDS` or attest a signoff." Ownership lives in append-only `fair_lending_threshold_owner_log` (most recent row by `effective_since` = current owner), never as an in-memory value — survives restarts, carries full audit history. Seeded with `owner_name='Lloyd Wright'`.
- `verifyThresholdOwnerAuthorization(actingIdentity)` fails closed (missing/blank identity is always a mismatch) and is called from both `recordFairLendingSignoff()` (gates `attestedBy`) and the new `updateFairLendingThresholds(updates, actingIdentity)` (gates threshold mutation itself). `reassignThresholdOwner()` is the only way to change the owner — deliberate append, requires non-empty `newOwner` + `reason`.
- `updateFairLendingThresholds()` mutates the exported `FAIR_LENDING_THRESHOLDS` object via `Object.assign` (same binding, in place) so existing importers see live values without re-import — matches the established pattern of `FAIR_LENDING_MAPPING`/`FAIR_LENDING_THRESHOLDS` being hot-editable without deploy.
- `retest_due_at` is no longer a fixed value chosen once at signoff time — it's recomputed as the EARLIER of a stored `retest_due_at_ceiling` (calendar cap) vs. three trigger events, each pulling it to NOW and logging to `fair_lending_retest_triggers` (audit table, FK to `fair_lending_signoff.id`): `forceRetest(reason, actingIdentity?)` (manual, no ownership gate — "someone wants a fresh look" is always allowed), `expireOutdatedMappingVersionSignoffs()` (stale-mapping-version rows, called at boot inside `assertProductionSafety()` AND from a daily cron — never on the per-request gate path, to avoid adding a write to every scoring call), `checkScoredPopulationVolumeGrowth()` (compares current scored population vs. baseline `scored_population_count_at_signoff`; fully wired but deliberately inert while `FAIR_LENDING_THRESHOLDS.volume_growth_trigger_pct` is `null` — a placeholder pending a real cutoff decision).
- New daily cron `fairLendingRetestCron.ts` (`startFairLendingRetestCron()`, registered in `index.ts` alongside the other cron starts) runs both mapping-version-expiry and volume-growth checks once a day (4 AM MX) — self-contained `setTimeout`-based scheduler matching the existing `ptiCron.ts`/`winbackCron.ts` pattern.
- Gotcha hit while testing: `fair_lending_retest_triggers` has an FK to `fair_lending_signoff.id`, so any test cleanup must `DELETE FROM fair_lending_retest_triggers WHERE signoff_id IN (...)` BEFORE deleting the parent `fair_lending_signoff` rows, or the delete throws a constraint violation. Also: leftover un-cleaned rows from a prior interrupted test run (e.g. one that threw before its `afterEach` ran) can silently make unrelated `resolveAdjustmentFlagState()`-based tests pass/fail incorrectly, since `checkSignoffStatus()` picks the most-recent row for the current mapping version regardless of which test created it — worth a manual DB check if isolated-looking tests suddenly flip.

### Sprint 2b addendum 4 — real threshold values, insufficient_data guardrail, effect-size significance
- `FAIR_LENDING_THRESHOLDS` now has real starting values (`minimum_sample_size_per_group=30`, `residual_effect_significance_p=0.05`, `residual_effect_min_magnitude_d=0.2`, `residual_effect_severity_conditional_max_d=0.5`, `volume_growth_trigger_pct=25`) instead of placeholders — sourced from US EEOC/ECOA convention pending Mexico-specific legal review (documented as a caveat directly in the config file; treat as provisional, not final).
- `classifyReportOutcome()` now checks `groupASampleSize`/`groupBSampleSize` FIRST, before ratio/residual logic — either group below the minimum returns a new `"insufficient_data"` outcome regardless of how good the ratio looks. `DisparateImpactReportResult` renamed `sampleSize`→`groupASampleSize`/`groupBSampleSize` and `residualEffectSeverity`→`residualEffectMagnitudeD` (old field names kept as deprecated/optional for backward compat, but the new logic only reads the new names).
- Residual-effect significance switched from p-value-only to **p-value AND effect-size (Cohen's d)** — both `residualEffectPValue < significance_p` AND `residualEffectMagnitudeD >= min_magnitude_d` must hold, or the effect is treated as not-significant. Severity escalation (`conditional`→`fail`) is driven purely by `|d|` crossing `residual_effect_severity_conditional_max_d`, never by how small the p-value is — a statistically-significant-but-trivial effect (tiny d) no longer fails a report on p-value alone.
- `recordFairLendingSignoff()` throws a distinct `err.reason === "insufficient_data"` (a real property on the Error object, not just embedded in the message string) separate from `err.reason === "fail"` — audit trails/monitoring must branch on `.reason`, not string-match the message. `assertProductionSafety()`'s boot re-verification treats `insufficient_data` identically to `fail` (blocks boot).
- `checkScoredPopulationVolumeGrowth()` had a units bug: `volume_growth_trigger_pct` is percentage POINTS (25 = 25%) but the computed `growth` was a 0-1 fraction — fixed by scaling `growthPct = growth * 100` before comparing. Also: when `baseline` (scored population at signoff time) is 0, growth is hardcoded to 0 (division-by-zero guard) — any test/manual verification of this trigger must first establish a non-zero baseline before adding "growth," or it will never fire.

## Sprint 3 — standalone licensable PTI API (`/api/v1/*`, July 2026)

A separate, externally-licensable surface that exposes ONLY the raw `computePTI()` base behavioral score — never the fair-lending adjustment layer (`fairLendingAdjustment.ts`/`computeFinalPTI()` are never imported by any file under this surface). This is a hard product boundary, not just an implementation detail: licensees must never receive the ±5 geo/income adjustment, since it depends on internal bias-testing signoff that doesn't apply to third parties.

- New tables: `licensee_api_keys`, `licensee_model_versions` (seeded `v4.1-behavioral`), `licensee_version_upgrade_log`, `licensee_api_audit_log` — parallel schema to the existing B2B key/audit pattern, kept fully separate so licensee rate-limits/versioning never interact with B2B logic.
- `src/services/licenseeApi.ts` is the sole entry point into `computePTI()` for this surface. Isolation is enforced by a source-scan regression test (regex-based, not blanket word match) that fails the build if `fairLendingAdjustment`, `computeFairLendingAdjustment(`, `computeFinalPTI(`, or `fair_lending_signoff` ever appear in the licensee service/route files — mirrors the existing `pti.ts` isolation-guard pattern from Sprint 2b.
- Portable-mode auto-detection works by field ABSENCE (`undefined`/`null`) in the raw payload for `daysToFirstSpei`/`oxxoLoadCount`/`speiLoadCount`/`cardLoadCount` — not by their value. **Gotcha**: any synthetic fixture/test snapshot must truly `delete` those keys (or never set them) rather than defaulting them to `0`/`NaN`, or portable-mode will never trigger even though it looks "empty." When portable mode triggers, cashflow_stability is rescaled by a 25/20 factor as a post-processing step in `licenseeApi.ts` only — `pti.ts` itself is never modified for this.
- Colonia/income fields are stripped server-side if a licensee includes them (never reach scoring).
- Endpoints: `POST /api/v1/score`, `GET /api/v1/data-card` (public, no auth — methodology doc), `GET /api/v1/model-versions`, `POST /api/v1/admin/keys` (provision, sandbox keys need no commercial gate), `POST /api/v1/admin/keys/:keyId/version` (bump, audit-logged).

### Sprint 3b — separate sandbox/production issuance authority + attributable production key creation (July 2026)
- `SANDBOX_ADMIN_TOKEN` and `PRODUCTION_ADMIN_TOKEN` are two distinct secrets, not tiers of the same token. Boot-time check (`isCredentialSeparationValid()` in `licenseeApi.ts`, called from `index.ts`) `process.exit(1)`s if `SANDBOX_ADMIN_TOKEN` is set but `PRODUCTION_ADMIN_TOKEN` is unset or identical — prevents silently collapsing the two authority levels back into one token.
- `classifyAdminToken()` checks `PRODUCTION_ADMIN_TOKEN` first, then falls back to `SANDBOX_ADMIN_TOKEN`/legacy `ADMIN_TOKEN`/`ADMIN_SECRET_KEY` — order matters if tokens ever collide during a migration window.
- Issuing (or version-bumping) a **production** licensee key requires the request to classify as `production` via `adminAuth` AND requires `approvedBy` + a non-blank `agreementReference` in the body (`validateProductionIssuanceFields()`) — a sandbox token alone is rejected with `production_admin_token_required` even if otherwise well-formed. Sandbox key issuance/version-bumps are completely unaffected (any valid admin token, no approval fields required) — this was a deliberate scope boundary, not an oversight.
- Every key issuance (sandbox or production) writes a row to `licensee_key_issuance_log` (`key_id, licensee_name, sandbox_mode, approved_by, agreement_reference, approval_date, issued_at, pinned_model_version, issuing_token_type`) — sandbox rows just have null approval fields. This is a full attribution audit trail, separate from `licensee_api_audit_log` (which logs API *usage*, not issuance).
- Version-bump attribution reuses the same production-token + `approvedBy` gate, keyed off the *target key's* `sandbox_mode` (looked up fresh from `licensee_api_keys`, not from the request) — so you can't bypass the gate by claiming a production key is sandbox in the request body.
- Tests: `artifacts/api-server/src/routes/tests/licenseeIssuance.test.ts` (supertest against the real app + real test DB, matching the `billpay.test.ts` pattern — no `@workspace/db` mocking exists anywhere in this codebase for this style of route test). The existing Sprint 3 isolation-guard tests in `services/tests/licenseeApi.test.ts` re-scan the same two files, so they automatically re-validate the isolation boundary after any Sprint 3b edit — no separate isolation test was needed for this sprint.
