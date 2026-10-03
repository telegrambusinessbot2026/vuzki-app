import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCoinsOrder } from '../services/payments';
import { PaymentProvider } from '@vuzki/shared';
import * as fraud from '../services/fraud';

// Mock config
vi.mock('../config', () => ({
  config: {
    paymentProvider: 'phonepe',
    phonepeMerchantId: 'MERCHANT123',
    phonepeSaltKey: 'SALT',
    phonepeSaltIndex: '1',
  },
}));

// Mock DB
const mocks = vi.hoisted(() => ({
  coinPackageFindUnique: vi.fn(),
  paymentCreate: vi.fn(),
  paymentUpdate: vi.fn(),
}));

vi.mock('@vuzki/database', () => ({
  prisma: {
    coinPackage: {
      findUnique: mocks.coinPackageFindUnique,
    },
    payment: {
      create: mocks.paymentCreate,
      update: mocks.paymentUpdate,
    },
  },
}));

vi.mock('../services/fraud', () => ({
  checkPaymentAnomalies: vi.fn().mockResolvedValue(undefined),
}));

// Mock PhonePe service
const mockInitDynamicQR = vi.fn();
vi.mock('../services/phonepe', () => ({
  initDynamicQR: (...args: any[]) => mockInitDynamicQR(...args),
}));

describe('Payments Service - PhonePe QR Order Creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an internal order and initiates PhonePe QR without crediting coins', async () => {
    mocks.coinPackageFindUnique.mockResolvedValueOnce({
      id: 'pkg_1',
      status: 'ACTIVE',
      price: 10,
      currency: 'INR',
      coins: 100,
      bonusCoins: 10,
    });

    mocks.paymentCreate.mockImplementationOnce(async (args) => {
      return { id: 'payment_1', orderId: args.data.orderId, metadata: args.data.metadata };
    });

    mockInitDynamicQR.mockResolvedValueOnce({
      transactionId: 'TXN123',
      merchantId: 'MERCHANT123',
      amount: 1000,
      qrString: 'upi://pay?pa=MERCHANT123',
      code: 'SUCCESS',
      message: 'QR generated',
    });

    const result = await createCoinsOrder('user1', 'pkg_1', PaymentProvider.PHONEPE);

    expect(mocks.coinPackageFindUnique).toHaveBeenCalledWith({ where: { id: 'pkg_1' } });
    
    // Validates the internal Payment record was created
    expect(mocks.paymentCreate).toHaveBeenCalledTimes(1);
    const createArgs = mocks.paymentCreate.mock.calls[0][0];
    expect(createArgs.data.userId).toBe('user1');
    expect(createArgs.data.provider).toBe('phonepe');
    expect(createArgs.data.amount).toBe(10);
    expect(createArgs.data.status).toBe('CREATED');
    expect(createArgs.data.orderId).toMatch(/^VZ_[A-Z0-9]+$/);

    // Ensure PhonePe QR init was called correctly
    expect(mockInitDynamicQR).toHaveBeenCalledWith({
      transactionId: createArgs.data.orderId,
      amountPaise: 1000, // 10 * 100
    });

    // Validates payment was updated with provider data
    expect(mocks.paymentUpdate).toHaveBeenCalledTimes(1);
    const updateArgs = mocks.paymentUpdate.mock.calls[0][0];
    expect(updateArgs.data.providerPaymentId).toBe('TXN123');
    expect(updateArgs.data.metadata.qrString).toBe('upi://pay?pa=MERCHANT123');

    // Validates final payload
    expect(result.orderId).toBe(createArgs.data.orderId);
    expect(result.paymentPayload).toMatchObject({
      merchantId: 'MERCHANT123',
      transactionId: 'TXN123',
      amount: 1000,
      qrString: 'upi://pay?pa=MERCHANT123',
    });
    
    // Confirms NO coins were credited via wallet services here!
    // We only created the DB entry and generated the QR.
  });
});
