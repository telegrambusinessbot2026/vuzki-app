import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@vuzki/database';
import { ApiErrorResponse } from '@vuzki/types';
import { wrap, toPublicUser } from './helpers';
import { authenticate, AuthedRequest } from '../middleware/auth';
import { findCandidates, normalizeGender, oppositeOf } from '../services/matching';
import { notify } from '../services/notification';
import { isBlockedPair } from '../services/ai-moderation';
import { WalletTransactionType, NotificationType } from '@vuzki/shared';
import { allow, isRateLimited } from '../realtime/ratelimit';
import { debitCoins } from '../services/wallet';

export const discoveryRoutes = Router();

// GET /discovery/feed
discoveryRoutes.get('/feed', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const { limit, cursor, mode } = z.object({
    limit: z.coerce.number().min(1).max(50).default(20),
    cursor: z.string().optional(),
    mode: z.string().optional(),
  }).parse(req.query);

  const filters = {
    gender: (req.query.gender as string) || undefined,
    isCreator: req.query.isCreator === 'true',
    isVerifiedOnly: req.query.verified === 'true',
    isPremiumOnly: req.query.premium === 'true',
    language: (req.query.language as string) || undefined,
    interest: (req.query.interest as string) || undefined,
    country: (req.query.country as string) || undefined,
  };

  const candidates = await findCandidates({ userId: req.auth!.userId, limit, filters, mode });
  const items = candidates.map((c) => ({
    ...toPublicUser(c.user),
    compatibilityScore: c.score,
    ...(c.score >= 80 ? { matchLabel: `${c.score}% Match` } : {}),
  }));

  res.json({
    success: true,
    data: {
      items,
      nextCursor: items.length ? items[items.length - 1].id : null,
      hasMore: items.length >= (limit || 20),
      total: items.length,
    },
  });
}));

// GET /discovery/talk-now - find available people now
discoveryRoutes.get('/talk-now', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    select: { id: true, gender: true },
  });
  if (!me) return res.json({ success: true, data: { items: [] } });
  const meGender = normalizeGender(me.gender);
  if (!meGender) return res.json({ success: true, data: { items: [] } });

  const available = await prisma.user.findMany({
    where: {
      id: { not: req.auth!.userId },
      status: 'ACTIVE',
      onboardingStep: 'COMPLETE',
      gender: oppositeOf(meGender),
      OR: [{ creatorStatus: { in: ['AVAILABLE', 'BUSY'] } }, { onlineStatus: true }],
    },
    take: 20,
    include: { profile: true, creator: true },
  });

  const items = available.map((u) => {
    const rate = u.creator?.callRateFrom ?? (u.isCreator ? '10-20' : '8-15');
    return {
      ...toPublicUser(u),
      estimatedCost: u.creator && u.creator.callRateFrom ? { from: u.creator.callRateFrom, to: u.creator.callRateTo } : { from: 8, to: 15 },
      audioAvailable: true,
      videoAvailable: true,
      rating: u.creator?.rating,
    };
  });

  res.json({ success: true, data: { items } });
}));

// POST /discovery/like
const likeSchema = z.object({
  userId: z.string(),
  type: z.enum(['like', 'super_like']).default('like'),
});

discoveryRoutes.post('/like', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const { userId: otherId, type } = likeSchema.parse(req.body);
  const me = req.auth!.userId;
  const rule = type === 'super_like' ? 'super_like' : 'like';
  const limit = await allow(rule, me);
  if (isRateLimited(limit)) throw new ApiErrorResponse(429, 'RATE_LIMITED', 'Too many likes, try again shortly');

  if (me === otherId) throw new ApiErrorResponse(400, 'BAD_REQUEST', 'Cannot like yourself');
  if (await isBlockedPair(me, otherId)) throw new ApiErrorResponse(403, 'BLOCKED', 'Cannot like this user');

  const other = await prisma.user.findUnique({ where: { id: otherId } });
  if (!other) throw new ApiErrorResponse(404, 'USER_NOT_FOUND', 'User not found');

  let isMatch = false;
  let conversationId: string | undefined;

  if (type === 'super_like') {
    const cost = Number(process.env.SUPER_LIKE_COST || 30);
    // Atomic debit with idempotency keyed on (sender, receiver): prevents both
    // a race that drives the balance negative and a double-charge on retry.
    // debitCoins does the balance check + decrement atomically inside the tx.
    await prisma.$transaction(async (tx) => {
      await debitCoins(
        me,
        cost,
        WalletTransactionType.SUPER_LIKE,
        { otherId },
        `SL:${me}:${otherId}`,
        `SUPERLIKE:${me}:${otherId}`,
        tx
      );
      await tx.superLike.upsert({
        where: { senderId_receiverId: { senderId: me, receiverId: otherId } },
        update: {},
        create: { senderId: me, receiverId: otherId },
      });
    });
  }

  const like = await prisma.like.upsert({
    where: { senderId_receiverId: { senderId: me, receiverId: otherId } },
    update: {},
    create: { senderId: me, receiverId: otherId },
  });

  // Check mutual: has the other user liked me?
  const reverseLike = await prisma.like.findUnique({
    where: { senderId_receiverId: { senderId: otherId, receiverId: me } },
  });

  if (reverseLike) {
    isMatch = true;
    const [a, b] = [me, otherId].sort();
    const conv = await prisma.conversation.upsert({
      where: { userAId_userBId: { userAId: a, userBId: b } },
      update: {},
      create: {
        userAId: a,
        userBId: b,
      },
    });
    await prisma.match.create({
      data: { userAId: a, userBId: b },
    }).catch(() => {});
    conversationId = conv.id;
  }

  const typeLabel = type === 'super_like' ? 'Super Liked' : 'Liked';
  notify({
    userId: otherId,
    type: NotificationType.LIKE,
    title: type === 'super_like' ? 'Super Like! 💜' : 'New Like',
    body: isMatch ? 'It\'s a match! Start chatting now.' : `Someone ${typeLabel.toLowerCase()} you`,
    data: { userId: me, isMatch, conversationId },
  }).catch(() => {});

  res.json({ success: true, data: { liked: true, isMatch, conversationId } });
}));

// POST /discovery/pass
discoveryRoutes.post('/pass', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const { userId: otherId } = z.object({ userId: z.string() }).parse(req.body);
  // passes are implicit; no storage needed, just acknowledge
  res.json({ success: true, data: { passed: true } });
}));

// GET /discovery/likes-received
discoveryRoutes.get('/likes-received', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const likes = await prisma.like.findMany({
    where: { receiverId: req.auth!.userId },
    include: { sender: { include: { profile: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const items = likes.map((l) => ({ ...toPublicUser(l.sender), likedAt: l.createdAt }));
  res.json({ success: true, data: { items } });
}));

// GET /discovery/matches
discoveryRoutes.get('/matches', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: me }, { userBId: me }] },
    include: {
      userA: { include: { profile: true } },
      userB: { include: { profile: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const items = matches.map((m) => {
    const other = m.userAId === me ? m.userB : m.userA;
    return { ...toPublicUser(other), matchScore: m.compatibilityScore, matchedAt: m.createdAt };
  });
  res.json({ success: true, data: { items } });
}));
