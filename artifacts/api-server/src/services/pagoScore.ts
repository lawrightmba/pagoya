import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

export interface PagoScoreResult {
  telefono: string;
  pagoScore: number;
  paymentScore: number;
  routineScore: number;
  engagementScore: number;
  walletScore: number;
  socialScore: number;
  breakdown: Record<string, number | string>;
}

/**
 * Compute and persist a PagoScore for a user based on their behavioral events.
 * Called after any significant event (login, bill paid, game played).
 * Runs silently — never surfaces errors to the user.
 */
export async function computePagoScore(telefono: string): Promise<PagoScoreResult | null> {
  try {
    const db = (await import("@workspace/db")).db;

    // ── 1. Payment behavior (30 pts max) ───────────────────────────────────────
    const billRows = await db.execute(sql`
      SELECT
        COUNT(*)::int                                              AS bills_paid,
        AVG(EXTRACT(EPOCH FROM (bp.created_at - (bp.created_at - interval '1 day'))) / 86400)::numeric AS avg_days,
        COUNT(*) FILTER (WHERE status = 'completed')::int         AS on_time_count
      FROM bill_payments bp
      WHERE bp.telefono = ${telefono}
        AND bp.created_at > NOW() - INTERVAL '90 days'
    `);
    const billRow = billRows.rows[0] as Record<string, unknown>;
    const billsPaid = Number(billRow?.bills_paid ?? 0);
    const onTimeCount = Number(billRow?.on_time_count ?? 0);
    const paymentScore = Math.min(30, Math.floor(billsPaid * 3 + (onTimeCount / Math.max(billsPaid, 1)) * 15));

    // ── 2. Login routine (20 pts max) ──────────────────────────────────────────
    const loginRows = await db.execute(sql`
      SELECT
        COUNT(DISTINCT DATE(created_at))::int            AS unique_login_days,
        COUNT(*)::int                                    AS total_logins,
        STDDEV(EXTRACT(HOUR FROM created_at))::numeric   AS hour_stddev
      FROM user_events
      WHERE telefono = ${telefono}
        AND event_type = 'login'
        AND created_at > NOW() - INTERVAL '30 days'
    `);
    const loginRow = loginRows.rows[0] as Record<string, unknown>;
    const uniqueLoginDays = Number(loginRow?.unique_login_days ?? 0);
    const hourStddev = Number(loginRow?.hour_stddev ?? 24);
    const loginConsistency = Math.max(0, 1 - hourStddev / 12);
    const routineScore = Math.min(20, Math.floor(uniqueLoginDays * 0.5 + loginConsistency * 10));

    // ── 3. Digital engagement (15 pts max) ─────────────────────────────────────
    const engageRows = await db.execute(sql`
      SELECT
        COUNT(*)::int                                           AS total_events,
        COUNT(DISTINCT event_type)::int                        AS unique_features,
        AVG((metadata->>'session_seconds')::numeric)::numeric  AS avg_session_secs
      FROM user_events
      WHERE telefono = ${telefono}
        AND created_at > NOW() - INTERVAL '30 days'
    `);
    const engageRow = engageRows.rows[0] as Record<string, unknown>;
    const totalEvents = Number(engageRow?.total_events ?? 0);
    const uniqueFeatures = Number(engageRow?.unique_features ?? 0);
    const avgSessionSecs = Number(engageRow?.avg_session_secs ?? 0);
    const engagementScore = Math.min(15,
      Math.floor(Math.min(totalEvents / 10, 5) + Math.min(uniqueFeatures * 1.5, 6) + Math.min(avgSessionSecs / 120, 4))
    );

    // ── 4. Wallet behavior (20 pts max) ────────────────────────────────────────
    const walletRows = await db.execute(sql`
      SELECT
        COUNT(*)::int                                                          AS load_count,
        COALESCE(AVG(amount_mxn::numeric), 0)::numeric                        AS avg_load,
        COALESCE(MAX(amount_mxn::numeric), 0)::numeric                        AS max_load
      FROM wallet_transactions
      WHERE telefono = ${telefono}
        AND type IN ('load_card','load_oxxo','spei_in')
        AND status = 'confirmed'
        AND created_at > NOW() - INTERVAL '90 days'
    `);
    const walletRow = walletRows.rows[0] as Record<string, unknown>;
    const loadCount = Number(walletRow?.load_count ?? 0);
    const avgLoad = Number(walletRow?.avg_load ?? 0);
    const walletScore = Math.min(20,
      Math.floor(Math.min(loadCount * 2, 10) + Math.min(avgLoad / 50, 10))
    );

    // ── 5. Social / game signals (15 pts max) ──────────────────────────────────
    const socialRows = await db.execute(sql`
      SELECT
        COUNT(*)::int AS game_plays,
        COUNT(*) FILTER (WHERE event_type = 'referral_sent')::int AS referrals
      FROM user_events
      WHERE telefono = ${telefono}
        AND event_type IN ('game_played','referral_sent')
        AND created_at > NOW() - INTERVAL '90 days'
    `);
    const socialRow = socialRows.rows[0] as Record<string, unknown>;
    const gamePlays = Number(socialRow?.game_plays ?? 0);
    const referrals = Number(socialRow?.referrals ?? 0);
    const socialScore = Math.min(15, Math.floor(Math.min(gamePlays * 0.5, 7) + Math.min(referrals * 2.5, 8)));

    const pagoScore = paymentScore + routineScore + engagementScore + walletScore + socialScore;

    // ── Persist ────────────────────────────────────────────────────────────────
    await db.execute(sql`
      INSERT INTO credit_profiles
        (telefono, pago_score, payment_score, routine_score, engagement_score,
         wallet_score, social_score, total_events, bills_paid, login_streak_days,
         last_computed_at, updated_at)
      VALUES
        (${telefono}, ${pagoScore}, ${paymentScore}, ${routineScore}, ${engagementScore},
         ${walletScore}, ${socialScore}, ${totalEvents}, ${billsPaid}, ${uniqueLoginDays},
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

    logger.info({ telefono, pagoScore }, "pagoScore: computed");
    return { telefono, pagoScore, paymentScore, routineScore, engagementScore, walletScore, socialScore, breakdown: { billsPaid, uniqueLoginDays, totalEvents, gamePlays, referrals } };
  } catch (err) {
    logger.error({ err, telefono }, "pagoScore: computation failed silently");
    return null;
  }
}
