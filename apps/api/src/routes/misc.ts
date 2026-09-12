import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@vuzki/database';
import { ApiErrorResponse } from '@vuzki/types';
import { wrap } from './helpers';
import { authenticate, AuthedRequest } from '../middleware/auth';
import { debitCoins } from '../services/wallet';
import { saveFile } from '../services/storage';
import {
  BoostType,
  BoostStatus,
  RewardStatus,
  WalletTransactionType,
  DAILY_LOGIN_REWARD_COINS,
  STREAK_BONUS_COINS,
} from '@vuzki/shared';

export const miscRoutes = Router();

// ============ BOOSTS ============

const BOOST_COSTS: Record<BoostType, number> = {
  THIRTY_MIN: Number(process.env.BOOST_30_MIN || 50),
  ONE_HOUR: Number(process.env.BOOST_1_HOUR || 90),
  THREE_HOUR: Number(process.env.BOOST_3_HOUR || 200),
};

const BOOST_DURATION_MS: Record<BoostType, number> = {
  THIRTY_MIN: 30 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  THREE_HOUR: 3 * 60 * 60 * 1000,
};

// GET /boosts/pricing
miscRoutes.get('/boosts/pricing', authenticate(), wrap(async (_req: AuthedRequest, res) => {
  res.json({
    success: true,
    data: {
      options: [
        { type: BoostType.THIRTY_MIN, costCoins: BOOST_COSTS.THIRTY_MIN, durationMinutes: 30 },
        { type: BoostType.ONE_HOUR, costCoins: BOOST_COSTS.ONE_HOUR, durationMinutes: 60 },
        { type: BoostType.THREE_HOUR, costCoins: BOOST_COSTS.THREE_HOUR, durationMinutes: 180 },
      ],
    },
  });
}));

// POST /boosts
miscRoutes.post('/boosts', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const { type, requestId } = z.object({
    type: z.enum([BoostType.THIRTY_MIN, BoostType.ONE_HOUR, BoostType.THREE_HOUR]),
    requestId: z.string().max(64).optional(),
  }).parse(req.body);

  const cost = BOOST_COSTS[type];
  // Idempotency key: a client-supplied requestId lets a retried purchase be a
  // no-op instead of a double charge. Generate one server-side if not provided.
  const idempotencyKey = `BOOST:${me}:${type}:${requestId || Date.now()}`;
  const referenceId = `boost_${type}_${requestId || Date.now()}`;

  // Debit AND create the boost in a single transaction so a crash can never
  // leave a user charged with no boost (or a boost with no charge).
  const boost = await prisma.$transaction(async (tx) => {
    await debitCoins(me, cost, WalletTransactionType.BOOST, { boostType: type }, referenceId, idempotencyKey, tx);
    return tx.boost.create({
      data: {
        userId: me,
        type,
        status: BoostStatus.ACTIVE,
        costCoins: cost,
        expiresAt: new Date(Date.now() + BOOST_DURATION_MS[type]),
      },
    });
  });

  res.status(201).json({
    success: true,
    data: { boost: { id: boost.id, type, status: boost.status, expiresAt: boost.expiresAt } },
  });
}));

// GET /boosts/active
miscRoutes.get('/boosts/active', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const now = new Date();
  const active = await prisma.boost.findMany({
    where: { userId: req.auth!.userId, status: BoostStatus.ACTIVE, expiresAt: { gt: now } },
  });
  res.json({ success: true, data: { items: active.map((b) => ({ id: b.id, type: b.type, expiresAt: b.expiresAt })) } });
}));

// ============ SUPER LIKES ============

// GET /super-likes/status
miscRoutes.get('/super-likes/status', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const user = await prisma.user.findUnique({ where: { id: me } });
  const pool = superLikePoolFor(user?.premiumTier || 'FREE');

  // Total super likes used today (covers both free-pool and purchased uses,
  // since a super-like is a super-like regardless of source).
  const usedToday = await prisma.superLike.count({
    where: { senderId: me, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
  });

  // Purchased bundle inventory: sum of all SUPER_LIKE_PURCHASE quantities ever
  // purchased minus the free pool entitlement already consumed. This ensures a
  // user who buys a bundle actually receives usable Super Likes.
  const purchasedAgg = await prisma.walletTransaction.aggregate({
    where: { userId: me, type: WalletTransactionType.SUPER_LIKE_PURCHASE, status: 'COMPLETED' },
    _sum: { amount: true },
  });
  // Each purchased super-like costs SUPER_LIKE_COST coins (negative ledger entries).
  const purchasedTotal = Math.floor(Math.abs(purchasedAgg._sum.amount ?? 0) / Number(process.env.SUPER_LIKE_COST || 30));

  const freeRemaining = Math.max(0, pool - usedToday);
  // Purchased uses = (total super-likes used today consumed after the free pool).
  const purchasedUsed = Math.max(0, usedToday - pool);
  const purchasedRemaining = Math.max(0, purchasedTotal - purchasedUsed);

  res.json({
    success: true,
    data: {
      pool,
      usedToday,
      remaining: freeRemaining + purchasedRemaining,
      freeRemaining,
      purchasedRemaining,
      costCoins: Number(process.env.SUPER_LIKE_COST || 30),
    },
  });
}));

// POST /super-likes/purchase
miscRoutes.post('/super-likes/purchase', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const { quantity, requestId } = z.object({
    quantity: z.number().int().min(1).max(50),
    requestId: z.string().max(64).optional(),
  }).parse(req.body);
  const cost = (Number(process.env.SUPER_LIKE_COST || 30)) * quantity;
  // Atomic debit with idempotency key (client requestId) so a retry can never
  // charge twice for the same bundle purchase.
  const idempotencyKey = `SLBUNDLE:${me}:${requestId || Date.now()}`;
  await debitCoins(me, cost, WalletTransactionType.SUPER_LIKE_PURCHASE, { quantity, purpose: 'super_like_bundle' }, idempotencyKey, idempotencyKey);
  res.json({ success: true, data: { quantity, costCoins: cost } });
}));

function superLikePoolFor(tier: string): number {
  switch (tier) {
    case 'VIP': return 20;
    case 'PREMIUM': return 10;
    case 'PLUS': return 5;
    default: return 1;
  }
}

// ============ DAILY REWARDS ============

const DAILY_REWARD_SCHEDULE = [5, 10, 15, 20, 25, 30, 50];

// GET /rewards/daily
miscRoutes.get('/rewards/daily', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const user = await prisma.user.findUnique({ where: { id: me } });
  const startToday = new Date(new Date().setHours(0, 0, 0, 0));

  const lastClaim = await prisma.reward.findFirst({
    where: { userId: me, type: 'DAILY' },
    orderBy: { claimedAt: 'desc' },
  });

  const claimedToday = await prisma.reward.count({
    where: { userId: me, type: 'DAILY', claimedAt: { gte: startToday } },
  });

  res.json({
    success: true,
    data: {
      streak: user?.dailyStreak ?? 0,
      claimedToday: claimedToday > 0,
      nextReward: DAILY_REWARD_SCHEDULE[Math.min(user?.dailyStreak ?? 0, DAILY_REWARD_SCHEDULE.length - 1)],
      schedule: DAILY_REWARD_SCHEDULE,
    },
  });
}));

// POST /rewards/daily/claim
miscRoutes.post('/rewards/daily/claim', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const startToday = new Date(new Date().setHours(0, 0, 0, 0));

  // The whole claim runs in ONE transaction with the user row locked so two
  // concurrent claim requests can never both pass the "already claimed" check
  // and double-credit. This also serializes the streak computation. A DB-level
  // unique (userId, day) constraint is a second line of defense.
  const result = await prisma.$transaction(async (tx) => {
    // Lock the user row for this claim (serialize concurrent claims).
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${me} FOR UPDATE`;

    const claimedToday = await tx.reward.count({ where: { userId: me, type: 'DAILY', claimedAt: { gte: startToday } } });
    if (claimedToday > 0) throw new ApiErrorResponse(400, 'ALREADY_CLAIMED', 'Daily reward already claimed');

    const user = await tx.user.findUnique({ where: { id: me } });
    const yesterday = new Date(startToday);
    yesterday.setDate(yesterday.getDate() - 1);

    const claimedYesterday = await tx.reward.count({ where: { userId: me, type: 'DAILY', claimedAt: { gte: yesterday, lt: startToday } } });

    let streak = user?.dailyStreak ?? 0;
    streak = claimedYesterday > 0 ? streak + 1 : 1;

    const rewardCoins = DAILY_REWARD_SCHEDULE[Math.min(streak - 1, DAILY_REWARD_SCHEDULE.length - 1)];

    const wallet = await tx.wallet.upsert({
      where: { userId: me },
      update: { balance: { increment: rewardCoins } },
      create: { userId: me, balance: rewardCoins, currency: 'INR' },
    });
    await tx.walletTransaction.create({
      data: { userId: me, amount: rewardCoins, currency: 'INR', type: WalletTransactionType.REWARD, status: 'COMPLETED', balanceAfter: wallet.balance, metadata: { reward: 'daily', streak }, idempotencyKey: `REWARD:DAILY:${me}:${startToday.toISOString().slice(0, 10)}` },
    });
    await tx.reward.create({
      data: { userId: me, type: 'DAILY', coins: rewardCoins, status: 'CLAIMED', day: streak, claimedAt: new Date() },
    }).catch((e: any) => {
      // Unique (userId, day) violated => already claimed by a concurrent request.
      throw new ApiErrorResponse(409, 'ALREADY_CLAIMED', 'Daily reward already claimed');
    });
    await tx.user.update({ where: { id: me }, data: { dailyStreak: streak, lastDailyReward: new Date() } });
    return { coins: rewardCoins, streak };
  });

  res.json({ success: true, data: { claimed: true, coins: result.coins, streak: result.streak } });
}));

// ============ UPLOAD ============

// POST /upload
miscRoutes.post('/upload', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const { type, filename, mime, data } = z.object({
    type: z.string(),
    filename: z.string(),
    mime: z.string(),
    data: z.string(), // base64
  }).parse(req.body);

  if (!data) throw new ApiErrorResponse(400, 'NO_DATA', 'No file data');

  const buffer = Buffer.from(data, 'base64');
  const result = await saveFile({ type, mime, originalName: filename, buffer, userId: req.auth!.userId });
  res.status(201).json({ success: true, data: { url: result.url, key: result.key } });
}));
