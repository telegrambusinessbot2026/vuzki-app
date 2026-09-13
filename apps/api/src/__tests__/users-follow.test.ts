import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Module under test: userRoutes (follows + real profile stats) ---
// Mounts the real /users router and drives it with supertest, mocking only the
// DB/otp/auth seams. The router under test uses prisma.follow, prisma.profileView
// and prisma.user (plus wallet bits on /users/me/profile).

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn();
  const followCount = vi.fn();
  const followFindUnique = vi.fn();
  const followUpsert = vi.fn();
  const followDeleteMany = vi.fn();
  const profileViewCount = vi.fn();
  const profileViewUpsert = vi.fn();
  return {
    userFindUnique,
    followCount,
    followFindUnique,
    followUpsert,
    followDeleteMany,
    profileViewCount,
    profileViewUpsert,
  };
});

vi.mock('@vuzki/database', () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique, update: vi.fn(), findFirst: vi.fn() },
    follow: {
      count: mocks.followCount,
      findUnique: mocks.followFindUnique,
      upsert: mocks.followUpsert,
      deleteMany: mocks.followDeleteMany,
    },
    profileView: { count: mocks.profileViewCount, upsert: mocks.profileViewUpsert },
    otp: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('../services/otp', () => ({ sendOtp: vi.fn(), verifyOtp: vi.fn(), createAndValidateOtp: vi.fn() }));

vi.mock('../services/wallet', () => ({ debitCoins: vi.fn(), creditCoins: vi.fn(), getWallet: vi.fn() }));

vi.mock('../middleware/auth', () => ({
  authenticate: () => (req: any, _res: any, next: any) => {
    req.auth = { userId: 'u1', sessionId: 's1' };
    next();
  },
}));

import express from 'express';
import request from 'supertest';
import { userRoutes } from '@/routes/users';
import { errorHandler } from '@/middleware/errors';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/users', userRoutes);
  app.use(errorHandler);
  return app;
}

const profileUser = {
  id: 'u2',
  username: 'ananya',
  displayName: 'Ananya',
  email: 'ananya@vuzki.app',
  avatarUrl: null,
  gender: 'FEMALE',
  dateOfBirth: new Date('1998-01-01'),
  countryCode: null,
  region: null,
  bio: 'Hello',
  isCreator: false,
  creatorStatus: null,
  premiumTier: 'FREE',
  premiumExpiresAt: null,
  isVerified: false,
  onlineStatus: false,
  lastActiveAt: new Date(),
  status: 'ACTIVE',
  deletedAt: null,
  profile: { interests: ['Music', 'Travel'] },
  creator: null,
  preferences: {},
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.userFindUnique.mockResolvedValue(profileUser);
  mocks.followCount.mockResolvedValue(0);
  mocks.followFindUnique.mockResolvedValue(null);
  mocks.followUpsert.mockResolvedValue({ id: 'f1' });
  mocks.followDeleteMany.mockResolvedValue({ count: 1 });
  mocks.profileViewCount.mockResolvedValue(0);
  mocks.profileViewUpsert.mockResolvedValue({ id: 'v1' });
});

describe('users: GET /users/:id real DB stats + view recording', () => {
  it('returns followers/following/profileViews counts and isFollowing=false', async () => {
    mocks.followCount
      .mockResolvedValueOnce(7) // followers
      .mockResolvedValueOnce(3); // following
    mocks.profileViewCount.mockResolvedValueOnce(42);

    const res = await request(buildApp()).get('/users/u2').expect(200);

    expect(res.body.data.user.followers).toBe(7);
    expect(res.body.data.user.following).toBe(3);
    expect(res.body.data.user.profileViews).toBe(42);
    expect(res.body.data.user.isFollowing).toBe(false);
    expect(res.body.data.user.isOwn).toBe(false);
  });

  it('records a profile view via upsert when the viewer is not the owner', async () => {
    await request(buildApp()).get('/users/u2').expect(200);

    expect(mocks.profileViewUpsert).toHaveBeenCalledWith({
      where: { viewerId_profileOwnerId: { viewerId: 'u1', profileOwnerId: 'u2' } },
      update: { createdAt: expect.any(Date) },
      create: { viewerId: 'u1', profileOwnerId: 'u2' },
    });
  });

  it('does not count a self-view', async () => {
    mocks.userFindUnique.mockResolvedValue({ ...profileUser, id: 'u1' });
    const res = await request(buildApp()).get('/users/u1').expect(200);

    expect(res.body.data.user.isOwn).toBe(true);
    expect(mocks.profileViewUpsert).not.toHaveBeenCalled();
  });
});

describe('users: follow / unfollow', () => {
  it('POST /users/:id/follow creates the follow and returns new counts', async () => {
    mocks.followCount.mockResolvedValueOnce(8);
    mocks.followCount.mockResolvedValueOnce(3);

    const res = await request(buildApp()).post('/users/u2/follow').expect(200);

    expect(mocks.followUpsert).toHaveBeenCalledWith({
      where: { followerId_followingId: { followerId: 'u1', followingId: 'u2' } },
      update: {},
      create: { followerId: 'u1', followingId: 'u2' },
    });
    expect(res.body.data).toMatchObject({ following: true, followers: 8 });
  });

  it('rejects following yourself', async () => {
    mocks.userFindUnique.mockResolvedValue({ ...profileUser, id: 'u1' });
    const res = await request(buildApp()).post('/users/u1/follow').expect(400);

    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(mocks.followUpsert).not.toHaveBeenCalled();
  });

  it('DELETE /users/:id/follow removes the follow', async () => {
    const res = await request(buildApp()).delete('/users/u2/follow').expect(200);
    expect(mocks.followDeleteMany).toHaveBeenCalledWith({
      where: { followerId: 'u1', followingId: 'u2' },
    });
    expect(res.body.data.following).toBe(false);
  });
});

describe('users: GET /users/me/profile includes engagement stats', () => {
  it('serializes followers/following/profileViews alongside the self DTO', async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: 'u1',
      username: 'me',
      displayName: 'Me',
      email: 'me@vuzki.app',
      avatarUrl: null,
      gender: 'PREFER_NOT_TO_SAY',
      dateOfBirth: null,
      countryCode: null,
      region: null,
      bio: null,
      isCreator: false,
      creatorStatus: null,
      premiumTier: 'FREE',
      premiumExpiresAt: null,
      isVerified: false,
      onlineStatus: false,
      lastActiveAt: new Date(),
      status: 'ACTIVE',
      deletedAt: null,
      profile: { interests: [], languages: [] },
      creator: null,
      preferences: {},
      wallet: { balance: 10, currency: 'INR' },
      subscriptions: [],
      theme: 'dark',
      language: 'en',
      _count: { likesReceived: 4, matchesA: 1, matchesB: 0 },
    });
    mocks.followCount.mockResolvedValue(0);
    mocks.profileViewCount.mockResolvedValue(0);

    const res = await request(buildApp()).get('/users/me/profile').expect(200);

    expect(res.body.data.user.stats).toMatchObject({ likesReceived: 4, matches: 1 });
    expect(res.body.data.user.followers).toBe(0);
    expect(res.body.data.user.following).toBe(0);
    expect(res.body.data.user.profileViews).toBe(0);
    expect(res.body.data.user.theme).toBe('dark');
  });
});