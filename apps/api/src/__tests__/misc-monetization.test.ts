import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { miscRoutes } from '../routes/misc';
import { BoostType, BoostStatus } from '@vuzki/shared';

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  rewardFindFirst: vi.fn(),
  rewardCount: vi.fn(),
  rewardCreate: vi.fn(),
  walletFindUnique: vi.fn(),
  walletUpsert: vi.fn(),
  walletUpdate: vi.fn(),
  walletUpdateMany: vi.fn(),
  walletTransactionFindUnique: vi.fn(),
  walletTransactionCreate: vi.fn(),
  walletTransactionAggregate: vi.fn(),
  boostCreate: vi.fn(),
  boostFindMany: vi.fn(),
  superLikeCount: vi.fn(),
  $queryRaw: vi.fn(),
}));

vi.mock('@vuzki/database', () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique, update: mocks.userUpdate },
    reward: { findFirst: mocks.rewardFindFirst, count: mocks.rewardCount, create: mocks.rewardCreate },
    wallet: { findUnique: mocks.walletFindUnique, upsert: mocks.walletUpsert, update: mocks.walletUpdate, updateMany: mocks.walletUpdateMany },
    walletTransaction: { findUnique: mocks.walletTransactionFindUnique, create: mocks.walletTransactionCreate, aggregate: mocks.walletTransactionAggregate },
    boost: { create: mocks.boostCreate, findMany: mocks.boostFindMany },
    superLike: { count: mocks.superLikeCount },
    $transaction: vi.fn(async (cb) => {
      const tx = {
        $queryRaw: mocks.$queryRaw,
        user: { findUnique: mocks.userFindUnique, update: mocks.userUpdate },
        reward: { count: mocks.rewardCount, create: mocks.rewardCreate },
        wallet: { findUnique: mocks.walletFindUnique, upsert: mocks.walletUpsert, update: mocks.walletUpdate, updateMany: mocks.walletUpdateMany },
        walletTransaction: { findUnique: mocks.walletTransactionFindUnique, create: mocks.walletTransactionCreate },
        boost: { create: mocks.boostCreate },
      };
      return cb(tx);
    }),
  },
}));

vi.mock('../middleware/auth', () => ({
  authenticate: () => (req: Request, res: Response, next: NextFunction) => {
    (req as any).auth = { userId: 'u1' };
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/', miscRoutes);
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  res.status(err.status || 500).json({ error: { code: err.code || 'INTERNAL_ERROR', status: err.status } });
});

describe('Monetization & Engagement Tests (Phase 28)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('A. DAILY REWARDS', () => {
    it('returns daily reward schedule and status', async () => {
      mocks.userFindUnique.mockResolvedValue({ id: 'u1', dailyStreak: 2 });
      mocks.rewardFindFirst.mockResolvedValue({ claimedAt: new Date(Date.now() - 86400000) });
      mocks.rewardCount.mockResolvedValue(0); 

      const res = await request(app).get('/rewards/daily');
      expect(res.status).toBe(200);
      expect(res.body.data.streak).toBe(2);
      expect(res.body.data.claimedToday).toBe(false);
      expect(res.body.data.schedule).toEqual([5, 10, 15, 20, 25, 30, 50]);
    });

    it('successfully claims daily reward and increments streak', async () => {
      mocks.rewardCount.mockResolvedValueOnce(0);
      mocks.userFindUnique.mockResolvedValue({ id: 'u1', dailyStreak: 2 });
      mocks.rewardCount.mockResolvedValueOnce(1);
      
      mocks.walletUpsert.mockResolvedValue({ balance: 115 });
      mocks.rewardCreate.mockResolvedValue({});
      mocks.userUpdate.mockResolvedValue({});

      const res = await request(app).post('/rewards/daily/claim');
      expect(res.status).toBe(200);
      
      expect(mocks.$queryRaw).toHaveBeenCalled();
      expect(mocks.walletUpsert).toHaveBeenCalledWith(expect.objectContaining({
        update: { balance: { increment: 15 } }
      }));
      expect(mocks.walletTransactionCreate).toHaveBeenCalled();
      expect(res.body.data.streak).toBe(3);
    });

    it('rejects duplicate claims on the same day', async () => {
      mocks.rewardCount.mockResolvedValueOnce(1);
      const res = await request(app).post('/rewards/daily/claim');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ALREADY_CLAIMED');
      expect(mocks.walletUpsert).not.toHaveBeenCalled();
    });
  });

  describe('B. BOOSTS', () => {
    it('returns configured pricing', async () => {
      const res = await request(app).get('/boosts/pricing');
      expect(res.status).toBe(200);
      expect(res.body.data.options).toBeDefined();
    });

    it('successfully purchases a boost and debits wallet', async () => {
      mocks.walletTransactionFindUnique.mockResolvedValue(null);
      mocks.walletUpdateMany.mockResolvedValue({ count: 1 }); // purchase success
      mocks.walletFindUnique.mockResolvedValue({ balance: 450 });
      mocks.boostCreate.mockResolvedValue({ id: 'b1', type: BoostType.THIRTY_MIN, status: BoostStatus.ACTIVE, expiresAt: new Date(Date.now() + 1800000) });

      const res = await request(app).post('/boosts').send({ type: BoostType.THIRTY_MIN });
      expect(res.status).toBe(201);
      expect(mocks.walletUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: { balance: { decrement: 50 } } // THIRTY_MIN cost
      }));
      expect(mocks.boostCreate).toHaveBeenCalled();
      expect(res.body.data.boost.status).toBe(BoostStatus.ACTIVE);
    });

    it('rejects purchase with insufficient balance', async () => {
      mocks.walletTransactionFindUnique.mockResolvedValue(null);
      mocks.walletUpdateMany.mockResolvedValue({ count: 0 }); // insufficient balance
      mocks.walletFindUnique.mockResolvedValue({ balance: 10 });
      
      const res = await request(app).post('/boosts').send({ type: BoostType.THIRTY_MIN });
      expect(res.status).toBe(402);
      expect(res.body.error.code).toBe('INSUFFICIENT_BALANCE');
      expect(mocks.boostCreate).not.toHaveBeenCalled();
    });

    it('returns active boosts', async () => {
      mocks.boostFindMany.mockResolvedValue([{ id: 'b1', type: BoostType.THIRTY_MIN, expiresAt: new Date() }]);
      const res = await request(app).get('/boosts/active');
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
    });
  });

  describe('C. SUPER LIKES', () => {
    it('calculates free daily pool and purchased bundle aggregation', async () => {
      mocks.userFindUnique.mockResolvedValue({ id: 'u1', premiumTier: 'PLUS' });
      mocks.superLikeCount.mockResolvedValue(2);
      mocks.walletTransactionAggregate.mockResolvedValue({ _sum: { amount: -60 } });

      const res = await request(app).get('/super-likes/status');
      expect(res.status).toBe(200);
      expect(res.body.data.pool).toBe(5);
      expect(res.body.data.usedToday).toBe(2);
      expect(res.body.data.remaining).toBe(5); 
    });

    it('successfully purchases a super like bundle', async () => {
      mocks.walletTransactionFindUnique.mockResolvedValue(null);
      mocks.walletUpdateMany.mockResolvedValue({ count: 1 });
      mocks.walletFindUnique.mockResolvedValue({ balance: 410 });

      const res = await request(app).post('/super-likes/purchase').send({ quantity: 3 });
      expect(res.status).toBe(200);
      expect(mocks.walletUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: { balance: { decrement: 90 } } // 3 * 30
      }));
    });
    
    it('rejects super like purchase with insufficient balance', async () => {
      mocks.walletTransactionFindUnique.mockResolvedValue(null);
      mocks.walletUpdateMany.mockResolvedValue({ count: 0 });
      mocks.walletFindUnique.mockResolvedValue({ balance: 10 });
      
      const res = await request(app).post('/super-likes/purchase').send({ quantity: 3 });
      expect(res.status).toBe(402);
      expect(res.body.error.code).toBe('INSUFFICIENT_BALANCE');
    });
  });
});
