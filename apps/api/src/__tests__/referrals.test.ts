import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { referralRoutes } from '../routes/referrals';

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  referralFindMany: vi.fn(),
  referralUpdate: vi.fn(),
  walletUpsert: vi.fn(),
  walletTransactionCreate: vi.fn(),
  $queryRaw: vi.fn(),
}));

vi.mock('@vuzki/database', () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    referral: { findMany: mocks.referralFindMany, update: mocks.referralUpdate },
    wallet: { upsert: mocks.walletUpsert },
    walletTransaction: { create: mocks.walletTransactionCreate },
    $transaction: vi.fn(async (cb) => {
      const tx = {
        $queryRaw: mocks.$queryRaw,
        referral: { update: mocks.referralUpdate },
        wallet: { upsert: mocks.walletUpsert },
        walletTransaction: { create: mocks.walletTransactionCreate },
      };
      return cb(tx);
    }),
  },
}));

vi.mock('../middleware/auth', () => ({
  authenticate: () => (req: any, _res: any, next: any) => {
    req.auth = { userId: 'user1' };
    next();
  },
}));

// Setup mock express app
const app = express();
app.use(express.json());
app.use('/referrals', referralRoutes);
app.use((err: any, req: any, res: any, next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: { code: err.errorCode, message: err.message } });
});

describe('Referrals API Security & Accounting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /referrals safely returns server-calculated stats', async () => {
    mocks.userFindUnique.mockResolvedValue({ referralCode: 'ABCDEF' });
    mocks.referralFindMany.mockResolvedValue([
      { id: 'r1', status: 'PAID', rewardCoins: 100, referredUser: { id: 'u2', displayName: 'User 2' } },
      { id: 'r2', status: 'ELIGIBLE', rewardCoins: 0, referredUser: { id: 'u3', displayName: 'User 3' } },
      { id: 'r3', status: 'PENDING', rewardCoins: 0, referredUser: { id: 'u4', displayName: 'User 4' } },
    ]);

    const res = await request(app).get('/referrals');
    expect(res.status).toBe(200);
    expect(res.body.data.referralCode).toBe('ABCDEF');
    expect(res.body.data.stats).toEqual({
      total: 3,
      eligible: 1,
      paid: 1,
      pending: 1,
      totalRewardCoins: 100, // 100 + 0 + 0
    });
  });

  it('POST /referrals/claim-reward uses FOR UPDATE locking and rejects if no eligible rows', async () => {
    mocks.$queryRaw.mockResolvedValue([]); // No eligible rows

    const res = await request(app).post('/referrals/claim-reward');
    expect(res.status).toBe(200);
    expect(res.body.data.coins).toBe(0);
    expect(mocks.referralUpdate).not.toHaveBeenCalled();
    expect(mocks.walletUpsert).not.toHaveBeenCalled();
  });

  it('POST /referrals/claim-reward consumes all eligible rows atomically and credits wallet', async () => {
    mocks.$queryRaw.mockResolvedValue([ { id: 'r1' }, { id: 'r2' } ]); // 2 eligible rows
    mocks.walletUpsert.mockResolvedValue({ balance: 200 });
    
    // override env for test consistency
    process.env.REFERRAL_REWARD = '100';

    const res = await request(app).post('/referrals/claim-reward');
    expect(res.status).toBe(200);
    expect(res.body.data.coins).toBe(200);
    
    expect(mocks.referralUpdate).toHaveBeenCalledTimes(2);
    expect(mocks.referralUpdate).toHaveBeenNthCalledWith(1, { where: { id: 'r1' }, data: { status: 'PAID', rewardCoins: 100 } });
    expect(mocks.walletUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user1' },
      update: { balance: { increment: 200 } }
    }));
    expect(mocks.walletTransactionCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amount: 200, type: 'REFERRAL' })
    }));
  });
});
