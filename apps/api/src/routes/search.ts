import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@vuzki/database';
import { wrap, toPublicUser } from './helpers';
import { authenticate, AuthedRequest } from '../middleware/auth';

export const searchRoutes = Router();

// GET /search
searchRoutes.get('/', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const { q, gender, minAge, maxAge, language, interest, isOnline, isVerified, isCreator, page = 1, limit = 20 } = z.object({
    q: z.string().optional(),
    gender: z.string().optional(),
    minAge: z.coerce.number().optional(),
    maxAge: z.coerce.number().optional(),
    language: z.string().optional(),
    interest: z.string().optional(),
    isOnline: z.string().optional(),
    isVerified: z.string().optional(),
    isCreator: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
  }).parse(req.query ?? {});

  const query: Record<string, any> = {
    id: { not: me },
    status: 'ACTIVE',
    deletedAt: null,
  };

  if (q) {
    query.OR = [
      { username: { contains: q, mode: 'insensitive' } },
      { displayName: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (gender && gender !== 'all') query.gender = gender;
  if (isOnline === 'true') query.onlineStatus = true;
  if (isVerified === 'true') query.isVerified = true;
  if (isCreator === 'true') query.isCreator = true;
  if (language) query.languages = { some: { code: language } };
  if (interest) query.interests = { some: { name: interest } };

  const where = query;
  // age filtering done post-query since DOB stored
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, include: { profile: true, creator: true }, orderBy: { lastActiveAt: 'desc' }, skip, take: limit }),
    prisma.user.count({ where }),
  ]);

  let filtered = users;
  if (minAge || maxAge) {
    filtered = users.filter((u) => {
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
