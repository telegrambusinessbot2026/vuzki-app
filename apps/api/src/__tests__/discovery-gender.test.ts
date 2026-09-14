import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn();
  const userFindMany = vi.fn();
  return { userFindUnique, userFindMany };
});

vi.mock('@vuzki/database', () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      findMany: mocks.userFindMany,
    },
  },
}));

vi.mock('../services/ai-moderation', () => ({
  isBlockedPair: vi.fn().mockResolvedValue(false),
}));

import { findCandidates } from '../services/matching';
import { getAvailableListeners, cancelMatchmaking } from '../realtime/matching';
import { setPresence, clearPresence } from '../realtime/presence';
import { kv } from '../realtime/store';

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

function makeMe(id: string, gender: string, genderPreference = 'all') {
  return {
    ...makeUser(id, gender),
    blocksReceived: [],
    blocksMade: [],
    likesGiven: [],
    interests: [],
    languages: [],
    profile: { ...makeUser(id, gender).profile, genderPreference },
  };
}

describe('Discovery feed gender rule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('only surfaces the opposite gender when the requester is male', async () => {
    mocks.userFindUnique.mockResolvedValue(makeMe('u1', 'MALE'));
    mocks.userFindMany.mockResolvedValue([
      makeUser('f1', 'FEMALE'),
      makeUser('m1', 'MALE'),
      makeUser('o1', 'OTHER'),
    ]);

    const out = await findCandidates({ userId: 'u1', limit: 10 });
    expect(out.map((c) => c.user.gender)).toEqual(['FEMALE']);
  });

  it('only surfaces the opposite gender when the requester is female', async () => {
    mocks.userFindUnique.mockResolvedValue(makeMe('u1', 'FEMALE'));
    mocks.userFindMany.mockResolvedValue([
      makeUser('m1', 'MALE'),
      makeUser('f1', 'FEMALE'),
      makeUser('f2', 'FEMALE'),
    ]);

    const out = await findCandidates({ userId: 'u1', limit: 10 });
    expect(out.every((c) => c.user.gender === 'MALE')).toBe(true);
    expect(out.map((c) => c.user.gender)).toEqual(['MALE']);
  });

  it('returns no candidates when the requester gender is unknown', async () => {
    mocks.userFindUnique.mockResolvedValue(makeMe('u1', 'PREFER_NOT_TO_SAY'));
    mocks.userFindMany.mockResolvedValue([makeUser('f1', 'FEMALE')]);

    const out = await findCandidates({ userId: 'u1', limit: 10 });
    expect(out).toEqual([]);
  });

  it('a conflicting explicit gender filter cannot bypass the opposite-gender rule', async () => {
    // male requester who explicitly asks for males: still only females surface.
    mocks.userFindUnique.mockResolvedValue(makeMe('u1', 'MALE'));
    mocks.userFindMany.mockResolvedValue([
      makeUser('f1', 'FEMALE'),
      makeUser('m1', 'MALE'),
    ]);

    const out = await findCandidates({ userId: 'u1', limit: 10, filters: { gender: 'male' } });
    expect(out.map((c) => c.user.gender)).toEqual(['FEMALE']);
  });

  it('a same-gender saved preference cannot surface same-gender users', async () => {
    mocks.userFindUnique.mockResolvedValue(makeMe('u1', 'FEMALE', 'female'));
    mocks.userFindMany.mockResolvedValue([
      makeUser('m1', 'MALE'),
      makeUser('f1', 'FEMALE'),
    ]);

    const out = await findCandidates({ userId: 'u1', limit: 10 });
    expect(out.map((c) => c.user.gender)).toEqual(['MALE']);
  });
});

describe('Talk Now listener browser gender rule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFindMany.mockResolvedValue([]);
  });

  afterEach(async () => {
    await cancelMatchmaking('u1');
    await kv.close();
  });

  it('only lists listeners of the opposite gender', async () => {
    mocks.userFindUnique.mockResolvedValue(makeMe('u1', 'MALE'));
    mocks.userFindMany.mockResolvedValue([
      makeUser('f1', 'FEMALE'),
      makeUser('m1', 'MALE'),
      makeUser('o1', 'OTHER'),
    ]);
    // candidates need a live ONLINE presence proof for Talk Now browsing.
    await setPresence({ userId: 'f1', state: 'ONLINE', sessionId: 's_f1' });
    await setPresence({ userId: 'm1', state: 'ONLINE', sessionId: 's_m1' });
    await setPresence({ userId: 'o1', state: 'ONLINE', sessionId: 's_o1' });

    const out = await getAvailableListeners('u1', 20);
    expect(out.map((u: any) => u.gender)).toEqual(['FEMALE']);
  });

  it('returns no listeners when the requester gender is unknown', async () => {
    mocks.userFindUnique.mockResolvedValue(makeMe('u1', 'OTHER'));
    mocks.userFindMany.mockResolvedValue([makeUser('f1', 'FEMALE')]);

    const out = await getAvailableListeners('u1', 20);
    expect(out).toEqual([]);
  });
});