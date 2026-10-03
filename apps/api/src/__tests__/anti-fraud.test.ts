import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { adminRoutes } from '../routes/admin';
import * as fraudService from '../services/fraud';
import * as botService from '../services/bot';
import * as riskService from '../services/risk';

const mocks = vi.hoisted(() => ({
  fraudFlagCreate: vi.fn(),
  fraudFlagFindMany: vi.fn(),
  fraudFlagFindUnique: vi.fn(),
  fraudFlagUpdate: vi.fn(),
  fraudFlagCount: vi.fn(),
  safetySignalCreate: vi.fn(),
  paymentFindMany: vi.fn(),
  paymentCount: vi.fn(),
  withdrawalFindMany: vi.fn(),
  withdrawalCount: vi.fn(),
  giftFindMany: vi.fn(),
  giftTransactionCount: vi.fn(),
  referralFindMany: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock('@vuzki/database', () => ({
  prisma: {
    fraudFlag: { create: mocks.fraudFlagCreate, findMany: mocks.fraudFlagFindMany, findUnique: mocks.fraudFlagFindUnique, update: mocks.fraudFlagUpdate, count: mocks.fraudFlagCount },
    safetySignal: { create: mocks.safetySignalCreate },
    payment: { findMany: mocks.paymentFindMany, count: mocks.paymentCount },
    withdrawal: { findMany: mocks.withdrawalFindMany, count: mocks.withdrawalCount },
    gift: { findMany: mocks.giftFindMany },
    giftTransaction: { count: mocks.giftTransactionCount },
    referral: { findMany: mocks.referralFindMany },
    user: { findUnique: mocks.userFindUnique },
  }
}));

vi.mock('../guards', () => ({
  requireAdmin: (req: any, res: any, next: any) => {
    req.admin = { adminId: 'admin1', role: 'ADMIN' };
    next();
  },
  requirePermission: () => (req: any, res: any, next: any) => next(),
  requireRole: () => (req: any, res: any, next: any) => next(),
}));

import { errorHandler } from '../middleware/errors';

const app = express();
app.use(express.json());
app.use('/admin', adminRoutes);
app.use(errorHandler);

describe('Anti-Fraud, Bot Detection & Risk Scoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fraudFlagCreate.mockImplementation(async ({ data }: any) => ({ id: 'flag-1', ...data }));
    mocks.safetySignalCreate.mockImplementation(async ({ data }: any) => ({ id: 'sig-1', ...data }));
  });

  describe('Fraud Services', () => {
    it('checkPaymentAnomalies generates flags for excessive payments', async () => {
      mocks.paymentCount.mockResolvedValue(15);
      mocks.userFindUnique.mockResolvedValue({ createdAt: new Date() });
      await fraudService.checkPaymentAnomalies({ userId: 'u1', orderId: 'ord1', amount: 100 });
      expect(mocks.fraudFlagCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ entityType: 'PAYMENT', reason: 'Excessive payments in 24h' })
      }));
    });

    it('checkReferralFraud generates flags for self-referral', async () => {
      await fraudService.checkReferralFraud({ referrerId: 'u1', referredUserId: 'u1' });
      expect(mocks.fraudFlagCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ entityType: 'REFERRAL', riskLevel: 'HIGH', reason: 'Self-referral detected' })
      }));
    });

    it('checkWithdrawalAnomaly generates flags for large first withdrawals', async () => {
      mocks.withdrawalCount.mockResolvedValue(0);
      await fraudService.checkWithdrawalAnomaly({ userId: 'u1', amount: 20000, method: 'BANK' });
      expect(mocks.fraudFlagCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ entityType: 'WITHDRAWAL', reason: 'Large first withdrawal' })
      }));
    });
    
    it('checkGiftAnomaly generates flags for excessive gifts', async () => {
      mocks.giftTransactionCount.mockResolvedValue(55);
      await fraudService.checkGiftAnomaly({ senderId: 'u1', receiverId: 'u2', amountCoins: 100 });
      expect(mocks.fraudFlagCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ entityType: 'GIFT', reason: 'High gift volume (possible gift abuse)' })
      }));
    });
  });

  describe('Bot Services', () => {
    it('recordSignupIp tracks IPs and adds safety signal on abuse', async () => {
      // simulate BOT.MAX_SIGNUP_IP hits
      for (let i = 0; i < 15; i++) {
        await botService.recordSignupIp('127.0.0.1');
      }
      expect(mocks.safetySignalCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ signalType: 'BOT', reason: 'Too many signups from single IP' })
      }));
    });
    
    it('checkBotActivity evaluates speed and identical actions', async () => {
      mocks.userFindUnique.mockResolvedValue({ createdAt: new Date(Date.now() - 1000) });
      const res = await botService.checkBotActivity({ userId: 'u1', action: 'message', identicalRecent: 6, speedMs: 50 });
      expect(res.botLikelihood).not.toBe('LOW');
      expect(res.signals.length).toBeGreaterThan(0);
    });
  });

  describe('Admin Fraud API', () => {
    it('GET /admin/fraud-flags returns flags', async () => {
      mocks.fraudFlagFindMany.mockResolvedValue([{ id: 'flag-1', entityType: 'PAYMENT' }]);
      mocks.fraudFlagCount.mockResolvedValue(1);
      const res = await request(app).get('/admin/fraud-flags');
      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([{ id: 'flag-1', entityType: 'PAYMENT' }]);
      expect(res.body.data.total).toBe(1);
    });

    it('PATCH /admin/fraud-flags/:id updates flag status', async () => {
      mocks.fraudFlagFindUnique.mockResolvedValue({ id: 'flag-1', status: 'OPEN' });
      mocks.fraudFlagUpdate.mockResolvedValue({ id: 'flag-1', status: 'DISMISSED' });
      const res = await request(app).patch('/admin/fraud-flags/flag-1').send({ decision: 'DISMISSED', note: 'All good' });
      expect(res.status).toBe(200);
      expect(mocks.fraudFlagUpdate).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'flag-1' },
        data: { status: 'DISMISSED', resolvedAt: expect.any(Date), resolvedBy: 'admin1' }
      }));
    });
  });
});
