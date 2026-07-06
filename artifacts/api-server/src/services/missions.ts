/**
 * Missions service — tracks user progress on gamification missions.
 * Called after every bill payment, wallet load, etc.
 * Never throws — all errors are logged and swallowed.
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { sendWhatsApp } from "../lib/whatsapp.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Mission {
  id: string;
  title_es: string;
  title_en: string;
  description_es: string;
  description_en: string;
  icon: string;
  goal_type: string;
  goal_value: number;
  reward_points: number;
  badge_emoji: string | null;
  sort_order: number;
  is_repeatable: boolean;
}

export interface UserMissionProgress {
  mission_id: string;
  title_es: string;
  title_en: string;
  description_es: string;
  icon: string;
  goal_value: number;
  reward_points: number;
  badge_emoji: string | null;
  current_value: number;
  completed_at: string | null;
  rewarded_at: string | null;
  percent: number;
}

// ─── Get all missions with user progress ──────────────────────────────────────

export async function getUserMissions(telefono: string): Promise<UserMissionProgress[]> {
  const r = await db.execute(sql`
    SELECT
      m.id AS mission_id,
      m.title_es, m.title_en, m.description_es, m.icon,
      m.goal_value, m.reward_points, m.badge_emoji,
      COALESCE(p.current_value, 0) AS current_value,
      p.completed_at,
      p.rewarded_at
    FROM loyalty_missions m
    LEFT JOIN user_mission_progress p
      ON p.mission_id = m.id AND p.telefono = ${telefono}
    WHERE m.is_active = TRUE
    ORDER BY m.sort_order
  `);

  return (r.rows as Array<Record<string, unknown>>).map((row) => {
    const gv = Number(row.goal_value);
    const cv = Number(row.current_value);
    return {
      mission_id: row.mission_id as string,
      title_es: row.title_es as string,
      title_en: row.title_en as string,
      description_es: row.description_es as string,
      icon: row.icon as string,
      goal_value: gv,
      reward_points: Number(row.reward_points),
      badge_emoji: (row.badge_emoji as string | null) ?? null,
      current_value: cv,
      completed_at: (row.completed_at as string | null) ?? null,
      rewarded_at: (row.rewarded_at as string | null) ?? null,
      percent: Math.min(100, Math.round((cv / gv) * 100)),
    };
  });
}

// ─── Get earned badges (completed + rewarded missions) ────────────────────────

export async function getUserBadges(telefono: string): Promise<Array<{
  mission_id: string; title_es: string; badge_emoji: string; earned_at: string;
}>> {
  const r = await db.execute(sql`
    SELECT m.id AS mission_id, m.title_es, m.badge_emoji, p.rewarded_at AS earned_at
    FROM user_mission_progress p
    JOIN loyalty_missions m ON m.id = p.mission_id
    WHERE p.telefono = ${telefono}
      AND p.rewarded_at IS NOT NULL
    ORDER BY p.rewarded_at DESC
  `);
  return r.rows as Array<{ mission_id: string; title_es: string; badge_emoji: string; earned_at: string }>;
}

// ─── Update mission progress after an event ───────────────────────────────────

export async function updateMissionProgress(
  telefono: string,
  eventType: "bill_payment" | "wallet_load",
  billerName?: string,
  accountId?: string,
): Promise<void> {
  try {
    const missions = await db.execute(sql`
      SELECT id, goal_type, goal_value, reward_points, title_es, badge_emoji
      FROM loyalty_missions WHERE is_active = TRUE
    `);

    for (const m of missions.rows as Array<{
      id: string; goal_type: string; goal_value: number;
      reward_points: number; title_es: string; badge_emoji: string | null;
    }>) {
      // Compute new value for this mission
      let newValue = 0;

      if (m.goal_type === "total_payments" && eventType === "bill_payment") {
        const r = await db.execute(sql`
          SELECT COUNT(*)::int AS cnt
          FROM loyalty_transactions
          WHERE phone = ${telefono} AND type = 'earn'
        `);
        newValue = Number((r.rows[0] as { cnt: number }).cnt);
      } else if (m.goal_type === "weekly_payments" && eventType === "bill_payment") {
        const r = await db.execute(sql`
          SELECT COUNT(*)::int AS cnt
          FROM loyalty_transactions
          WHERE phone = ${telefono}
            AND type = 'earn'
            AND created_at >= date_trunc('week', now())
        `);
        newValue = Number((r.rows[0] as { cnt: number }).cnt);
      } else if (m.goal_type === "distinct_billers" && eventType === "bill_payment") {
        // bill_payments has service_name, not biller_name (biller_name lives on
        // user_billers/profiles). Using biller_name here made this query throw
        // "column does not exist" on every call, silently swallowed by the
        // non-fatal catch — so distinct_billers missions never progressed.
        const r = await db.execute(sql`
          SELECT COUNT(DISTINCT service_name)::int AS cnt
          FROM bill_payments
          WHERE telefono = ${telefono} AND status = 'completed'
        `);
        newValue = Number((r.rows[0] as { cnt: number }).cnt);
      } else if (m.goal_type === "wallet_loads" && eventType === "wallet_load") {
        // wallets is keyed by user_id (references users.telefono), not phone.
        // Using w.phone here made this query throw "column does not exist" on
        // every call, silently swallowed by the non-fatal catch — so
        // wallet_loads missions never progressed. Same bug class as the
        // distinct_billers biller_name fix above.
        const r = await db.execute(sql`
          SELECT COUNT(*)::int AS cnt
          FROM wallet_transactions wt
          JOIN wallets w ON w.id = wt.wallet_id
          WHERE w.user_id = ${telefono}
            AND wt.type IN ('load_oxxo', 'spei_in', 'load_card')
            AND wt.status = 'confirmed'
        `);
        newValue = Number((r.rows[0] as { cnt: number }).cnt);
      } else if (m.goal_type === "streak_weeks" && eventType === "bill_payment") {
        // Count consecutive weeks with at least one payment
        const r = await db.execute(sql`
          WITH weekly AS (
            SELECT DISTINCT date_trunc('week', created_at)::date AS wk
            FROM loyalty_transactions
            WHERE phone = ${telefono} AND type = 'earn'
          ),
          numbered AS (
            SELECT wk, ROW_NUMBER() OVER (ORDER BY wk DESC) AS rn FROM weekly
          ),
          streak AS (
            SELECT wk, rn,
              (wk + (rn - 1) * INTERVAL '1 week')::date AS grp
            FROM numbered
          )
          SELECT COUNT(*)::int AS streak_len
          FROM streak
          WHERE grp = (SELECT grp FROM streak WHERE rn = 1)
        `);
        newValue = Number((r.rows[0] as { streak_len: number }).streak_len ?? 0);
      } else {
        continue; // not applicable for this event type
      }

      // Upsert progress
      await db.execute(sql`
        INSERT INTO user_mission_progress (telefono, mission_id, current_value)
        VALUES (${telefono}, ${m.id}, ${newValue})
        ON CONFLICT (telefono, mission_id) DO UPDATE
          SET current_value = GREATEST(user_mission_progress.current_value, ${newValue})
      `);

      // Check completion
      const progRow = await db.execute(sql`
        SELECT current_value, completed_at, rewarded_at
        FROM user_mission_progress
        WHERE telefono = ${telefono} AND mission_id = ${m.id}
      `);
      const prog = progRow.rows[0] as {
        current_value: number; completed_at: string | null; rewarded_at: string | null;
      } | undefined;

      if (!prog) continue;

      const isComplete = prog.current_value >= m.goal_value;
      const alreadyRewarded = !!prog.rewarded_at;

      if (isComplete && !alreadyRewarded) {
        // Mark completed + rewarded
        await db.execute(sql`
          UPDATE user_mission_progress
          SET completed_at = COALESCE(completed_at, now()),
              rewarded_at = now()
          WHERE telefono = ${telefono} AND mission_id = ${m.id}
        `);

        // Credit loyalty points
        if (accountId) {
          await db.execute(sql`
            UPDATE loyalty_accounts
            SET points_balance = points_balance + ${m.reward_points},
                points_lifetime = points_lifetime + ${m.reward_points},
                updated_at = now()
            WHERE id = ${accountId}
          `);
          await db.execute(sql`
            INSERT INTO loyalty_transactions
              (account_id, phone, type, points, balance_after, description)
            SELECT ${accountId}, ${telefono}, 'earn',
              ${m.reward_points},
              points_balance,
              ${'Misión completada: ' + m.title_es}
            FROM loyalty_accounts WHERE id = ${accountId}
          `);
        }

        // WhatsApp notification (fire and forget)
        const badge = m.badge_emoji ?? "🏅";
        sendWhatsApp(
          telefono,
          `${badge} ¡Misión completada! "${m.title_es}" — +${m.reward_points} PagoYa Puntos acreditados. Sigue jugando en pagoyamx.com/puntos`,
        ).catch(() => {});

        logger.info({ telefono, missionId: m.id, points: m.reward_points }, "missions: completed and rewarded");
      }
    }
  } catch (err) {
    logger.error({ err, telefono, eventType }, "missions: updateMissionProgress failed (non-fatal)");
  }
}
