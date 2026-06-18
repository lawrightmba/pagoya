import { eq, sql, and, gte, sum } from "drizzle-orm";
import { db, walletsTable, walletTransactionsTable, usersTable } from "@workspace/db";
import { logger } from "../../lib/logger.js";
import { getOrCreateWallet } from "./wallet.js";

export const P2P_DAILY_LIMIT_MXN = 2500;
export const P2P_MIN_MXN = 10;

export async function lookupUser(telefono: string): Promise<{ exists: boolean; telefono: string }> {
  const [user] = await db
    .select({ telefono: usersTable.telefono })
    .from(usersTable)
    .where(eq(usersTable.telefono, telefono))
    .limit(1);

  return { exists: !!user, telefono };
}

export async function getDailyTransferTotal(telefono: string): Promise<number> {
  const wallet = await getOrCreateWallet(telefono);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [row] = await db
    .select({ total: sum(walletTransactionsTable.amountMxn) })
    .from(walletTransactionsTable)
    .where(
      and(
        eq(walletTransactionsTable.walletId, wallet.id),
        eq(walletTransactionsTable.type, "transfer_send"),
        eq(walletTransactionsTable.status, "confirmed"),
        gte(walletTransactionsTable.createdAt, startOfDay),
      ),
    );

  return parseFloat(row?.total ?? "0");
}

export async function p2pTransfer(
  senderTelefono: string,
  receiverTelefono: string,
  amountMXN: number,
  memo?: string,
): Promise<{ senderTxId: string; receiverTxId: string; newSenderBalance: number }> {
  if (senderTelefono === receiverTelefono) {
    throw Object.assign(new Error("SAME_ACCOUNT"), { code: "SAME_ACCOUNT" });
  }
  if (amountMXN < P2P_MIN_MXN) {
    throw Object.assign(new Error("BELOW_MINIMUM"), { code: "BELOW_MINIMUM", min: P2P_MIN_MXN });
  }

  const dailyTotal = await getDailyTransferTotal(senderTelefono);
  if (dailyTotal + amountMXN > P2P_DAILY_LIMIT_MXN) {
    throw Object.assign(new Error("DAILY_LIMIT_EXCEEDED"), {
      code: "DAILY_LIMIT_EXCEEDED",
      dailyTotal,
      remaining: Math.max(0, P2P_DAILY_LIMIT_MXN - dailyTotal),
    });
  }

  const senderWallet = await getOrCreateWallet(senderTelefono);
  const existingReceiver = await lookupUser(receiverTelefono);
  const receiverIsNew = !existingReceiver.exists;
  const receiverWallet = await getOrCreateWallet(receiverTelefono);

  const description = memo?.trim()
    ? `Transferencia de ${senderTelefono} — ${memo.trim()}`
    : `Transferencia de ${senderTelefono}`;

  const receiverDescription = memo?.trim()
    ? `Transferencia de ${senderTelefono} — ${memo.trim()}`
    : `Transferencia de ${senderTelefono}`;

  let senderTxId: string;
  let receiverTxId: string;
  let newSenderBalance: number;

  await db.transaction(async (tx) => {
    // Verify sender wallet exists (balance check is done atomically in the UPDATE below)
    const [lockedSender] = await tx
      .select({ id: walletsTable.id })
      .from(walletsTable)
      .where(eq(walletsTable.id, senderWallet.id))
      .limit(1);

    if (!lockedSender) throw new Error("Sender wallet not found");

    const [senderTx] = await tx
      .insert(walletTransactionsTable)
      .values({
        walletId: senderWallet.id,
        type: "transfer_send",
        amountMxn: amountMXN.toFixed(2),
        status: "confirmed",
        description: `Enviado a ${receiverTelefono}${memo ? ` — ${memo}` : ""}`,
        confirmedAt: new Date(),
      })
      .returning({ id: walletTransactionsTable.id });

    const [receiverTx] = await tx
      .insert(walletTransactionsTable)
      .values({
        walletId: receiverWallet.id,
        type: "transfer_receive",
        amountMxn: amountMXN.toFixed(2),
        status: "confirmed",
        description: receiverDescription,
        peerTransferId: senderTx.id,
        confirmedAt: new Date(),
      })
      .returning({ id: walletTransactionsTable.id });

    await tx
      .update(walletTransactionsTable)
      .set({ peerTransferId: receiverTx.id })
      .where(eq(walletTransactionsTable.id, senderTx.id));

    // Atomic conditional debit for sender — only succeeds if balance is still sufficient.
    // Eliminates race condition between the earlier balance read and this UPDATE.
    const [debitResult] = await tx
      .update(walletsTable)
      .set({
        balanceMxn: sql`balance_mxn - ${amountMXN.toFixed(2)}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(walletsTable.id, senderWallet.id),
          sql`balance_mxn >= ${amountMXN.toFixed(2)}::numeric`,
        ),
      )
      .returning({ id: walletsTable.id, balanceMxn: walletsTable.balanceMxn });

    if (!debitResult) {
      throw Object.assign(new Error("INSUFFICIENT_BALANCE"), {
        code: "INSUFFICIENT_BALANCE",
        currentBalance: 0,
      });
    }

    await tx
      .update(walletsTable)
      .set({
        balanceMxn: sql`balance_mxn + ${amountMXN.toFixed(2)}`,
        updatedAt: new Date(),
      })
      .where(eq(walletsTable.id, receiverWallet.id));

    senderTxId = senderTx.id;
    receiverTxId = receiverTx.id;
    newSenderBalance = parseFloat(debitResult.balanceMxn ?? "0");
  });

  logger.info(
    { senderTelefono, receiverTelefono, amountMXN },
    "p2p: transfer completed",
  );

  // Log P2P send event for PTI behavioral scoring (fire-and-forget, non-blocking)
  db.execute(sql`
    INSERT INTO user_events (telefono, event_type, metadata)
    VALUES (${senderTelefono}, 'p2p_sent', ${JSON.stringify({ amount: amountMXN, recipient: receiverTelefono })}::jsonb)
  `).catch(() => {});

  return { senderTxId: senderTxId!, receiverTxId: receiverTxId!, newSenderBalance: newSenderBalance!, receiverIsNew };
}
