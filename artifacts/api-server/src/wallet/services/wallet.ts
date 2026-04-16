import { eq, sql, desc } from "drizzle-orm";
import { db, walletsTable, walletTransactionsTable, usersTable } from "@workspace/db";
import type { Wallet, WalletTransaction } from "@workspace/db";
import { logger } from "../../lib/logger.js";

export type { Wallet, WalletTransaction };

export async function getOrCreateWallet(telefono: string): Promise<Wallet> {
  const existing = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, telefono))
    .limit(1);

  if (existing.length > 0) return existing[0];

  await db
    .insert(usersTable)
    .values({ telefono })
    .onConflictDoNothing();

  const [wallet] = await db
    .insert(walletsTable)
    .values({ userId: telefono })
    .onConflictDoNothing()
    .returning();

  if (wallet) return wallet;

  const [found] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, telefono))
    .limit(1);

  return found;
}

export async function getBalance(telefono: string): Promise<number> {
  const wallet = await getOrCreateWallet(telefono);
  return parseFloat(wallet.balanceMxn ?? "0");
}

export async function creditWallet(
  walletId: string,
  amountMXN: number,
  txId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [txRow] = await tx
      .select()
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.id, txId))
      .limit(1);

    if (!txRow) {
      throw new Error(`Wallet transaction not found: ${txId}`);
    }
    if (txRow.status === "confirmed") {
      throw new Error(`Wallet transaction already confirmed: ${txId}`);
    }
    if (txRow.status === "failed") {
      throw new Error(`Wallet transaction is failed: ${txId}`);
    }

    await tx
      .update(walletsTable)
      .set({
        balanceMxn: sql`balance_mxn + ${amountMXN.toFixed(2)}`,
        updatedAt: new Date(),
      })
      .where(eq(walletsTable.id, walletId));

    await tx
      .update(walletTransactionsTable)
      .set({
        status: "confirmed",
        confirmedAt: new Date(),
      })
      .where(eq(walletTransactionsTable.id, txId));
  });

  logger.info({ walletId, amountMXN, txId }, "wallet: credited");
}

export async function debitWallet(
  walletId: string,
  amountMXN: number,
  description: string,
): Promise<string> {
  let newTxId: string;

  await db.transaction(async (tx) => {
    const [wallet] = await tx
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.id, walletId))
      .limit(1);

    if (!wallet) throw new Error(`Wallet not found: ${walletId}`);

    const currentBalance = parseFloat(wallet.balanceMxn ?? "0");
    if (currentBalance < amountMXN) {
      const err = new Error("INSUFFICIENT_BALANCE") as Error & {
        currentBalance: number;
      };
      err.currentBalance = currentBalance;
      throw err;
    }

    const [newTx] = await tx
      .insert(walletTransactionsTable)
      .values({
        walletId,
        type: "bill_pay",
        amountMxn: amountMXN.toFixed(2),
        status: "confirmed",
        description,
        confirmedAt: new Date(),
      })
      .returning({ id: walletTransactionsTable.id });

    newTxId = newTx.id;

    await tx
      .update(walletsTable)
      .set({
        balanceMxn: sql`balance_mxn - ${amountMXN.toFixed(2)}`,
        updatedAt: new Date(),
      })
      .where(eq(walletsTable.id, walletId));
  });

  logger.info({ walletId, amountMXN, description }, "wallet: debited");
  return newTxId!;
}

export async function getRecentTransactions(
  walletId: string,
  limit: number,
): Promise<WalletTransaction[]> {
  return db
    .select()
    .from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.walletId, walletId))
    .orderBy(desc(walletTransactionsTable.createdAt))
    .limit(limit);
}
