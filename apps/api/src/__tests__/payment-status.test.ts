import request from 'supertest';
import express from 'express';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paymentRoutes } from '../routes/payments';
import { errorHandler } from '../middleware/errors';
import { prisma } from '@vuzki/database';
import { checkPaymentStatus } from '../services/phonepe';
import { creditCoins } from '../services/wallet';

vi.mock('../middleware/auth', () => ({
  authenticate: () => (req: any, res: any, next: any) => {
    req.auth = { userId: 'u1' };
    next();
  },
}));

const app = express();
app.use(express.json());
app.use('/payments', paymentRoutes);
app.use(errorHandler);

vi.mock('@vuzki/database', () => ({
  prisma: {
    payment: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../services/phonepe', () => ({
  checkPaymentStatus: vi.fn(),
}));

vi.mock('../services/wallet', () => ({
  creditCoins: vi.fn(),
}));

vi.mock('../services/referrals', () => ({
  transitionReferralToEligible: vi.fn(),
}));

describe('Payment Status API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unknown order ID', async () => {
    (prisma.payment.findUnique as any).mockResolvedValueOnce(null);
    const res = await request(app).get('/payments/TXN1/status');
    expect(res.status).toBe(404);
  });

  it('rejects access from wrong user', async () => {
    (prisma.payment.findUnique as any).mockResolvedValueOnce({ userId: 'u2' });
    const res = await request(app).get('/payments/TXN1/status');
    expect(res.status).toBe(403);
  });

  it('returns status immediately if already terminal (COMPLETED)', async () => {
    (prisma.payment.findUnique as any).mockResolvedValueOnce({ userId: 'u1', status: 'COMPLETED' });
    const res = await request(app).get('/payments/TXN1/status');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('COMPLETED');
    expect(checkPaymentStatus).not.toHaveBeenCalled();
  });

  it('polls PhonePe if PENDING and returns SUCCESS when matched', async () => {
    (prisma.payment.findUnique as any).mockResolvedValueOnce({
      id: 'p1', userId: 'u1', status: 'PENDING', provider: 'PHONEPE', amount: 10, orderId: 'TXN1', purpose: 'COINS', relatedId: 'pkg1'
    });
    
    (checkPaymentStatus as any).mockResolvedValueOnce({
      success: true, code: 'PAYMENT_SUCCESS', data: { state: 'COMPLETED', amount: 1000, transactionId: 'TXN1' }
    });

    (prisma.$transaction as any).mockImplementationOnce(async (cb: any) => {
      (prisma.payment.updateMany as any).mockResolvedValueOnce({ count: 1 });
      return cb({
        payment: { updateMany: prisma.payment.updateMany },
        coinPackage: { findUnique: vi.fn().mockResolvedValueOnce({ coins: 100, bonusCoins: 10 }) }
      });
    });

    const res = await request(app).get('/payments/TXN1/status');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('COMPLETED');
    expect(checkPaymentStatus).toHaveBeenCalledWith('TXN1');
    
    // Assert wallet credit
    expect(creditCoins).toHaveBeenCalledWith('u1', 110, 'PURCHASE', expect.any(Object), 'TXN1', 'PAY:TXN1', expect.anything());
    
    // Assert referral transition
    const { transitionReferralToEligible } = await import('../services/referrals');
    expect(transitionReferralToEligible).toHaveBeenCalledWith('u1', expect.anything());
  });

  it('updates to FAILED if amount mismatches', async () => {
    (prisma.payment.findUnique as any).mockResolvedValueOnce({
      id: 'p1', userId: 'u1', status: 'PENDING', provider: 'PHONEPE', amount: 10, orderId: 'TXN1'
    });
    
    (checkPaymentStatus as any).mockResolvedValueOnce({
      success: true, code: 'PAYMENT_SUCCESS', data: { state: 'COMPLETED', amount: 500, transactionId: 'TXN1' } // expects 1000
    });

    const res = await request(app).get('/payments/TXN1/status');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('FAILED');
    expect(res.body.data.reason).toBe('AMOUNT_MISMATCH');
    expect(prisma.payment.updateMany).toHaveBeenCalled();
  });
});
