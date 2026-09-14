import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn();
  const userFindMany = vi.fn();
  return { userFindUnique, userFindMany };
});

vi.mock('@vuzki/database', () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique, findMany: mocks.userFindMany },
  },
}));

vi.mock('../middleware/auth', () => ({
  authenticate: () => (req: any, _res: any, next: any) => {
    req.auth = { userId: 'u1', sessionId: 's1' };
    next();
  },
}));

vi.mock('../services/wallet', () => ({ debitCoins: vi.fn(), creditCoins: vi.fn(), getWallet: vi.fn() }));

import express from 'express';
import request from 'supertest';
import { discoveryRoutes } from '@/routes/discovery';
import { errorHandler } from '@/middleware/errors';

function makeUser(id: string, gender: string) {
  return {
    id,
    status: 'ACTIVE',
    deletedAt: null,
    onlineStatus: true,
    premiumTier: 'FREE',
    isVerified: false,
    isCreator: false,
    gender,
    displayName: `User ${id}`,
    username: `user_${id}`,
    avatarUrl: null,
    dateOfBirth: new Date('1998-02-01'),
    onboardingStep: 'COMPLETE',
    latitude: 10,
    longitude: 10,
    creator: null,
    profile: {
      interests: ['music'],
      languages: ['en'],
      genderPreference: 'all',
      ageRangeFrom: 18,
      ageRangeTo: 50,
      maxDistanceKm: 200,
      onlinePreference: false,
      verifiedPreference: false,
    },
  };
}

function makeMe(id: string, gender: string) {
  return {
    ...makeUser(id, gender),
    blocksReceived: [],
    blocksMade: [],
    likesGiven: [],
    interests: [],
    languages: [],
  };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/discovery', discoveryRoutes);
  app.use(errorHandler);
  return app;
}

describe('GET /discovery/feed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('only returns opposite-gender candidates for a male requester', async () => {
    mocks.userFindUnique.mockResolvedValue(makeMe('u1', 'MALE'));
    mocks.userFindMany.mockResolvedValue([
      makeUser('f1', 'FEMALE'),
      makeUser('m1', 'MALE'),
      makeUser('o1', 'OTHER'),
    ]);

    const res = await request(buildApp()).get('/discovery/feed').expect(200);
    const genders = res.body.data.items.map((i: any) => i.gender);
    expect(genders).toEqual(['FEMALE']);
  });

  it('returns an empty feed when the requester gender is unknown', async () => {
    mocks.userFindUnique.mockResolvedValue(makeMe('u1', 'PREFER_NOT_TO_SAY'));
    mocks.userFindMany.mockResolvedValue([makeUser('f1', 'FEMALE')]);

    const res = await request(buildApp()).get('/discovery/feed').expect(200);
    expect(res.body.data.items).toEqual([]);
  });
});

describe('GET /discovery/talk-now', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty list when the requester gender is unknown (no unsafe query)', async () => {
    mocks.userFindUnique.mockResolvedValue({ id: 'u1', gender: 'OTHER' });
    mocks.userFindMany.mockResolvedValue([makeUser('f1', 'FEMALE')]);

    const res = await request(buildApp()).get('/discovery/talk-now').expect(200);
    expect(res.body.data.items).toEqual([]);
    expect(mocks.userFindMany).not.toHaveBeenCalled();
  });

  it('lists available talk-now users for a requester with a known gender', async () => {
    mocks.userFindUnique.mockResolvedValue(makeMe('u1', 'FEMALE'));
    mocks.userFindMany.mockResolvedValue([makeUser('m1', 'MALE')]);

    const res = await request(buildApp()).get('/discovery/talk-now').expect(200);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].id).toBe('m1');
  });
});