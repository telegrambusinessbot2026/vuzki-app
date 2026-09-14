import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@vuzki/database';
import { wrap, toPublicUser } from './helpers';
import { authenticate, AuthedRequest } from '../middleware/auth';
import { normalizeGender, oppositeOf, isStrictlyOppositeGender } from '../services/matching';

export const searchRoutes = Router();

const NEW_USER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // "New" = registered within the last 7 days

// GET /search
searchRoutes.get('/', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const { q, minAge, maxAge, language, interest, isOnline, isVerified, isCreator, isNew, page = 1, limit = 20 } = z.object({
    q: z.string().optional(),
    gender: z.string().optional(),
    minAge: z.coerce.number().optional(),
    maxAge: z.coerce.number().optional(),
    language: z.string().optional(),
    interest: z.string().optional(),
    isOnline: z.string().optional(),
    isVerified: z.string().optional(),
    isCreator: z.string().optional(),
    isNew: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
  }).parse(req.query ?? {});

  // HARD RULE: Search is a candidate-selection surface, so it only surfaces the
  // strict opposite gender of the requester (MALE <-> FEMALE). A requester
  // without a known gender gets no candidates, and any client-supplied gender
  // filter cannot override the enforced policy.
  const meUser = await prisma.user.findUnique({
    where: { id: me },
    select: { gender: true },
  });
  const meGender = normalizeGender(meUser?.gender);
  if (!meGender) {
    return res.json({ success: true, data: { items: [], total: 0, hasMore: false } });
  }

  const query: Record<string, any> = {
    id: { not: me },
    status: 'ACTIVE',
    deletedAt: null,
    gender: oppositeOf(meGender),
  };

  if (q) {
    query.OR = [
      { username: { contains: q, mode: 'insensitive' } },
      { displayName: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (isOnline === 'true') query.onlineStatus = true;
  if (isVerified === 'true') query.isVerified = true;
  if (isCreator === 'true') query.isCreator = true;
  if (isNew === 'true') query.createdAt = { gte: new Date(Date.now() - NEW_USER_WINDOW_MS) };
  if (language) query.languages = { some: { code: language } };
  if (interest) query.interests = { some: { name: interest } };

  const where = query;
  // age filtering done post-query since DOB stored
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, include: { profile: true, creator: true }, orderBy: { lastActiveAt: 'desc' }, skip, take: limit }),
    prisma.user.count({ where }),
  ]);

  // Defense in depth: never surface a non-opposite-gender candidate even if the
  // DB-side filter above was bypassed or drifted.
  let filtered = users.filter((u) => isStrictlyOppositeGender(meUser?.gender, u.gender));
  if (minAge || maxAge) {
    filtered = filtered.filter((u) => {
      if (!u.dateOfBirth) return true;
      const age = ageOf(u.dateOfBirth);
      if (minAge && age < minAge) return false;
      if (maxAge && age > maxAge) return false;
      return true;
    });
  }

  res.json({
    success: true,
    data: {
      items: filtered.map((u) => ({ ...toPublicUser(u), rating: u.creator?.rating })),
      total,
      hasMore: skip + filtered.length < total,
    },
  });
}));

function ageOf(d: Date): number {
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}
