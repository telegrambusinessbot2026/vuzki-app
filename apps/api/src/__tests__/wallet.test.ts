import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks must be created with vi.hoisted (vi.mock factory is hoisted) ---
const mocks = vi.hoisted(() => {
  const walletUpsert = vi.fn();
  const walletFindUnique = vi.fn();
  const walletUpdateMany = vi.fn();
  const walletTxCreate = vi.fn();
  const walletTxFindUnique = vi.fn();
  const earningCreate = vi.fn();
  const tx = {
    wallet: {
      upsert: walletUpsert,
      findUnique: walletFindUnique,
      updateMany: walletUpdateMany,
    },
    walletTransaction: { create: walletTxCreate, findUnique: walletTxFindUnique },
    creatorEarning: { create: earningCreate },
  };
  return { walletUpsert, walletFindUnique, walletUpdateMany, walletTxCreate, walletTxFindUnique, earningCreate, tx };
});

vi.mock('@vuzki/database', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (t: any) => Promise<unknown>) => fn(mocks.tx)),
    wallet: {
      findUnique: mocks.walletFindUnique,
      upsert: mocks.walletUpsert,
    },
    walletTransaction: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import {
  creditCoins,
  debitCoins,
  getBalance,
  recordCreatorEarning,
} from '@/services/wallet';
import { WalletTransactionType } from '@vuzki/shared';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('wallet: creditCoins', () => {
  it('creates the wallet and records a completed transaction when none exists', async () => {
    mocks.walletUpsert.mockResolvedValue({ id: 'w1', userId: 'u1', balance: 150, currency: 'INR' });
    mocks.walletTxCreate.mockResolvedValue({ id: 'tx1' });

    const result = await creditCoins('u1', 150, WalletTransactionType.PURCHASE, { pack: 'c2' }, 'ref-1');

    expect(result.alreadyProcessed).toBe(false);
    expect(result.balance).toBe(150);
    expect(mocks.walletUpsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      update: { balance: { increment: 150 } },
      create: { userId: 'u1', balance: 150, currency: 'INR' },
    });
    expect(mocks.walletTxCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'u1',
          amount: 150,
          type: WalletTransactionType.PURCHASE,
          status: expect.any(String),
          balanceAfter: 150,
          referenceId: 'ref-1',
        }),
      })
    );
  });

  it('does not double-credit when the same idempotencyKey already exists', async () => {
    mocks.walletTxFindUnique
      .mockResolvedValueOnce(null) // first call: not present -> proceeds
      .mockResolvedValue({ id: 'tx-prev', amount: 150, balanceAfter: 150 });
    mocks.walletUpsert.mockResolvedValue({ id: 'w1', userId: 'u1', balance: 150, currency: 'INR' });
    mocks.walletTxCreate.mockResolvedValue({ id: 'tx1' });

    // First call credits normally.
    const first = await creditCoins('u1', 150, WalletTransactionType.PURCHASE, {}, 'ref-1', 'PAY:ord-1');
    expect(first.alreadyProcessed).toBe(false);
    expect(mocks.walletTxCreate).toHaveBeenCalledTimes(1);

    // Replay with the same key short-circuits: no upsert increment, no new txn.
    const replay = await creditCoins('u1', 150, WalletTransactionType.PURCHASE, {}, 'ref-1', 'PAY:ord-1');
    expect(replay.alreadyProcessed).toBe(true);
    expect(replay.balance).toBe(150);
    expect(mocks.walletUpsert).toHaveBeenCalledTimes(1);
    expect(mocks.walletTxCreate).toHaveBeenCalledTimes(1);
  });
});

describe('wallet: debitCoins invariants', () => {
  it('rejects non-positive amounts', async () => {
    await expect(debitCoins('u1', 0, WalletTransactionType.AUDIO_CALL)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_AMOUNT',
    });
    await expect(debitCoins('u1', -5, WalletTransactionType.AUDIO_CALL)).rejects.toMatchObject({
      code: 'INVALID_AMOUNT',
    });
  });

  it('rejects when balance is insufficient (PAYMENT_REQUIRED)', async () => {
    mocks.walletUpdateMany.mockResolvedValue({ count: 0 });
    mocks.walletFindUnique.mockResolvedValue({ id: 'w1', userId: 'u1', balance: 10 });
    await expect(debitCoins('u1', 50, WalletTransactionType.AUDIO_CALL)).rejects.toMatchObject({
      status: 402,
      code: 'INSUFFICIENT_BALANCE',
      details: { balance: 10, required: 50 },
    });
    expect(mocks.walletUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', balance: { gte: 50 } },
      data: { balance: { decrement: 50 } },
    });
  });

  it('rejects when wallet does not exist', async () => {
    mocks.walletUpdateMany.mockResolvedValue({ count: 0 });
    mocks.walletFindUnique.mockResolvedValue(null);
    await expect(debitCoins('u1', 5, WalletTransactionType.GIFT_SENT)).rejects.toMatchObject({
      code: 'INSUFFICIENT_BALANCE',
    });
  });

  it('debits and records a negative transaction on success', async () => {
    mocks.walletUpdateMany.mockResolvedValue({ count: 1 });
    mocks.walletFindUnique.mockResolvedValue({ id: 'w1', userId: 'u1', balance: 70 });
    mocks.walletTxCreate.mockResolvedValue({ id: 'tx2', amount: -30 });

    const res = await debitCoins('u1', 30, WalletTransactionType.GIFT_SENT);

    expect(res.alreadyProcessed).toBe(false);
    expect(mocks.walletUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', balance: { gte: 30 } },
      data: { balance: { decrement: 30 } },
    });
    expect(mocks.walletTxCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: -30, balanceAfter: 70 }),
      })
    );
    expect(res.transaction.amount).toBe(-30);
  });

  it('does not double-debit when the same idempotencyKey already exists', async () => {
    mocks.walletTxFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ id: 'tx-prev', amount: -30, balanceAfter: 70 });
    mocks.walletUpdateMany.mockResolvedValue({ count: 1 });
    mocks.walletFindUnique.mockResolvedValue({ id: 'w1', userId: 'u1', balance: 70 });
    mocks.walletTxCreate.mockResolvedValue({ id: 'tx2', amount: -30 });

    const first = await debitCoins('u1', 30, WalletTransactionType.GIFT_SENT, {}, 'g-1', 'GIFT:u1:g-1');
    expect(first.alreadyProcessed).toBe(false);
    expect(mocks.walletUpdateMany).toHaveBeenCalledTimes(1);

    const replay = await debitCoins('u1', 30, WalletTransactionType.GIFT_SENT, {}, 'g-1', 'GIFT:u1:g-1');
    expect(replay.alreadyProcessed).toBe(true);
    expect(replay.transaction.amount).toBe(-30);
    // The wallet was only decremented once across both calls.
    expect(mocks.walletUpdateMany).toHaveBeenCalledTimes(1);
  });

  it('TOCTOU regression: concurrent debits cannot both overspend a limited balance', async () => {
    // Balance of 10 coins, two concurrent requests each debit 10. The atomic
    // conditional decrement must let only ONE succeed (updateMany count 1);
    // the losing race sees count 0 and is rejected as INSUFFICIENT_BALANCE —
    // preventing the old check-then-decrement double-spend (balance would have
    // gone to -10 and 20 coins spent against 10).
    mocks.walletTxFindUnique.mockResolvedValue(null);
    mocks.walletFindUnique.mockResolvedValue({ id: 'w1', userId: 'u1', balance: 0 });
    mocks.walletTxCreate.mockResolvedValue({ id: 'tx-race' });

    // First debit wins the conditional UPDATE.
    mocks.walletUpdateMany.mockResolvedValueOnce({ count: 1 });
    mocks.walletFindUnique.mockResolvedValueOnce({ id: 'w1', userId: 'u1', balance: 0 });
    await expect(
      debitCoins('u1', 10, WalletTransactionType.AUDIO_CALL, {}, 'c1', 'CALL:c1')
    ).resolves.toMatchObject({ alreadyProcessed: false });

    // Second concurrent debit: the where { balance: { gte: 10 } } matches 0 rows
    // (balance already 0), so it must NOT decrement and must NOT record a txn.
    mocks.walletUpdateMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      debitCoins('u1', 10, WalletTransactionType.AUDIO_CALL, {}, 'c2', 'CALL:c2')
    ).rejects.toMatchObject({
      status: 402,
      code: 'INSUFFICIENT_BALANCE',
      details: { balance: 0, required: 10 },
    });

    expect(mocks.walletUpdateMany).toHaveBeenCalledTimes(2);
    expect(mocks.walletTxCreate).toHaveBeenCalledTimes(1);
  });
});

describe('wallet: getBalance + earnings', () => {
  it('returns 0 when no wallet exists', async () => {
    mocks.walletFindUnique.mockResolvedValue(null);
    await expect(getBalance('u9')).resolves.toBe(0);
  });

  it('records creator earnings as PENDING with coins', async () => {
    mocks.earningCreate.mockResolvedValue({ id: 'e1', status: 'PENDING', amount: 2.5, coins: 50 });
    const earning = await recordCreatorEarning({
      creatorProfileId: 'cp1',
      userId: 'u1',
      type: 'GIFT',
      amount: 2.5,
      coins: 50,
      referenceId: 'ref-earn',
    });
    expect(earning.status).toBe('PENDING');
    expect(mocks.earningCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          creatorId: 'cp1',
          userId: 'u1',
          type: 'GIFT',
          amount: 2.5,
          coins: 50,
          status: 'PENDING',
        }),
      })
    );
  });
});
