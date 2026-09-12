import { prisma } from '@vuzki/database';
import {
  WalletTransactionType,
  WalletTransactionStatus,
} from '@vuzki/shared';
import { ApiErrorResponse } from '@vuzki/types';

const models = (tx: any) => ({
  wallet: tx.wallet,
  walletTransaction: tx.walletTransaction,
});

// Treat a unique-constraint violation as "already processed" (idempotent replay).
function isUniqueViolation(e: unknown): boolean {
  return !!e && typeof e === 'object' && (e as any)?.code === 'P2002';
}

// Credit coins to a user's wallet (server-side, atomic, idempotent).
// `idempotencyKey` (optional) is @unique on WalletTransaction: replaying the
// same key never double-credits, even under concurrent delivery.
// When `tx` is provided the whole operation runs inside that caller transaction
// so it composes atomically with upstream state changes.
export async function creditCoins(
  userId: string,
  amount: number,
  type: WalletTransactionType,
  metadata: Record<string, unknown> = {},
  referenceId?: string,
  idempotencyKey?: string,
  tx?: any
) {
  try {
    const run = async (db: any) => {
      if (idempotencyKey) {
        const existing = await db.walletTransaction.findUnique({ where: { idempotencyKey } });
        if (existing) return { alreadyProcessed: true, balance: existing.balanceAfter, transactionId: existing.id };
      }

      const wallet = await db.wallet.upsert({
        where: { userId },
        update: { balance: { increment: amount } },
        create: { userId, balance: amount, currency: 'INR' },
      });

      const txn = await db.walletTransaction.create({
        data: {
          userId,
          amount,
          currency: 'INR',
          type,
          status: WalletTransactionStatus.COMPLETED,
          balanceAfter: wallet.balance,
          metadata: metadata as any,
          referenceId,
          idempotencyKey,
        },
      });

      return { alreadyProcessed: false, balance: wallet.balance, transactionId: txn.id };
    };

    if (tx) return run(tx);
    return prisma.$transaction((db) => run(db));
  } catch (e) {
    // Concurrent delivery raced past the check but was blocked by the DB unique
    // constraint — treat as an already-processed replay, not a double credit.
    if (idempotencyKey && isUniqueViolation(e)) {
      const existing = await prisma.walletTransaction.findUnique({ where: { idempotencyKey } });
      if (existing) return { alreadyProcessed: true, balance: existing.balanceAfter, transactionId: existing.id };
    }
    throw e;
  }
}

// Debit coins from a user's wallet with balance check (atomic, idempotent).
// `idempotencyKey` (optional) is @unique on WalletTransaction: the same key is
// never debited twice, even if an upstream caller fires duplicate events.
// When `tx` is provided the whole operation runs inside that caller transaction.
export async function debitCoins(
  userId: string,
  amount: number,
  type: WalletTransactionType,
  metadata: Record<string, unknown> = {},
  referenceId?: string,
  idempotencyKey?: string,
  tx?: any
) {
  if (amount <= 0) throw new ApiErrorResponse(400, 'INVALID_AMOUNT', 'Amount must be positive');

  try {
    const run = async (db: any) => {
      if (idempotencyKey) {
        const existing = await db.walletTransaction.findUnique({ where: { idempotencyKey } });
        if (existing) return { alreadyProcessed: true, transaction: existing };
      }

      // Atomic check-and-decrement: the balance guard and the decrement are a
      // single conditional UPDATE, so two concurrent debits can never both read
      // the same balance and overspend (TOCTOU / double-spend). Only one
      // debiting transaction can match `balance >= amount`; any losing race
      // updates 0 rows and is rejected as INSUFFICIENT_BALANCE.
      const updated = await db.wallet.updateMany({
        where: { userId, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });
      if (updated.count !== 1) {
        const wallet = await db.wallet.findUnique({ where: { userId } });
        throw new ApiErrorResponse(402, 'INSUFFICIENT_BALANCE', 'Insufficient coin balance', {
          balance: wallet?.balance ?? 0,
          required: amount,
        });
      }

      // Read the post-decrement balance for the ledger record (atomic update is
      // complete at this point; a re-read sees the committed decrement).
      const walletAfter = await db.wallet.findUnique({ where: { userId } });

      const transaction = await db.walletTransaction.create({
        data: {
          userId,
          amount: -amount,
          currency: 'INR',
          type,
          status: WalletTransactionStatus.COMPLETED,
          balanceAfter: walletAfter?.balance ?? 0,
          metadata: metadata as any,
          referenceId,
          idempotencyKey,
        },
      });

      return { alreadyProcessed: false, transaction };
    };

    if (tx) return run(tx);
    return prisma.$transaction((db) => run(db));
  } catch (e) {
    if (idempotencyKey && isUniqueViolation(e)) {
      const existing = await prisma.walletTransaction.findUnique({ where: { idempotencyKey } });
      if (existing) return { alreadyProcessed: true, transaction: existing };
    }
    throw e;
  }
}

export async function getBalance(userId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  return wallet?.balance ?? 0;
}

export async function getWallet(userId: string) {
  return prisma.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId, balance: 0, currency: 'INR' },
  });
}

export async function getTransactionHistory(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.walletTransaction.count({ where: { userId } }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// Record an earning for a creator (pending balance, credited from call/gift)
export async function recordCreatorEarning(params: {
  creatorProfileId: string;
  userId: string;
  type: string;
  amount: number;
  coins?: number;
  callId?: string;
  referenceId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const earning = await tx.creatorEarning.create({
      data: {
        creatorId: params.creatorProfileId,
        userId: params.userId,
        type: params.type,
        amount: params.amount,
        coins: params.coins ?? 0,
        status: 'PENDING',
        callId: params.callId,
        referenceId: params.referenceId,
      },
    });
    return earning;
  });
}
