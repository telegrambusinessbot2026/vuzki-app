import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const paymentFindUnique = vi.fn();
  const paymentUpdateMany = vi.fn();
  const coinPackageFindUnique = vi.fn();
  const walletUpsert = vi.fn();
  const walletTxCreate = vi.fn();
  const walletTxFindUnique = vi.fn();
  const tx = {
    payment: { updateMany: paymentUpdateMany },
    coinPackage: { findUnique: coinPackageFindUnique },
    wallet: { upsert: walletUpsert },
    walletTransaction: { create: walletTxCreate, findUnique: walletTxFindUnique },
  };
  return { paymentFindUnique, paymentUpdateMany, coinPackageFindUnique, walletUpsert, walletTxCreate, walletTxFindUnique, tx };
});

vi.mock('@vuzki/database', () => ({
  prisma: {
    payment: { findUnique: mocks.paymentFindUnique },
    $transaction: vi.fn(async (fn: (t: any) => Promise<unknown>) => fn(mocks.tx)),
    walletTransaction: { findUnique: vi.fn() },
  },
}));

import { handlePaymentSuccess } from '@/services/payments';

const createdPayment = {
  id: 'pay1',
  userId: 'u1',
  orderId: 'VZ_ABC123',
  provider: 'demo',
  amount: 5,
  currency: 'INR',
  status: 'CREATED',
  purpose: 'COINS',
  relatedId: 'pack_900',
  webhookReceived: null,
  providerPaymentId: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.paymentFindUnique.mockResolvedValue(createdPayment);
  mocks.paymentUpdateMany.mockResolvedValue({ count: 1 });
  mocks.coinPackageFindUnique.mockResolvedValue({
    id: 'pack_900',
    coins: 400,
    bonusCoins: 30,
  });
  mocks.walletTxFindUnique.mockResolvedValue(null);
  mocks.walletUpsert.mockResolvedValue({ userId: 'u1', balance: 430, currency: 'INR' });
  mocks.walletTxCreate.mockResolvedValue({ id: 'wtx1' });
});

describe('payments: webhook idempotency & coin credit', () => {
  it('credits coins exactly once on the first webhook', async () => {
    const res = await handlePaymentSuccess({ orderId: 'VZ_ABC123', provider: 'demo' });

    expect(res.success).toBe(true);
    // Atomic claim uses a guarded updateMany (only from a non-terminal status).
    expect(mocks.paymentUpdateMany).toHaveBeenCalledTimes(1);
    expect(mocks.paymentUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'pay1' }),
        data: expect.objectContaining({ status: 'COMPLETED' }),
      })
    );
    // wallet credited with coins + bonus via creditCoins (idempotent key = orderId)
    expect(mocks.walletUpsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      update: { balance: { increment: 430 } },
      create: { userId: 'u1', balance: 430, currency: 'INR' },
    });
    expect(mocks.walletTxCreate).toHaveBeenCalledTimes(1);
    expect(mocks.walletTxCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: 430,
          referenceId: 'VZ_ABC123',
          idempotencyKey: 'PAY:VZ_ABC123',
        }),
      })
    );
  });

  it('does NOT double-credit when the claim guard races (updateMany hits 0 rows)', async () => {
    // A concurrent webhook already claimed this payment -> 0 rows must be updated.
    mocks.paymentUpdateMany.mockResolvedValue({ count: 0 });

    const res = await handlePaymentSuccess({ orderId: 'VZ_ABC123', provider: 'demo' });

    expect(res).toEqual({ alreadyProcessed: true, orderId: 'VZ_ABC123' });
    expect(mocks.walletUpsert).not.toHaveBeenCalled();
    expect(mocks.walletTxCreate).not.toHaveBeenCalled();
  });

  it('does NOT double-credit when the webhook is retried (status already COMPLETED)', async () => {
    // Simulate a payment already completed by a prior webhook delivery.
    mocks.paymentFindUnique.mockResolvedValue({ ...createdPayment, status: 'COMPLETED' });

    const res = await handlePaymentSuccess({ orderId: 'VZ_ABC123', provider: 'demo' });

    expect(res).toEqual({ alreadyProcessed: true, orderId: 'VZ_ABC123' });
    expect(mocks.paymentUpdateMany).not.toHaveBeenCalled();
    expect(mocks.walletUpsert).not.toHaveBeenCalled();
    expect(mocks.walletTxCreate).not.toHaveBeenCalled();
  });

  it('throws ORDER_NOT_FOUND for an unknown orderId', async () => {
    mocks.paymentFindUnique.mockResolvedValue(null);
    await expect(handlePaymentSuccess({ orderId: 'NOPE', provider: 'demo' })).rejects.toMatchObject({
      status: 404,
      code: 'ORDER_NOT_FOUND',
    });
    expect(mocks.walletTxCreate).not.toHaveBeenCalled();
  });

  it('rejects invalid signature for secure provider', async () => {
    await expect(handlePaymentSuccess({ orderId: 'VZ_ABC123', provider: 'stripe', signature: 'bad_sig', rawBody: 'foo' })).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_SIGNATURE',
    });
    expect(mocks.walletUpsert).not.toHaveBeenCalled();
  });

  it('rejects missing rawBody for secure provider', async () => {
    await expect(handlePaymentSuccess({ orderId: 'VZ_ABC123', provider: 'stripe', signature: 'some_sig', rawBody: '' })).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_SIGNATURE',
    });
    expect(mocks.walletUpsert).not.toHaveBeenCalled();
  });
});
