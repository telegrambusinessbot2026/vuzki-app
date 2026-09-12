import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@vuzki/database';
import { ApiErrorResponse } from '@vuzki/types';
import { wrap } from './helpers';
import { authenticate, AuthedRequest } from '../middleware/auth';
import { getEarningsSummary, movePendingToAvailable } from '../services/earnings';
import { CreatorApplicationStatus, KycStatus, CreatorAvailabilityStatus } from '@vuzki/shared';

export const creatorRoutes = Router();

// GET /creators/browse - list available/listener creators
creatorRoutes.get('/browse', authenticate(), wrap(async (_req: AuthedRequest, res) => {
  const creators = await prisma.user.findMany({
    where: { isCreator: true, status: 'ACTIVE' },
    include: { creator: true, profile: true },
    orderBy: { creator: { rating: 'desc' } },
    take: 50,
  });
  const items = creators.map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    isVerified: u.isVerified,
    onlineStatus: u.onlineStatus,
    availability: u.creatorStatus,
    languages: u.profile?.languages ?? [],
    specialties: u.creator?.specialties ?? [],
    rating: u.creator?.rating,
    ratingCount: u.creator?.ratingCount,
    callRateFrom: u.creator?.callRateFrom,
    callRateTo: u.creator?.callRateTo,
  }));
  res.json({ success: true, data: { items } });
}));

// POST /creators/apply
creatorRoutes.post('/apply', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const { reason, experience, verificationType, specialties, callRateFrom, callRateTo, languages } = z.object({
    reason: z.string().max(500).optional(),
    experience: z.string().max(500).optional(),
    verificationType: z.enum(['identity', 'kyc', 'none']).optional(),
    specialties: z.array(z.string()).max(20).optional(),
    callRateFrom: z.number().min(1).optional(),
    callRateTo: z.number().min(1).optional(),
    languages: z.array(z.string()).max(10).optional(),
  }).parse(req.body);

  const existing = await prisma.creatorProfile.findUnique({ where: { userId: me } });
  let profile = existing;
  if (!profile) {
    profile = await prisma.creatorProfile.create({ data: { userId: me } });
  }

  const application = await prisma.creatorApplication.create({
    data: {
      creatorProfileId: profile.id,
      userId: me,
      status: CreatorApplicationStatus.PENDING,
      reason,
      experience,
      verificationType: verificationType ?? 'none',
    },
  });

  await prisma.creatorProfile.update({
    where: { id: profile.id },
    data: {
      specialties: specialties ?? undefined,
      callRateFrom: callRateFrom ?? undefined,
      callRateTo: callRateTo ?? undefined,
      languages: languages ?? undefined,
      status: CreatorApplicationStatus.PENDING,
    },
  });

  res.status(201).json({ success: true, data: { applicationId: application.id, status: application.status } });
}));

// GET /creators/me/status - creator app status + dashboard access
creatorRoutes.get('/me/status', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const profile = await prisma.creatorProfile.findUnique({ where: { userId: me } });
  res.json({
    success: true,
    data: {
      hasProfile: !!profile,
      status: profile?.status ?? null,
      isApproved: profile?.status === CreatorApplicationStatus.APPROVED,
      isCreator: (await prisma.user.findUnique({ where: { id: me } }))?.isCreator ?? false,
      availability: (await prisma.user.findUnique({ where: { id: me } }))?.creatorStatus ?? CreatorAvailabilityStatus.OFFLINE,
      kyciStatus: profile?.kyciStatus ?? KycStatus.NOT_SUBMITTED,
    },
  });
}));

// POST /creators/me/availability
creatorRoutes.post('/me/availability', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const u = await prisma.user.findUnique({ where: { id: me } });
  if (!u?.isCreator) throw new ApiErrorResponse(403, 'NOT_CREATOR', 'Not an approved creator');

  const { status } = z.object({
    status: z.enum([CreatorAvailabilityStatus.AVAILABLE, CreatorAvailabilityStatus.BUSY, CreatorAvailabilityStatus.OFFLINE]),
  }).parse(req.body);

  await prisma.user.update({ where: { id: me }, data: { creatorStatus: status } });
  res.json({ success: true, data: { status } });
}));

// GET /creators/me/dashboard
creatorRoutes.get('/me/dashboard', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const u = await prisma.user.findUnique({ where: { id: me }, include: { creator: true } });
  if (!u?.isCreator || !u.creator) throw new ApiErrorResponse(403, 'NOT_CREATOR', 'Not an approved creator');

  const earnings = await getEarningsSummary(me);

  const [callHistory, gifts] = await Promise.all([
    prisma.call.findMany({
      where: { participants: { some: { userId: me } }, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { caller: true, receiver: true },
    }),
    prisma.giftTransaction.count({ where: { receiverId: me } }),
  ]);

  res.json({
    success: true,
    data: {
      profile: {
        availability: u.creatorStatus,
        status: u.creator.status,
        rating: u.creator.rating,
        ratingCount: u.creator.ratingCount,
        totalMinutes: u.creator.totalMinutes,
        callRateFrom: u.creator.callRateFrom,
        callRateTo: u.creator.callRateTo,
        specialties: u.creator.specialties,
        kyciStatus: u.creator.kyciStatus,
      },
      earnings,
      gifts,
      recentCalls: callHistory.map((c) => ({
        id: c.id,
        type: c.type,
        durationSeconds: c.durationSeconds,
        costCoins: c.costCoins,
        other: { id: (c.callerId === me ? c.receiver : c.caller).id, displayName: (c.callerId === me ? c.receiver : c.caller).displayName, avatarUrl: (c.callerId === me ? c.receiver : c.caller).avatarUrl },
        createdAt: c.createdAt,
      })),
    },
  });
}));

// GET /creators/me/earnings
creatorRoutes.get('/me/earnings', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const profile = await prisma.creatorProfile.findUnique({ where: { userId: me } });
  if (!profile) throw new ApiErrorResponse(403, 'NOT_CREATOR', 'Not a creator');

  const earnings = await getEarningsSummary(me);
  const transactions = await prisma.creatorEarning.findMany({
    where: { creatorId: profile.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({
    success: true,
    data: {
      earnings,
      transactions: transactions.map((t) => ({ id: t.id, type: t.type, amount: t.amount, coins: t.coins, status: t.status, createdAt: t.createdAt, callId: t.callId })),
    },
  });
}));

// POST /creators/me/earnings/claim (move pending -> available)
creatorRoutes.post('/me/earnings/claim', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const profile = await prisma.creatorProfile.findUnique({ where: { userId: me } });
  if (!profile) throw new ApiErrorResponse(403, 'NOT_CREATOR', 'Not a creator');
  const moved = await movePendingToAvailable(profile.id);
  res.json({ success: true, data: { movedToAvailable: moved } });
}));

// POST /creators/me/kyc
creatorRoutes.post('/me/kyc', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const profile = await prisma.creatorProfile.findUnique({ where: { userId: me } });
  if (!profile) throw new ApiErrorResponse(403, 'NOT_CREATOR', 'Not a creator');

  const { fullName, documentType, documentNumber } = z.object({
    fullName: z.string().min(2),
    documentType: z.string(),
    documentNumber: z.string().min(4),
  }).parse(req.body);

  // Store only references; documents themselves go to secure storage via /upload
  await prisma.creatorProfile.update({
    where: { id: profile.id },
    data: { kyciStatus: KycStatus.PENDING, kycDetails: { fullName, documentType, maskedNumber: maskDoc(documentNumber), submittedAt: new Date() } as any },
  });
  res.json({ success: true, data: { kyciStatus: KycStatus.PENDING } });
}));

function maskDoc(v: string) {
  return v.slice(0, 2) + '****' + v.slice(-2);
}
