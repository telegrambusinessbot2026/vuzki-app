import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Module under test: PUT /users/me/profile (+ onboarding persistence) ---
// Mounts the real /users and /auth routers, mocking only the DB/auth seams.

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn();
  const userFindFirst = vi.fn();
  const userUpdate = vi.fn();
  const interestDeleteMany = vi.fn();
  const interestCreateMany = vi.fn();
  const languageDeleteMany = vi.fn();
  const languageCreateMany = vi.fn();
  const profileUpsert = vi.fn();
  const prefsUpsert = vi.fn();
  const tx = {
    user: { update: userUpdate },
    profileInterest: { deleteMany: interestDeleteMany, createMany: interestCreateMany },
    profileLanguage: { deleteMany: languageDeleteMany, createMany: languageCreateMany },
    profile: { upsert: profileUpsert },
    profilePreferences: { upsert: prefsUpsert },
  };
  return {
    userFindUnique,
    userFindFirst,
    userUpdate,
    interestDeleteMany,
    interestCreateMany,
    languageDeleteMany,
    languageCreateMany,
    profileUpsert,
    prefsUpsert,
    tx,
  };
});

vi.mock('@vuzki/database', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: any) => fn(mocks.tx)),
    user: {
      findUnique: mocks.userFindUnique,
      findFirst: mocks.userFindFirst,
      update: mocks.userUpdate,
    },
    profileInterest: {
      deleteMany: mocks.interestDeleteMany,
      createMany: mocks.interestCreateMany,
    },
    profileLanguage: {
      deleteMany: mocks.languageDeleteMany,
      createMany: mocks.languageCreateMany,
    },
    profile: { upsert: mocks.profileUpsert },
    profilePreferences: { upsert: mocks.prefsUpsert },
    session: { create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findFirst: vi.fn() },
    follow: { count: vi.fn(), findUnique: vi.fn() },
    profileView: { count: vi.fn(), upsert: vi.fn() },
  },
}));

vi.mock('../middleware/auth', () => ({
  authenticate: () => (req: any, _res: any, next: any) => {
    req.auth = { userId: 'u1', sessionId: 's1' };
    next();
  },
}));

vi.mock('../services/wallet', () => ({ debitCoins: vi.fn(), creditCoins: vi.fn(), getWallet: vi.fn() }));

vi.mock('../services/otp', () => ({ sendOtp: vi.fn(), verifyOtp: vi.fn().mockResolvedValue(true) }));

import express from 'express';
import request from 'supertest';
import { userRoutes } from '@/routes/users';
import { authRoutes } from '@/routes/auth';
import { errorHandler } from '@/middleware/errors';

function makeFullUser(overrides: Record<string, any> = {}) {
  return {
    id: 'u1',
    username: 'coolmaya',
    displayName: 'Maya',
    email: 'maya@vuzki.app',
    emailVerified: true,
    phone: null,
    phoneVerified: false,
    avatarUrl: null,
    bannerUrl: null,
    gender: 'FEMALE',
    dateOfBirth: new Date('2000-01-01'),
    countryCode: 'IN',
    region: null,
    bio: 'Hello there',
    premiumTier: 'FREE',
    premiumExpiresAt: null,
    isVerified: false,
    isCreator: false,
    creatorStatus: null,
    onlineStatus: true,
    lastActiveAt: new Date(),
    status: 'ACTIVE',
    theme: 'dark',
    language: 'en',
    onboardingStep: 'NONE',
    referralCode: 'MAYA123',
    profile: { interests: ['Music', 'Travel'], languages: ['en'] },
    wallet: { balance: 0, currency: 'INR' },
    preferences: {},
    subscriptions: [],
    ...overrides,
  };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/users', userRoutes);
  app.use('/auth', authRoutes);
  app.use(errorHandler);
  return app;
}

function mockDbUser(user = makeFullUser()) {
  mocks.userFindUnique.mockImplementation((args: any) => {
    if (args.where.username) return null; // no username conflict by default
    if (args.where.email || args.where.phone) return null; // fresh identity
    return user; // full user read (own profile)
  });
}

describe('PUT /users/me/profile — nullable fields & bio save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbUser();
  });

  it('accepts null for nullable profile fields and still saves bio', async () => {
    const res = await request(buildApp())
      .put('/users/me/profile')
      .send({
        displayName: 'Maya',
        bio: 'My updated bio',
        countryCode: null,
        avatarUrl: null,
        bannerUrl: null,
        region: null,
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(mocks.userUpdate).toHaveBeenCalledTimes(1);
    const { data } = mocks.userUpdate.mock.calls[0][0];
    expect(data.bio).toBe('My updated bio');
    expect(data.countryCode).toBeNull();
    expect(data.avatarUrl).toBeNull();
    expect(data.bannerUrl).toBeNull();
    expect(data.region).toBeNull();
  });

  it('saves bio in a full profile update (no regression)', async () => {
    const res = await request(buildApp())
      .put('/users/me/profile')
      .send({
        displayName: 'Maya',
        username: 'coolmaya',
        bio: "Hi, I'm Maya",
        gender: 'FEMALE',
        region: 'Mumbai',
        countryCode: 'IN',
        interests: ['Music', 'Travel', 'Food'],
        languages: ['en', 'hi'],
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    const { data } = mocks.userUpdate.mock.calls[0][0];
    expect(data.bio).toBe("Hi, I'm Maya");
    expect(data.displayName).toBe('Maya');
    expect(mocks.interestCreateMany).toHaveBeenCalledTimes(1);
    const interestNames = mocks.interestCreateMany.mock.calls[0][0].data.map((d: any) => d.name);
    expect(interestNames).toEqual(['Music', 'Travel', 'Food']);
    const langCodes = mocks.languageCreateMany.mock.calls[0][0].data.map((d: any) => d.code);
    expect(langCodes).toEqual(['en', 'hi']);
    expect(mocks.profileUpsert).toHaveBeenCalled();
  });

  it('returns the persisted user in the response', async () => {
    const res = await request(buildApp())
      .put('/users/me/profile')
      .send({ displayName: 'Maya', bio: 'ok' })
      .expect(200);

    expect(res.body.data.user.username).toBe('coolmaya');
    expect(res.body.data.user.bio).toBe('Hello there');
    expect(res.body.data.user.interests).toEqual(['Music', 'Travel']);
    expect(res.body.data.onboardingStep).toBe('NONE');
  });
});

describe('Onboarding persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbUser();
  });

  it('persists onboarding data (bio, interests, languages, step) through the API', async () => {
    const res = await request(buildApp())
      .put('/users/me/profile')
      .send({
        displayName: 'Maya',
        bio: 'Music lover & traveller',
        interests: ['Music', 'Travel'],
        languages: ['en'],
        onboardingStep: 'COMPLETE',
      })
      .expect(200);

    expect(res.body.success).toBe(true);

    const { data } = mocks.userUpdate.mock.calls[0][0];
    expect(data.displayName).toBe('Maya');
    expect(data.bio).toBe('Music lover & traveller');
    expect(data.onboardingStep).toBe('COMPLETE');

    const interestNames = mocks.interestCreateMany.mock.calls[0][0].data.map((d: any) => d.name);
    expect(interestNames).toEqual(['Music', 'Travel']);
    const langCodes = mocks.languageCreateMany.mock.calls[0][0].data.map((d: any) => d.code);
    expect(langCodes).toEqual(['en']);
    expect(mocks.profileUpsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      update: { interests: ['Music', 'Travel'], languages: ['en'] },
      create: { userId: 'u1', interests: ['Music', 'Travel'], languages: ['en'] },
    });
  });

  it('onboarding completion survives logout/login (reloads from DB via /auth/me)', async () => {
    // Complete onboarding through the profile API.
    mockDbUser(
      makeFullUser({
        bio: 'Music lover & traveller',
        onboardingStep: 'COMPLETE',
        profile: { interests: ['Music', 'Travel'], languages: ['en'] },
      })
    );

    await request(buildApp())
      .put('/users/me/profile')
      .send({ displayName: 'Maya', bio: 'Music lover & traveller', interests: ['Music', 'Travel'], languages: ['en'], onboardingStep: 'COMPLETE' })
      .expect(200);

    // After logout/login the app reloads the session user via GET /auth/me.
    const me = await request(buildApp()).get('/auth/me').expect(200);

    expect(me.body.data.user.onboardingStep).toBe('COMPLETE');
    expect(me.body.data.user.bio).toBe('Music lover & traveller');
    expect(me.body.data.user.interests).toEqual(['Music', 'Travel']);
    expect(me.body.data.user.languages).toEqual(['en']);
  });
});

describe('Validation is still enforced', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbUser();
  });

  it('rejects invalid profile data without updating the user', async () => {
    const invalidBodies = [
      { bio: 'x'.repeat(301) },
      { displayName: 'x'.repeat(41) },
      { countryCode: 'TOOLONG' },
      { gender: 'UNKNOWN' },
      { interests: Array.from({ length: 21 }, (_, i) => `interest-${i}`) },
    ];

    for (const body of invalidBodies) {
      const res = await request(buildApp()).put('/users/me/profile').send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it('rejects a taken username (existing behavior preserved)', async () => {
    mocks.userFindUnique.mockImplementation((args: any) => {
      if (args.where.username) return { id: 'u2', username: 'coolmaya' }; // taken by someone else
      return makeFullUser();
    });

    const res = await request(buildApp())
      .put('/users/me/profile')
      .send({ username: 'coolmaya', bio: 'try' })
      .expect(409);

    expect(res.body.error.code).toBe('USERNAME_TAKEN');
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it('null is still rejected for required non-nullable fields', async () => {
    const res = await request(buildApp())
      .put('/users/me/profile')
      .send({ displayName: null })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
