import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const pkgFindUnique = vi.fn();
  const paymentCreate = vi.fn();
  const paymentFindUnique = vi.fn();
  const paymentUpdateMany = vi.fn();
  const walletUpsert = vi.fn();
  const walletTxCreate = vi.fn();
  const walletTxFindUnique = vi.fn();
  return { pkgFindUnique, paymentCreate, paymentFindUnique, paymentUpdateMany, walletUpsert, walletTxCreate, walletTxFindUnique };
});

// One shared, mutable config object. Both the mocked module and the tests
// reference this SAME object, so mutating it in a test is seen by the service.
const sharedConfig = vi.hoisted(() => ({
  paymentProvider: 'razorpay',
  demoMode: false,
  razorpayKeyId: 'rzp_test',
  razorpayKeySecret: 'secret',
  stripeSecretKey: 'sk_test',
  cashfreeClientId: 'cf_test',
  webhookSecret: '',
}));
const cfg = vi.hoisted(() => sharedConfig);

vi.mock('../config', () => ({ config: sharedConfig }));

vi.mock('@vuzki/database', () => ({
  prisma: {
    coinPackage: { findUnique: mocks.pkgFindUnique },
    payment: {
      create: mocks.paymentCreate,
      findUnique: mocks.paymentFindUnique,
      updateMany: mocks.paymentUpdateMany,
    },
    wallet: { upsert: mocks.walletUpsert, findUnique: vi.fn() },
    walletTransaction: { create: mocks.walletTxCreate, findUnique: mocks.walletTxFindUnique },
    $transaction: vi.fn(async (fn: (t: any) => Promise<unknown>) =>
      fn({
        payment: { updateMany: mocks.paymentUpdateMany, findUnique: mocks.paymentFindUnique },
        coinPackage: { findUnique: mocks.pkgFindUnique },
        wallet: { upsert: mocks.walletUpsert },
        walletTransaction: { create: mocks.walletTxCreate, findUnique: mocks.walletTxFindUnique },
      })
    ),
  },
}));

import { createCoinsOrder, verifyPaymentClient } from '@/services/payments';

beforeEach(() => {
  vi.clearAllMocks();
  cfg.paymentProvider = 'razorpay';
  cfg.demoMode = false;
  mocks.pkgFindUnique.mockResolvedValue({ id: 'pack1', coins: 100, bonusCoins: 20, price: 5, currency: 'INR', status: 'ACTIVE' });
  mocks.paymentCreate.mockImplementation(({ data }: any) => ({ id: 'p1', ...data, orderId: data.orderId }));
  // creditCoins (via handlePaymentSuccess): idempotency lookup absent, wallet
  // upsert returns a wallet with a valid balance, walletTransaction.create
  // returns a valid transaction id.
  mocks.walletTxFindUnique.mockResolvedValue(null);
  mocks.walletUpsert.mockResolvedValue({ userId: 'u1', balance: 120, currency: 'INR' });
  mocks.walletTxCreate.mockResolvedValue({ id: 'wtx1' });
});

describe('payments: createCoinsOrder (no client-forced demo in production)', () => {
  it('uses the configured provider, never demo, when the server is not in demo mode', async () => {
    cfg.paymentProvider = 'razorpay';
    cfg.demoMode = false;

    // Client asks for a demo order - must be rejected and forced to razorpay.
    const order = await createCoinsOrder('u1', 'pack1', 'demo' as any);

    expect(order.provider).toBe('razorpay');
    expect(mocks.paymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ provider: 'razorpay', purpose: 'COINS' }),
      })
    );
  });

  it('honors the demo provider when the server IS in demo mode', async () => {
    cfg.paymentProvider = 'demo';
    cfg.demoMode = true;

    const order = await createCoinsOrder('u1', 'pack1', 'demo' as any);

    expect(order.provider).toBe('demo');
    expect(order.paymentPayload.requireVerification).toBe(true);
    expect(mocks.paymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ provider: 'demo' }),
      })
    );
  });
});

describe('payments: verifyPaymentClient (cannot force-fill a real order)', () => {
  const demoOrder = {
    id: 'p1',
    userId: 'u1',
    orderId: 'VZ_ABC',
    provider: 'demo',
    status: 'CREATED',
    purpose: 'COINS',
    relatedId: 'pack1',
    webhookReceived: null,
    providerPaymentId: null,
  };

  it('requires a webhook instead of fulfilling a demo order in production', async () => {
    cfg.paymentProvider = 'razorpay';
    cfg.demoMode = false;
    mocks.paymentFindUnique.mockResolvedValue(demoOrder);

    // Client sends demo:true to try to force-fill - must NOT be honored.
    const res = await verifyPaymentClient({ orderId: 'VZ_ABC', provider: 'demo', demo: true });

    expect(res).toEqual({ requiresWebhook: true, orderId: 'VZ_ABC' });
    expect(mocks.paymentUpdateMany).not.toHaveBeenCalled();
  });

  it('fulfills a demo order only when the server is configured for demo mode', async () => {
    cfg.paymentProvider = 'demo';
    cfg.demoMode = true;
    mocks.paymentFindUnique.mockResolvedValue(demoOrder);
    mocks.paymentUpdateMany.mockResolvedValue({ count: 1 });

    const res = await verifyPaymentClient({ orderId: 'VZ_ABC', provider: 'demo', demo: true });

    expect(res).toMatchObject({ success: true, orderId: 'VZ_ABC' });
  });

  it('returns alreadyProcessed for a completed order without touching the webhook', async () => {
    cfg.paymentProvider = 'razorpay';
    cfg.demoMode = false;
    mocks.paymentFindUnique.mockResolvedValue({ ...demoOrder, status: 'COMPLETED' });

    const res = await verifyPaymentClient({ orderId: 'VZ_ABC', provider: 'demo', demo: true });

    expect(res).toEqual({ alreadyProcessed: true, orderId: 'VZ_ABC' });
    expect(mocks.paymentUpdateMany).not.toHaveBeenCalled();
  });
});
