/**
 * walletBalanceReconstruction.ts
 *
 * Pure, DB-free reconstruction of a user's running wallet balance over time
 * from their `wallet_transactions` rows. Built as prep work for PTI signal
 * work but NOT wired into PTIDataSnapshot yet (see pti.ts) — this module has
 * zero dependency on pti.ts and must stay that way.
 *
 * `wallet_transactions.type` is plain `text()` with NO central enum in the
 * schema (lib/db/src/schema/wallet_transactions.ts) — the vocabulary below
 * was enumerated directly from all 13 non-test write sites in the codebase,
 * not assumed from any type definition:
 *
 *   Credits (7): load_oxxo, load_card, spei_in, load_banco, admin_credit,
 *                transfer_receive, SIGNUP_BONUS (uppercase — non-standard
 *                casing, written by signupBonusService.ts)
 *   Debits  (2): bill_pay, transfer_send
 *
 * `wallet_transactions.status` has 4 values, not 3: pending, confirmed,
 * failed, completed. "completed" exists ONLY for SIGNUP_BONUS rows
 * (signupBonusService.ts writes status='completed' directly, with no
 * creditWallet() call and no confirmed_at). A balance-real filter that only
 * accepts "confirmed" silently drops every signup bonus — a core product
 * mechanic essentially every user has — so balance-real is
 * {confirmed, completed}, not {confirmed} alone.
 *
 * Ordering key: COALESCE(confirmed_at, created_at), applied uniformly with
 * no per-type branch. Every write site EXCEPT SIGNUP_BONUS either sets
 * confirmed_at at insert time (admin_credit, transfer_send, transfer_receive,
 * bill_pay) or transitions pending -> confirmed via creditWallet()
 * (wallet/services/wallet.ts), which sets confirmed_at at that moment
 * (load_oxxo, load_card, spei_in, load_banco). SIGNUP_BONUS is the sole
 * exception: confirmed_at is permanently null, so it is the only row type
 * that ever exercises the COALESCE fallback to created_at.
 */

export type WalletTransactionType =
  | "load_oxxo"
  | "load_card"
  | "spei_in"
  | "load_banco"
  | "admin_credit"
  | "transfer_receive"
  | "SIGNUP_BONUS"
  | "bill_pay"
  | "transfer_send";

export type WalletTransactionStatus = "pending" | "confirmed" | "failed" | "completed";

export type BalanceDirection = "credit" | "debit";

/**
 * Explicit credit/debit classification for all 9 confirmed types. Throws on
 * any type not in this set so a future new type (or a typo) fails loudly
 * instead of silently defaulting to one direction or the other.
 */
const TYPE_DIRECTION: Record<WalletTransactionType, BalanceDirection> = {
  load_oxxo: "credit",
  load_card: "credit",
  spei_in: "credit",
  load_banco: "credit",
  admin_credit: "credit",
  transfer_receive: "credit",
  SIGNUP_BONUS: "credit",
  bill_pay: "debit",
  transfer_send: "debit",
};

export function classifyTransactionDirection(type: string): BalanceDirection {
  const direction = (TYPE_DIRECTION as Record<string, BalanceDirection | undefined>)[type];
  if (direction === undefined) {
    throw new Error(
      `walletBalanceReconstruction: unrecognized wallet_transactions.type "${type}". ` +
        `Every write site must be enumerated in TYPE_DIRECTION before it can be reconstructed — ` +
        `add it explicitly (do not guess a default direction).`,
    );
  }
  return direction;
}

/**
 * Explicit balance-real / not-balance-real classification for all 4 known
 * statuses. Throws on any status not in this set — mirrors the type guard
 * above so a future status literal can't silently fall through either
 * bucket (e.g. a new "reversed" status must be classified explicitly, not
 * assumed to be balance-real or not).
 */
const BALANCE_REAL_STATUSES: Record<WalletTransactionStatus, boolean> = {
  confirmed: true,
  completed: true,
  pending: false,
  failed: false,
};

export function isBalanceRealStatus(status: string): boolean {
  const isReal = (BALANCE_REAL_STATUSES as Record<string, boolean | undefined>)[status];
  if (isReal === undefined) {
    throw new Error(
      `walletBalanceReconstruction: unrecognized wallet_transactions.status "${status}". ` +
        `Balance-real statuses are {confirmed, completed}; not-balance-real are {pending, failed}. ` +
        `A new status must be classified explicitly before it can be reconstructed.`,
    );
  }
  return isReal;
}

export interface WalletTransactionInput {
  id: string;
  type: string;
  status: string;
  amountMxn: number;
  createdAt: Date;
  confirmedAt: Date | null;
}

export interface BalancePoint {
  timestamp: Date;
  balance: number;
  transactionId: string;
  type: string;
}

/**
 * Opening balance assumption: every wallet starts at 0 MXN before its first
 * balance-real transaction. This module reconstructs balance purely from
 * `wallet_transactions` rows — it has no visibility into any out-of-band
 * starting balance, so if one ever exists it must be injected by the caller,
 * not assumed here.
 */
export const OPENING_BALANCE_MXN = 0;

/**
 * Resolves the ordering timestamp for a transaction: COALESCE(confirmed_at,
 * created_at), applied identically regardless of type. This is deliberately
 * NOT type-branched — see module header for why every row except
 * SIGNUP_BONUS has a confirmed_at by the time it's balance-real, and why
 * SIGNUP_BONUS is expected to fall back to created_at.
 */
export function resolveOrderingTimestamp(txn: WalletTransactionInput): Date {
  return txn.confirmedAt ?? txn.createdAt;
}

/**
 * Reconstructs the running-balance series for a user from their full set of
 * wallet_transactions rows (any status/type — filtering happens inside).
 *
 * - Rows whose status is not balance-real (pending, failed) are excluded
 *   entirely, regardless of type.
 * - Remaining rows are ordered by COALESCE(confirmed_at, created_at), with
 *   transaction id as a stable tiebreaker for same-timestamp rows (order
 *   ambiguity is resolved deterministically, not left to sort() stability
 *   assumptions across engines).
 * - Returns one {timestamp, balance} point per balance-real transaction,
 *   running from OPENING_BALANCE_MXN.
 */
export function reconstructBalanceSeries(userTransactions: WalletTransactionInput[]): BalancePoint[] {
  const balanceReal = userTransactions.filter((txn) => isBalanceRealStatus(txn.status));

  const sorted = [...balanceReal].sort((a, b) => {
    const ta = resolveOrderingTimestamp(a).getTime();
    const tb = resolveOrderingTimestamp(b).getTime();
    if (ta !== tb) return ta - tb;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  let running = OPENING_BALANCE_MXN;
  const series: BalancePoint[] = [];
  for (const txn of sorted) {
    const direction = classifyTransactionDirection(txn.type);
    running += direction === "credit" ? txn.amountMxn : -txn.amountMxn;
    series.push({
      timestamp: resolveOrderingTimestamp(txn),
      balance: running,
      transactionId: txn.id,
      type: txn.type,
    });
  }
  return series;
}

/**
 * `bill_payments.created_at` is stored naive (no timezone), unlike
 * `wallet_transactions` timestamps which are `timestamp with time zone`.
 * This normalizes a naive bill_payments timestamp to the same tz assumption
 * used by wallet_transactions (UTC) so the two tables' timestamps can be
 * safely compared/merged. If bill_payments.created_at is ever migrated to
 * `timestamptz`, this function becomes a no-op passthrough and should be
 * removed rather than left as dead indirection.
 */
export function toComparableTimestamp(naiveTimestamp: Date): Date {
  return new Date(
    Date.UTC(
      naiveTimestamp.getFullYear(),
      naiveTimestamp.getMonth(),
      naiveTimestamp.getDate(),
      naiveTimestamp.getHours(),
      naiveTimestamp.getMinutes(),
      naiveTimestamp.getSeconds(),
      naiveTimestamp.getMilliseconds(),
    ),
  );
}
