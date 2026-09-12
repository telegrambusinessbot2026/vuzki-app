import { Router } from 'express';
import { prisma } from '@vuzki/database';
import { wrap } from './helpers';
import { authenticate, AuthedRequest } from '../middleware/auth';
import { config } from '../config';

export const referralRoutes = Router();

// GET /referrals
referralRoutes.get('/', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const user = await prisma.user.findUnique({ where: { id: me } });

  const referrals = await prisma.referral.findMany({
    where: { referrerId: me },
    include: { referredUser: { select: { id: true, displayName: true, avatarUrl: true, createdAt: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const stats = {
    total: referrals.length,
    eligible: referrals.filter((r) => r.status === 'ELIGIBLE').length,
    paid: referrals.filter((r) => r.status === 'PAID').length,
    pending: referrals.filter((r) => r.status === 'PENDING').length,
    totalRewardCoins: referrals.reduce((sum, r) => sum + (r.rewardCoins || 0), 0),
  };

  res.json({
    success: true,
    data: {
      referralCode: user?.referralCode,
      referralLink: `${config.webUrl}/invite/${user?.referralCode}`,
      stats,
      referrals: referrals.map((r) => ({
        id: r.id,
        user: { id: r.referredUser.id, displayName: r.referredUser.displayName, avatarUrl: r.referredUser.avatarUrl },
        status: r.status,
        rewardCoins: r.rewardCoins,
        createdAt: r.createdAt,
      })),
    },
  });
}));

// POST /referrals/claim-reward
referralRoutes.post('/claim-reward', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const rewardCoinsPer = Number(process.env.REFERRAL_REWARD || 50);

  const totalCoins = await prisma.$transaction(async (tx) => {
    // Lock the eligible referral rows FOR UPDATE so two concurrent claims can
    // never both read the same ELIGIBLE set and double-pay. READ COMMITTED
    // would otherwise allow both transactions to see the same rows.
    const eligible = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Referral" WHERE "referrerId" = ${me} AND status = 'ELIGIBLE' FOR UPDATE
    `;
    if (eligible.length === 0) return 0;

    let total = 0;
    for (const r of eligible) {
      total += rewardCoinsPer;
      await tx.referral.update({ where: { id: r.id }, data: { status: 'PAID', rewardCoins: rewardCoinsPer } });
    }
    const wallet = await tx.wallet.upsert({
      where: { userId: me },
      update: { balance: { increment: total } },
      create: { userId: me, balance: total, currency: 'INR' },
    });
    await tx.walletTransaction.create({
      data: { userId: me, amount: total, currency: 'INR', type: 'REFERRAL', status: 'COMPLETED', balanceAfter: wallet.balance, idempotencyKey: `REFBLOCK:${me}:${Date.now()}` },
    });
    return total;
  });

  res.json({ success: true, data: { claimed: true, coins: totalCoins } });
}));
