# PTI v5.0 IMPLEMENTATION PLAN — Day 1 (post-external-signature)

## Standing rules (apply to every phase)
- The signed Phase 3 spec is the sole work order. Any deviation = stop and
  report; deviations require a signoff amendment, not agent judgment.
- Evidence standard: every completion claim backed by pasted output
  (test run, query, diff, endpoint response). Silent no-ops reported as
  success are the program's known failure class — all edits use verified
  writes (assert on match, verify count after).
- Work in a branch. One concern per commit.
- FROZEN until their own gates: the recompute (Phase E), PAULA_SENDING_ENABLED.

---

## PHASE 0 — Lloyd, before the agent starts (15 min)
0.1 File Doug's written signature: one-line signed statement + his opinion
    (however brief) into docs/fair-lending/external-review-signature.md.
0.2 Daily twilio:status. If any of the 23 approve → twilio:sync first;
    approvals change Phase C's context.

## PHASE A — Program record update (Replit, ~10 min, docs only)
A1. Both fair-lending documents: demote watermarks to
    "EXTERNAL REVIEW SIGNED 2026-07-10 (Dr. D. Franklin) — DOCUMENT ACTIVE.
    Implementation authorized per Phase 3 §3.4."
A2. Add external-review-signature.md. Enter v5.0 in the licensee version
    registry with the complete signoff record (founder package signature,
    founder gate signature, founder line review, external signature).
A3. Commit. Evidence: diff --stat + the registry entry pasted.

## PHASE B — v5.0 scoring implementation, SHADOW MODE (the main build)
Implement v5.0 alongside v4.3 behind a version flag — both computable,
v4.3 remains the score users/gates see until Phase E.

B1. Cap table per spec §3.1, exactly:
    PR(36): payment_streak 16 (RESTRUCTURED: 0 at ≤2 consecutive months,
    +4/month above, full at 6) · day_consistency 5 · advance_days 8
    (unchanged) · self_initiated 7.
    BC(22): wallet_load_rhythm 4 (rail-agnostic load regularity — replaces
    funding_channel_mix's rail-identity logic) · all others unchanged.
    ED(22): biller_diversity 11 (RESTRUCTURED+VERIFIED: proxy
    verifiedBillers = min(billerCount, floor(payCount/2)); 0 at ≤3
    verified, +5.5/verified above, full at 5) · spend_category_mix 7 ·
    signup_utilization_speed 4 · kyc_verified 0 (REMOVED) ·
    device_consistency 0 (shadow).
    CF(20): payment_amount_volatility 7 (payCount≥2 gate unchanged — watch
    register) · load_spend_ratio 4 · account_age 3 · p2p 3 · buffer 3
    (NOT upweighted) · wallet_balance / bancarization_speed /
    funding_channel_mix 0 (shadow).
B2. Shadow demotions via ptiV4_3Disposition registry semantics: computed,
    logged, zero weight, flagged for MFI re-evaluation.
B3. Gate G-C as signed: streak criterion = 3 consecutive months OR
    2 consecutive + ≥6 total payments; tolerant-branch usage counter
    instrumented from the first evaluation. Raw billerCount ≥3 for the
    gate (verified count is scoring-only). Fraud-free/literacy unchanged.
B4. ±5/±2 retirement: delete fairLendingAdjustment.ts + mapping table;
    terminal entry in the fair_lending_signoff audit trail citing the
    spec; ADD the standing regression test — computePTI must not import
    colonia/income/SES data (test fails the build if it ever does).
B5. EVIDENCE GATES (all pasted before Phase C):
    a. Dimension-cap unit tests: each dimension's components sum to its
       cap; total ≤100; published cap table reproduced from code.
    b. Boundary tests: streak restructure at 2/3/6 months; biller proxy at
       payCount 2/6/10; volatility at payCount 1/2/3.
    c. NULL CHECK: with the v4.3 flag, scores for all 9 production users
       byte-identical to current prod values (paste both columns).
    d. SHADOW RECOMPUTE: v5.0 vs v4.3 for all 9 prod users — telefono
       (last4), v4.3 score, v5.0 score, delta, |delta|>5 flag. This table
       determines who needs the transition message at flip time.
    e. Regression test (B4) shown passing, and shown FAILING when a
       colonia import is temporarily added (forced test), then reverted.

## PHASE C — Transition template into the Twilio pipeline
C1. Add pti_v5_transition to ROWS[]: the exact es-MX text from spec
    §3.1.1, variable-free, UTILITY, one-time trigger tied to the flip
    (not cron). Run the generator (start/end rules pass trivially —
    verify 0 errors), reseed, regenerate twilio-submission.json → 24
    entries, 0 errors.
C2. LLOYD runs twilio:submit in the Shell (idempotent — creates only the
    new template). Meta clock starts.
C3. Consent-gated fallback per spec: in-app score-change notice for users
    with whatsapp_consent_at NULL, same text; wire the dispatch rule —
    at flip, |delta|>5 users get template (consented) or in-app notice
    (not), BEFORE the new score renders anywhere.
C4. Sending-gate arithmetic: gate stays 23/23 for Paula nudges; the
    transition template has its own approval check inside the Phase E
    flip gate (do not block Paula's go-live on template #24, and do not
    let Paula's gate pass substitute for #24's own approval).

## PHASE D — Fairness monitoring panel (ships now; it's read-only)
D1. Admin dashboard panel per spec §3.3, all six instruments:
    monthly gate-level 4/5 with the MIN-N RULE (≥500 per group AND
    expected smallest-group passers ≥10, else per-criterion Wilson CIs +
    "insufficient volume" flag — never a ratio on small cells) ·
    criterion-level failure attribution · KYC funnel by proxy group ·
    tolerant-branch counter · watch-register item (volatility payCount,
    trigger conditions displayed) · PTI-70 tripwire (alert + blocking
    review flag on first real user crossing 70).
D2. Evidence: panel endpoint response pasted; at n=7 every instrument
    should show its insufficient-volume state — that display IS the
    correct output, verify it renders rather than errors.

## PHASE E — The flip (NOT tomorrow; gated)
Preconditions, all required:
  (1) transition template Meta-approved + SID synced,
  (2) Phase B evidence gates all green,
  (3) Lloyd's go order.
E1. Recompute all users under v5.0; dispatch transition message/fallback
    for |delta|>5 BEFORE new scores render; flip the version flag.
E2. Monitoring panel confirmed live same deploy; generator patch merges
    as dev tooling in the same PR (v1.4 scope decision).
E3. Post-flip evidence: per-user score table (old/new/delta/message
    dispatched y-n), branch-counter reading, registry status = ACTIVE.

## Parallel track tomorrow (Lloyd, unchanged)
- FEMSA call: live-mode activation status for BOTH accounts (OXXO/
  DigitalFemsa AND Conekta card — separate credentials), live API keys,
  webhook signing secrets, settlement/bank verification.
- Taecel: resolve whether the gift-card purchase ever debited the
  balance; if no debit and the code redeemed, the SIPREL live-money
  assumption reopens.
- twilio:status daily; sync on approvals.
