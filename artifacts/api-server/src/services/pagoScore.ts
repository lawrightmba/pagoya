import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

export interface PagoScoreResult {
  telefono: string;
  pagoScore: number;
  // PTI dimensions (PagoYa Trust Index — internal name)
  trajectoryScore: number;   // 30pts — direction of travel
  financialScore: number;    // 25pts — payment discipline & behavior
  routineScore: number;      // 25pts — consistency & stability
  socialScore: number;       // 20pts — network & community quality
  breakdown: Record<string, number | string>;
}

/**
 * Compute and persist a PagoYa Trust Index (PTI) for a user.
 * User-facing label: PagoScore. Internal: PTI.
 *
 * Weight structure (per doc recommendation):
 *   Trajectory (longitudinal) — 30%
 *   Financial Behavior        — 25%
 *   Routine & Stability       — 25%
 *   Social & Community        — 20%
 *
 * Digital Engagement and Consumption Pattern signals feed into the
 * four primary dimensions as modifiers rather than standalone buckets.
 *
 * Runs silently — never surfaces errors to the user.
 */
export async function computePagoScore(telefono: string): Promise<PagoScoreResult | null> {
  try {
    const db = (await import("@workspace/db")).db;

    // ─────────────────────────────────────────────────────────────────────────
    // A. ROUTINE & STABILITY — 25 pts
    //    Signals: login consistency, biller diversity, top-up source stability,
    //             absence recovery, biller stability over time
    // ─────────────────────────────────────────────────────────────────────────
    const loginRows = await db.execute(sql`
      SELECT
        COUNT(DISTINCT DATE(created_at))::int            AS unique_login_days,
        COUNT(*)::int                                    AS total_logins,
        COALESCE(STDDEV(EXTRACT(HOUR FROM created_at)), 24)::numeric AS hour_stddev
      FROM user_events
      WHERE telefono = ${telefono}
        AND event_type = 'login'
        AND created_at > NOW() - INTERVAL '30 days'
    `);
    const lr = loginRows.rows[0] as Record<string, unknown>;
    const uniqueLoginDays = Number(lr?.unique_login_days ?? 0);
    const hourStddev = Number(lr?.hour_stddev ?? 24);
    const loginConsistency = Math.max(0, 1 - hourStddev / 12); // 0–1

    // Biller diversity — households with multiple biller types = more stable
    const billerRows = await db.execute(sql`
      SELECT COUNT(DISTINCT empresa)::int AS biller_count
      FROM bill_payments
      WHERE telefono = ${telefono}
    `);
    const billerCount = Number((billerRows.rows[0] as Record<string, unknown>)?.biller_count ?? 0);

    // Top-up source consistency — repeating same source = stable physical anchor
    const topupSourceRows = await db.execute(sql`
      SELECT type, COUNT(*)::int AS n
      FROM wallet_transactions
      WHERE telefono = ${telefono}
        AND type IN ('load_card','load_oxxo','spei_in')
        AND status = 'confirmed'
        AND created_at > NOW() - INTERVAL '60 days'
      GROUP BY type
      ORDER BY n DESC
      LIMIT 1
    `);
    const topupSourceDominance = (topupSourceRows.rows[0] as Record<string, unknown>)?.n
      ? Math.min(1, Number((topupSourceRows.rows[0] as Record<string, unknown>).n) / 5)
      : 0;

    const routineScore = Math.min(25, Math.floor(
      uniqueLoginDays * 0.4        // up to 12 pts (30 days * 0.4)
      + loginConsistency * 6       // up to 6 pts
      + Math.min(billerCount - 1, 3) * 2   // up to 6 pts (2+ billers)
      + topupSourceDominance * 1   // up to 1 pt
    ));

    // ─────────────────────────────────────────────────────────────────────────
    // B. FINANCIAL BEHAVIOR — 25 pts
    //    Signals: bills paid on-time, biller priority sequencing,
    //             failed payment recovery speed, load variance (income proxy),
    //             time-to-first-transaction after signup
    // ─────────────────────────────────────────────────────────────────────────
    const billRows = await db.execute(sql`
      SELECT
        COUNT(*)::int                                              AS bills_paid,
        COUNT(*) FILTER (WHERE status = 'completed')::int         AS on_time_count
      FROM bill_payments
      WHERE telefono = ${telefono}
        AND created_at > NOW() - INTERVAL '90 days'
    `);
    const br = billRows.rows[0] as Record<string, unknown>;
    const billsPaid = Number(br?.bills_paid ?? 0);
    const onTimeCount = Number(br?.on_time_count ?? 0);
    const onTimeRate = billsPaid > 0 ? onTimeCount / billsPaid : 0;

    // Wallet load amount variance — low variance = predictable income (salaried)
    const varianceRows = await db.execute(sql`
      SELECT
        COALESCE(STDDEV(amount_mxn::numeric), 0)::numeric AS load_stddev,
        COALESCE(AVG(amount_mxn::numeric), 0)::numeric    AS avg_load,
        COUNT(*)::int                                     AS load_count
      FROM wallet_transactions
      WHERE telefono = ${telefono}
        AND type IN ('load_card','load_oxxo','spei_in')
        AND status = 'confirmed'
    `);
    const vr = varianceRows.rows[0] as Record<string, unknown>;
    const loadStddev = Number(vr?.load_stddev ?? 999);
    const avgLoad = Number(vr?.avg_load ?? 0);
    const loadCount = Number(vr?.load_count ?? 0);
    // Coefficient of variation — lower = more stable income
    const cv = avgLoad > 0 ? Math.min(loadStddev / avgLoad, 2) : 1;
    const incomeStabilitySignal = Math.max(0, 1 - cv / 2); // 0–1

    // Failed payment recovery — checked via user_events
    const recoveryRows = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'failed_payment_attempt')::int AS failures,
        COUNT(*) FILTER (WHERE event_type = 'payment_recovered')::int      AS recoveries
      FROM user_events
      WHERE telefono = ${telefono}
        AND created_at > NOW() - INTERVAL '90 days'
    `);
    const rr = recoveryRows.rows[0] as Record<string, unknown>;
    const failures = Number(rr?.failures ?? 0);
    const recoveries = Number(rr?.recoveries ?? 0);
    // Recovery rate: recovered failures are positive signals; unrecovered are negative
    const recoveryBonus = failures > 0 ? Math.min(recoveries / failures, 1) * 3 : 0;
    const failurePenalty = Math.min(failures, 5) * 0.5;

    // Time-to-first-transaction: fast activation = high intent
    const activationRows = await db.execute(sql`
      SELECT
        EXTRACT(EPOCH FROM (MIN(bp.created_at) - u.created_at)) / 3600 AS hours_to_first
      FROM users u
      LEFT JOIN bill_payments bp ON bp.telefono = u.telefono
      WHERE u.telefono = ${telefono}
      GROUP BY u.created_at
    `);
    const hoursToFirst = Number(
      (activationRows.rows[0] as Record<string, unknown>)?.hours_to_first ?? 9999
    );
    const activationBonus = hoursToFirst < 24 ? 3 : hoursToFirst < 72 ? 2 : hoursToFirst < 168 ? 1 : 0;

    const financialScore = Math.min(25, Math.floor(
      Math.min(billsPaid * 2, 8)    // up to 8 pts for volume
      + onTimeRate * 8              // up to 8 pts for on-time rate
      + incomeStabilitySignal * 4  // up to 4 pts for income stability
      + recoveryBonus              // up to 3 pts for recovering failures
      - failurePenalty             // penalty for unrecovered failures
      + activationBonus            // up to 3 pts for fast activation
    ));

    // ─────────────────────────────────────────────────────────────────────────
    // C. LONGITUDINAL TRAJECTORY — 30 pts
    //    Signals: OXXO→digital migration, load count trend, engagement trend,
    //             wallet balance trend, spend velocity
    // Note: full 30/60/90-day trend vectors come in Phase 2. For now we seed
    //       with the strongest single signal: OXXO→digital migration.
    // ─────────────────────────────────────────────────────────────────────────

    // OXXO → digital migration: load type progression over time
    // If user started with load_oxxo and now uses spei_in/load_card → strong upward signal
    const migrationRows = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE type = 'load_oxxo')::int  AS oxxo_loads,
        COUNT(*) FILTER (WHERE type IN ('spei_in','load_card'))::int AS digital_loads,
        -- recent vs. early ratio (last 30d vs. first 30d)
        COUNT(*) FILTER (WHERE type IN ('spei_in','load_card') AND created_at > NOW() - INTERVAL '30 days')::int AS digital_recent
      FROM wallet_transactions
      WHERE telefono = ${telefono}
        AND type IN ('load_card','load_oxxo','spei_in')
        AND status = 'confirmed'
    `);
    const mr = migrationRows.rows[0] as Record<string, unknown>;
    const oxxoLoads = Number(mr?.oxxo_loads ?? 0);
    const digitalLoads = Number(mr?.digital_loads ?? 0);
    const digitalRecent = Number(mr?.digital_recent ?? 0);
    const totalTopups = oxxoLoads + digitalLoads;
    // Migration score: 0 if pure OXXO, max if fully digital and recently migrated
    const digitalRatio = totalTopups > 0 ? digitalLoads / totalTopups : 0;
    const migrationSignal = digitalRatio; // 0–1
    const recentDigitalBonus = digitalRecent > 0 && oxxoLoads > 0 ? 1 : 0; // crossed over

    // Activity volume trend (last 30d vs. prior 30d — early trajectory signal)
    const trendRows = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int  AS events_recent,
        COUNT(*) FILTER (
          WHERE created_at > NOW() - INTERVAL '60 days'
            AND created_at <= NOW() - INTERVAL '30 days'
        )::int AS events_prior
      FROM user_events
      WHERE telefono = ${telefono}
    `);
    const tr = trendRows.rows[0] as Record<string, unknown>;
    const eventsRecent = Number(tr?.events_recent ?? 0);
    const eventsPrior = Number(tr?.events_prior ?? 0);
    // Growth ratio: >1 = accelerating, <1 = declining
    const activityGrowth = eventsPrior > 0
      ? Math.min(eventsRecent / eventsPrior, 3)
      : eventsRecent > 0 ? 1.5 : 0;

    const trajectoryScore = Math.min(30, Math.floor(
      migrationSignal * 14          // up to 14 pts for digital migration
      + recentDigitalBonus * 4     // 4 bonus pts for actively crossing over
      + Math.min(activityGrowth * 4, 8) // up to 8 pts for accelerating usage
      + Math.min(loadCount * 0.5, 4)    // up to 4 pts for load frequency
    ));

    // ─────────────────────────────────────────────────────────────────────────
    // D. SOCIAL & COMMUNITY — 20 pts
    //    Signals: referrals sent, game engagement, P2P transactions,
    //             referral conversion (Phase 2), rep longevity (Phase 3)
    // ─────────────────────────────────────────────────────────────────────────
    const socialRows = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'game_played')::int       AS game_plays,
        COUNT(*) FILTER (WHERE event_type = 'referral_sent')::int     AS referrals,
        COUNT(*) FILTER (WHERE event_type = 'streak_completed')::int  AS streaks
      FROM user_events
      WHERE telefono = ${telefono}
        AND created_at > NOW() - INTERVAL '90 days'
    `);
    const sr = socialRows.rows[0] as Record<string, unknown>;
    const gamePlays = Number(sr?.game_plays ?? 0);
    const referrals = Number(sr?.referrals ?? 0);
    const streaks = Number(sr?.streaks ?? 0);

    const socialScore = Math.min(20, Math.floor(
      Math.min(gamePlays * 0.4, 6)  // up to 6 pts for game engagement
      + Math.min(referrals * 3, 9)  // up to 9 pts for referrals
      + Math.min(streaks * 1, 5)    // up to 5 pts for streaks
    ));

    const pagoScore = trajectoryScore + financialScore + routineScore + socialScore;

    // ── Persist ──────────────────────────────────────────────────────────────
    const totalEvents = eventsRecent + eventsPrior;
    await db.execute(sql`
      INSERT INTO credit_profiles
        (telefono, pago_score, payment_score, routine_score, engagement_score,
         wallet_score, social_score, total_events, bills_paid, login_streak_days,
         last_computed_at, updated_at)
      VALUES
        (${telefono}, ${pagoScore},
         ${financialScore}, ${routineScore}, ${trajectoryScore},
         ${Math.round(incomeStabilitySignal * 20)}, ${socialScore},
         ${totalEvents}, ${billsPaid}, ${uniqueLoginDays},
         NOW(), NOW())
      ON CONFLICT (telefono)
      DO UPDATE SET
        pago_score        = EXCLUDED.pago_score,
        payment_score     = EXCLUDED.payment_score,
        routine_score     = EXCLUDED.routine_score,
        engagement_score  = EXCLUDED.engagement_score,
        wallet_score      = EXCLUDED.wallet_score,
        social_score      = EXCLUDED.social_score,
        total_events      = EXCLUDED.total_events,
        bills_paid        = EXCLUDED.bills_paid,
        login_streak_days = EXCLUDED.login_streak_days,
        last_computed_at  = NOW(),
        updated_at        = NOW()
    `);

    logger.info({ telefono, pagoScore, trajectoryScore, financialScore, routineScore, socialScore }, "pti: computed");
    return {
      telefono, pagoScore,
      trajectoryScore, financialScore, routineScore, socialScore,
      breakdown: {
        billsPaid, uniqueLoginDays, billerCount, digitalRatio: Math.round(digitalRatio * 100),
        migrationSignal: recentDigitalBonus > 0 ? "migrated_to_digital" : oxxoLoads > 0 ? "oxxo_user" : "digital_native",
        incomeStability: Math.round(incomeStabilitySignal * 100),
        activityGrowth: Math.round(activityGrowth * 100),
        gamePlays, referrals, totalEvents,
      },
    };
  } catch (err) {
    logger.error({ err, telefono }, "pti: computation failed silently");
    return null;
  }
}
