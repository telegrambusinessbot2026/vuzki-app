import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { webhookRoutes } from '../routes/webhooks';
import crypto from 'crypto';

// Mock config
vi.mock('../config', () => ({
  config: {
    phonepeMerchantId: 'MERCHANT123',
    phonepeSaltKey: 'SALT123',
    phonepeSaltIndex: '1',
  },
}));

// Mock DB
const mocks = vi.hoisted(() => ({
  paymentFindUnique: vi.fn(),
  paymentUpdate: vi.fn(),
  paymentUpdateMany: vi.fn(),
  transaction: vi.fn(),
  coinPackageFindUnique: vi.fn(),
  creditCoins: vi.fn(),
  transitionReferralToEligible: vi.fn(),
}));

vi.mock('@vuzki/database', () => ({
  prisma: {
    payment: {
      findUnique: mocks.paymentFindUnique,
      update: mocks.paymentUpdate,
      updateMany: mocks.paymentUpdateMany,
    },
    coinPackage: {
      findUnique: mocks.coinPackageFindUnique,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock('../services/wallet', () => ({
  creditCoins: mocks.creditCoins,
}));

vi.mock('../services/referrals', () => ({
  transitionReferralToEligible: mocks.transitionReferralToEligible,
}));

import { errorHandler } from '../middleware/errors';
const app = express();
app.use(express.json());
app.use('/webhooks', webhookRoutes);
app.use(errorHandler);

describe('PhonePe Webhooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createPayload(data: any) {
    const base64 = Buffer.from(JSON.stringify(data)).toString('base64');
    const checksumString = base64 + 'SALT123';
    const sha256 = crypto.createHash('sha256').update(checksumString).digest('hex');
    const xVerify = sha256 + '###1';
    return { base64, xVerify };
  }

  it('rejects missing X-VERIFY header', async () => {
    const res = await request(app).post('/webhooks/phonepe').send({ response: 'base64' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Missing X-VERIFY header/);
  });

  it('rejects invalid signature', async () => {
    const res = await request(app).post('/webhooks/phonepe')
      .set('x-verify', 'invalid###1')
      .send({ response: Buffer.from(JSON.stringify({})).toString('base64') });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/Invalid webhook signature/);
  });

  it('rejects mismatching merchantId', async () => {
    const { base64, xVerify } = createPayload({ success: true, data: { merchantId: 'BAD', transactionId: 'TXN1', amount: 100 } });
    const res = await request(app).post('/webhooks/phonepe').set('x-verify', xVerify).send({ response: base64 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Merchant ID mismatch/);
  });

  it('rejects unknown transaction ID', async () => {
    const { base64, xVerify } = createPayload({ success: true, code: 'PAYMENT_SUCCESS', data: { merchantId: 'MERCHANT123', transactionId: 'TXN1', amount: 100 } });
    mocks.paymentFindUnique.mockResolvedValueOnce(null);
    const res = await request(app).post('/webhooks/phonepe').set('x-verify', xVerify).send({ response: base64 });
    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/Transaction ID not found/);
  });

  it('rejects amount mismatch and records it', async () => {
    const { base64, xVerify } = createPayload({ success: true, code: 'PAYMENT_SUCCESS', data: { merchantId: 'MERCHANT123', transactionId: 'TXN1', amount: 500, state: 'COMPLETED' } });
    mocks.paymentFindUnique.mockResolvedValueOnce({ id: 'p1', amount: 10, metadata: {} }); // 10 INR = 1000 Paise
    
    const res = await request(app).post('/webhooks/phonepe').set('x-verify', xVerify).send({ response: base64 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Payment amount mismatch detected/);
    expect(mocks.paymentUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'p1' },
      data: expect.objectContaining({ status: 'FAILED' }),
    }));
  });

  it('credits successfully on matching valid payment', async () => {
    const { base64, xVerify } = createPayload({ 
      success: true, code: 'PAYMENT_SUCCESS', 
      data: { merchantId: 'MERCHANT123', transactionId: 'TXN1', amount: 1000, state: 'COMPLETED', providerReferenceId: 'P_123' } 
    });
    
    mocks.paymentFindUnique.mockResolvedValueOnce({ id: 'p1', amount: 10, status: 'CREATED', purpose: 'COINS', relatedId: 'pkg1', userId: 'u1', orderId: 'TXN1' });
    
    // Mock the transaction callback
    mocks.transaction.mockImplementationOnce(async (cb: any) => {
      mocks.paymentUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.coinPackageFindUnique.mockResolvedValueOnce({ coins: 100, bonusCoins: 10 });
      return cb({
        payment: { updateMany: mocks.paymentUpdateMany },
        coinPackage: { findUnique: mocks.coinPackageFindUnique }
      });
    });

    const res = await request(app).post('/webhooks/phonepe').set('x-verify', xVerify).send({ response: base64 });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    
    // Ensure atomicity update was called
    expect(mocks.paymentUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'p1' }),
      data: expect.objectContaining({ status: 'COMPLETED', providerPaymentId: 'P_123' }),
    }));
    
    // Ensure credit was called
    expect(mocks.creditCoins).toHaveBeenCalledWith('u1', 110, 'PURCHASE', expect.any(Object), 'TXN1', 'PAY:TXN1', expect.anything());
    
    // Ensure Phase 21 referral gap closure trigger is called
    expect(mocks.transitionReferralToEligible).toHaveBeenCalledWith('u1', expect.anything());
  });

  it('does not credit if status is FAILED', async () => {
    const { base64, xVerify } = createPayload({ 
      success: false, code: 'PAYMENT_ERROR', 
      data: { merchantId: 'MERCHANT123', transactionId: 'TXN1', amount: 1000, state: 'FAILED' } 
    });
    
    mocks.paymentFindUnique.mockResolvedValueOnce({ id: 'p1', amount: 10, status: 'CREATED' });
    
    const res = await request(app).post('/webhooks/phonepe').set('x-verify', xVerify).send({ response: base64 });
    
    expect(res.status).toBe(200);
    expect(mocks.paymentUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: 'FAILED' },
    }));
    expect(mocks.transaction).not.toHaveBeenCalled(); // No transaction = no credit
  });
});
