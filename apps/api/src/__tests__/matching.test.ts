import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn();
  const userFindMany = vi.fn();
  const isBlockedPair = vi.fn();
  return { userFindUnique, userFindMany, isBlockedPair };
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
  isBlockedPair: mocks.isBlockedPair,
}));

import {
  startMatchmaking,
  cancelMatchmaking,
  getUserMatch,
  resolveMatchForUser,
} from '../realtime/matching';
import { kv } from '../realtime/store';
import { setPresence, clearPresence } from '../realtime/presence';

function makeUser(id: string, opts: any = {}) {
  return {
    id,
    status: 'ACTIVE',
    deletedAt: null,
    onlineStatus: true,
    premiumTier: 'FREE',
    isVerified: false,
    isCreator: false,
    gender: 'FEMALE',
    displayName: `User ${id}`,
    username: `user_${id}`,
    avatarUrl: null,
    profile: {
      interests: ['music', 'travel'],
      languages: ['en'],
      genderPreference: 'all',
    },
    ...opts,
  };
}

describe('Talk Now matchmaking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isBlockedPair.mockResolvedValue(false);
    mocks.userFindMany.mockResolvedValue([]);
  });

  afterEach(async () => {
    await cancelMatchmaking('u1');
    await cancelMatchmaking('u2');
    await clearPresence('u1').catch(() => {});
    await clearPresence('u2').catch(() => {});
    await kv.close();
  });

  it('starts WAITING when no candidate is online', async () => {
    mocks.userFindUnique.mockResolvedValue(makeUser('u1'));
    const res = await startMatchmaking('u1', { mode: 'random' });
    expect(res.ok).toBe(true);
    const entry = await getUserMatch('u1');
    expect(entry?.state).toBe('WAITING');
  });

  it('matches to a compatible online user and reports score', async () => {
    mocks.userFindUnique.mockImplementation((args: any) => makeUser(args.where.id, args.where.id === 'u1' ? { gender: 'MALE' } : {}));
    // pool of online users includes u2 (female, opposite of u1)
    mocks.userFindMany.mockResolvedValue([makeUser('u2', { gender: 'FEMALE' })]);
    // Talk Now only matches users with a live ONLINE presence proof.
    await setPresence({ userId: 'u2', state: 'ONLINE', sessionId: 's2' });

    const { startMatchmaking: start2 } = await import('../realtime/matching');
    const res = await start2('u1', { mode: 'matched' });
    expect(res.ok).toBe(true);

    const entry = await getUserMatch('u1');
    expect(entry?.state).toBe('MATCHED');
    const match = await resolveMatchForUser('u1');
    expect(match?.state).toBe('MATCHED');
    expect(match?.matchedWith?.id).toBe('u2');
    expect(match?.score).toBeGreaterThanOrEqual(0);
    expect(match?.shared).toBeDefined();
  });

  it('cancel transitions the entry to CANCELLED', async () => {
    mocks.userFindUnique.mockResolvedValue(makeUser('u1'));
    await startMatchmaking('u1', { mode: 'random' });
    await cancelMatchmaking('u1');
    const entry = await getUserMatch('u1');
    expect(entry?.state).toBe('CANCELLED');
  });
});

describe('Hard gender rule (Opposite Gender matching)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isBlockedPair.mockResolvedValue(false);
  });

  afterEach(async () => {
    await cancelMatchmaking('u1');
    await cancelMatchmaking('u2');
    await clearPresence('u1').catch(() => {});
    await clearPresence('u2').catch(() => {});
    await kv.close();
  });

  function mockPair(me: { id: string; gender: string }, other: { id: string; gender: string }) {
    mocks.userFindUnique.mockImplementation((args: any) => {
      if (args.where.id === me.id) return makeUser(me.id, { gender: me.gender });
      return makeUser(other.id, { gender: other.gender });
    });
    mocks.userFindMany.mockResolvedValue([makeUser(other.id, { gender: other.gender })]);
  }

  const pairs: Array<[string, string, string, string, string, 'MATCHED' | 'WAITING']> = [
    ['male -> female allowed', 'u1', 'MALE', 'u2', 'FEMALE', 'MATCHED'],
    ['female -> male allowed', 'u1', 'FEMALE', 'u2', 'MALE', 'MATCHED'],
    ['male -> male rejected', 'u1', 'MALE', 'u2', 'MALE', 'WAITING'],
    ['female -> female rejected', 'u1', 'FEMALE', 'u2', 'FEMALE', 'WAITING'],
    ['lowercase genders are normalized', 'u1', 'male', 'u2', 'FEMALE', 'MATCHED'],
    ['mixed-case genders are normalized', 'u1', 'Female', 'u2', 'MALE', 'MATCHED'],
    ['unknown requester gender -> no unsafe match', 'u1', 'PREFER_NOT_TO_SAY', 'u2', 'FEMALE', 'WAITING'],
    ['non-binary candidate -> no unsafe match', 'u1', 'MALE', 'u2', 'OTHER', 'WAITING'],
  ];

  for (const [label, reqId, reqGender, otherId, otherGender, expected] of pairs) {
    it(`${label}`, async () => {
      mockPair({ id: reqId, gender: reqGender }, { id: otherId, gender: otherGender });
      // Candidate needs a live ONLINE presence proof for Talk Now matching.
      await setPresence({ userId: otherId, state: 'ONLINE', sessionId: `s_${otherId}` });
      const res = await startMatchmaking(reqId, { mode: 'random' });
      expect(res.ok).toBe(true);
      const entry = await getUserMatch(reqId);
      expect(entry?.state).toBe(expected);
      if (expected === 'WAITING') {
        expect(entry?.matchedWith ?? null).toBeNull();
      }
    });
  }

  function mockMaleRequesterWithFemalePool(profileOverride: any = {}) {
    mocks.userFindUnique.mockImplementation((args: any) => {
      if (args.where.id === 'u1') {
        return makeUser('u1', {
          gender: 'MALE',
          profile: { interests: [], languages: ['en'], genderPreference: 'all', ...profileOverride },
        });
      }
      return makeUser('u2', { gender: 'FEMALE' });
    });
    mocks.userFindMany.mockResolvedValue([makeUser('u2', { gender: 'FEMALE' })]);
    return setPresence({ userId: 'u2', state: 'ONLINE', sessionId: 's2' });
  }

  it('honors a specific opposite-gender preference from the request', async () => {
    await mockMaleRequesterWithFemalePool();

    await startMatchmaking('u1', { mode: 'matched', preferredGender: 'female' });
    const entry = await getUserMatch('u1');
    expect(entry?.state).toBe('MATCHED');
    expect(entry?.matchedWith).toBe('u2');
  });

  it('uses the saved genderPreference from the profile when no explicit preference is given', async () => {
    await mockMaleRequesterWithFemalePool({ genderPreference: 'female' });

    await startMatchmaking('u1', { mode: 'matched' });
    const entry = await getUserMatch('u1');
    expect(entry?.state).toBe('MATCHED');
    expect(entry?.matchedWith).toBe('u2');
  });

  it('ignores a same-gender preference and still serves the opposite gender (hard rule wins)', async () => {
    // u1 is male but has a stored preference for male users; the hard rule
    // cannot be satisfied by males, so the preference is ignored and u1 still
    // receives opposite-gender candidates.
    await mockMaleRequesterWithFemalePool({ genderPreference: 'male' });

    await startMatchmaking('u1', { mode: 'matched' });
    const entry = await getUserMatch('u1');
    expect(entry?.state).toBe('MATCHED');
    expect(entry?.matchedWith).toBe('u2');
  });
});

describe('Talk Now availability guards (busy / stale / in-call exclusion)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isBlockedPair.mockResolvedValue(false);
  });

  afterEach(async () => {
    await cancelMatchmaking('u1');
    await cancelMatchmaking('u2');
    await clearPresence('u1').catch(() => {});
    await clearPresence('u2').catch(() => {});
    await kv.close();
  });

  function mockMaleWaitingForFemale() {
    mocks.userFindUnique.mockImplementation((args: any) => {
      if (args.where.id === 'u1') return makeUser('u1', { gender: 'MALE' });
      return makeUser('u2', { gender: 'FEMALE' });
    });
    mocks.userFindMany.mockResolvedValue([makeUser('u2', { gender: 'FEMALE' })]);
  }

  it('never matches a candidate whose presence is IN_CALL', async () => {
    mockMaleWaitingForFemale();
    await setPresence({ userId: 'u2', state: 'IN_CALL', sessionId: 's2', currentCall: 'c1' });

    await startMatchmaking('u1', { mode: 'matched' });
    const entry = await getUserMatch('u1');
    expect(entry?.state).toBe('WAITING');
    expect(entry?.matchedWith ?? null).toBeNull();
  });

  it('never matches a candidate whose presence is BUSY', async () => {
    mockMaleWaitingForFemale();
    await setPresence({ userId: 'u2', state: 'BUSY', sessionId: 's2' });

    await startMatchmaking('u1', { mode: 'matched' });
    const entry = await getUserMatch('u1');
    expect(entry?.state).toBe('WAITING');
    expect(entry?.matchedWith ?? null).toBeNull();
  });

  it('never matches a candidate with an explicit OFFLINE presence snapshot', async () => {
    mockMaleWaitingForFemale();
    await setPresence({ userId: 'u2', state: 'OFFLINE', sessionId: 's2' });

    await startMatchmaking('u1', { mode: 'matched' });
    const entry = await getUserMatch('u1');
    expect(entry?.state).toBe('WAITING');
    expect(entry?.matchedWith ?? null).toBeNull();
  });

  it('matches a candidate with a live ONLINE presence proof', async () => {
    mockMaleWaitingForFemale();
    await setPresence({ userId: 'u2', state: 'ONLINE', sessionId: 's2' });

    await startMatchmaking('u1', { mode: 'matched' });
    const entry = await getUserMatch('u1');
    expect(entry?.state).toBe('MATCHED');
    expect(entry?.matchedWith).toBe('u2');
  });

  it('never offers an unavailable candidate via the listener browser', async () => {
    mocks.userFindUnique.mockResolvedValue(makeUser('u1', { gender: 'MALE', blocksReceived: [], blocksMade: [] }));
    mocks.userFindMany.mockResolvedValue([makeUser('f1', { gender: 'FEMALE' })]);

    // f1 is online in the DB but IN_CALL on the realtime layer.
    await setPresence({ userId: 'f1', state: 'IN_CALL', sessionId: 's_f1' });
    const { getAvailableListeners } = await import('../realtime/matching');
    const out = await getAvailableListeners('u1', 20);
    expect(out).toEqual([]);
  });
});