import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@vuzki/database';
import { ApiErrorResponse } from '@vuzki/types';
import { ageFromDateOfBirth, isAdult, sanitizeProfilePreference, validateUrl } from '@vuzki/utils';
import { wrap, toPublicUser, toSelfUser } from './helpers';
import { authenticate, AuthedRequest } from '../middleware/auth';
import { AccountStatus, OnboardingStep, WalletTransactionType } from '@vuzki/shared';
import { debitCoins } from '../services/wallet';

export const userRoutes = Router();

// GET /users/:id - public profile
userRoutes.get('/:id', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { profile: true, creator: true, preferences: true },
  });
  if (!user || user.deletedAt) throw new ApiErrorResponse(404, 'USER_NOT_FOUND', 'User not found');

  const dto = toPublicUser(user);
  const isOwn = user.id === req.auth!.userId;
  // only show creator rating/public bits
  res.json({ success: true, data: { user: { ...dto, isOwn } } });
}));

// GET /users/me/profile
userRoutes.get('/me/profile', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    include: {
      wallet: true,
      preferences: true,
      creator: true,
      subscriptions: { where: { status: 'ACTIVE' } },
      _count: { select: { likesReceived: true, matchesA: true, matchesB: true } },
    },
  });
  if (!user) throw new ApiErrorResponse(404, 'USER_NOT_FOUND', 'User not found');
  const dto = toSelfUser(user);
  res.json({
    success: true,
    data: {
      user: {
        ...dto,
        stats: {
          likesReceived: user._count.likesReceived,
          matches: user._count.matchesA + user._count.matchesB,
        },
      },
    },
  });
}));

// PUT /users/me/profile - update profile
const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(40).optional(),
  username: z.string().regex(/^[a-zA-Z0-9_.]{3,20}$/).optional(),
  bio: z.string().max(300).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  dateOfBirth: z.string().datetime().optional(),
  countryCode: z.string().max(3).optional(),
  region: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  interests: z.array(z.string()).max(20).optional(),
  languages: z.array(z.string()).max(10).optional(),
  onboardingStep: z.enum(['NONE', 'INTERESTS', 'LANGUAGES', 'PROFILE', 'COMPLETE']).optional(),
  preferences: z.object({
    ageRangeFrom: z.number().min(18).optional(),
    ageRangeTo: z.number().max(99).optional(),
    genderPreference: z.enum(['all', 'male', 'female', 'other']).optional(),
    maxDistanceKm: z.number().min(1).max(5000).optional(),
    showOnlineStatus: z.boolean().optional(),
    discoveryEnabled: z.boolean().optional(),
    publicProfileEnabled: z.boolean().optional(),
    onlinePreference: z.boolean().optional(),
    verifiedPreference: z.boolean().optional(),
  }).optional(),
});

userRoutes.put('/me/profile', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const body = updateProfileSchema.parse(req.body);
  const userId = req.auth!.userId;

  let dob: Date | undefined;
  if (body.dateOfBirth) {
    dob = new Date(body.dateOfBirth);
    if (!isAdult(dob)) {
      throw new ApiErrorResponse(403, 'MINOR_NOT_ALLOWED', 'VUZKI is for adults aged 18 and above');
    }
  }

  if (body.username) {
    const existing = await prisma.user.findUnique({ where: { username: body.username } });
    if (existing && existing.id !== userId) {
      throw new ApiErrorResponse(409, 'USERNAME_TAKEN', 'Username already taken');
    }
  }

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        displayName: body.displayName,
        username: body.username,
        bio: body.bio,
        gender: body.gender,
        dateOfBirth: dob,
        countryCode: body.countryCode,
        region: body.region,
        avatarUrl: body.avatarUrl,
        bannerUrl: body.bannerUrl,
        onboardingStep: body.onboardingStep,
      },
    });

    if (body.interests) {
      await tx.profileInterest.deleteMany({ where: { userId } });
      await tx.profileInterest.createMany({
        data: body.interests.slice(0, 20).map((name) => ({ userId, name })),
        skipDuplicates: true,
      });
    }
    if (body.languages) {
      await tx.profileLanguage.deleteMany({ where: { userId } });
      await tx.profileLanguage.createMany({
        data: body.languages.slice(0, 10).map((code) => ({ userId, code })),
        skipDuplicates: true,
      });
    }
    await tx.profile.upsert({
      where: { userId },
      update: {
        interests: body.interests ?? undefined,
        languages: body.languages ?? undefined,
      },
      create: { userId, interests: body.interests ?? [], languages: body.languages ?? [] },
    });
    if (body.preferences) {
      await tx.profilePreferences.upsert({
        where: { userId },
        update: { ...body.preferences },
        create: { userId, ...body.preferences },
      });
    }
    return updated;
  });

  const full = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true, preferences: true, subscriptions: { where: { status: 'ACTIVE' } } },
  });
  res.json({ success: true, data: { user: toSelfUser(full), onboardingStep: full!.onboardingStep } });
}));

// POST /users/me/location - store approximate location (never exposed exact)
userRoutes.post('/me/location', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const { latitude, longitude } = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).parse(req.body);
  await prisma.user.update({
    where: { id: req.auth!.userId },
    data: { latitude, longitude, locationUpdatedAt: new Date() },
  });
  res.json({ success: true });
}));

// POST /users/:id/super-like (legacy convenience)
userRoutes.post('/:id/super-like', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const otherId = req.params.id;
  const SUPER_LIKE_COST = Number(process.env.SUPER_LIKE_COST || 30);

  // Atomic debit with idempotency keyed on (sender, receiver): prevents both a
  // race driving the balance negative and a double-charge on retry.
  await prisma.$transaction(async (tx) => {
    await debitCoins(
      me,
      SUPER_LIKE_COST,
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
  res.json({ success: true });
}));

// PUT /users/:id/block
userRoutes.put('/:id/block', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const otherId = req.params.id;
  if (me === otherId) throw new ApiErrorResponse(400, 'BAD_REQUEST', 'Cannot block yourself');
  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: me, blockedId: otherId } },
    update: {},
    create: { blockerId: me, blockedId: otherId, reason: req.body?.reason },
  });
  res.json({ success: true });
}));

// DELETE /users/:id/block
userRoutes.delete('/:id/block', authenticate(), wrap(async (req: AuthedRequest, res) => {
  await prisma.block.deleteMany({
    where: { blockerId: req.auth!.userId, blockedId: req.params.id },
  });
  res.json({ success: true });
}));

// GET /users/me/blocked
userRoutes.get('/me/blocked', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const blocks = await prisma.block.findMany({
    where: { blockerId: req.auth!.userId },
    include: { blocked: true },
  });
  res.json({ success: true, data: { blocked: blocks.map((b) => toPublicUser(b.blocked)) } });
}));

// PUT /users/me/online
userRoutes.put('/me/online', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const { online } = z.object({ online: z.boolean() }).parse(req.body);
  await prisma.user.update({
    where: { id: req.auth!.userId },
    data: { onlineStatus: online, lastActiveAt: new Date() },
  });
  res.json({ success: true });
}));
