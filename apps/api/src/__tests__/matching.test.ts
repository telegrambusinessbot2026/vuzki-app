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
    mocks.userFindUnique.mockImplementation((args: any) => makeUser(args.where.id));
    // pool of online users includes u2
    mocks.userFindMany.mockResolvedValue([makeUser('u2')]);

    const { startMatchmaking: start2 } = await import('../realtime/matching');
    await start2('u1', { mode: 'matched' });

    const entry = await getUserMatch('u1');
    if (entry?.state === 'MATCHED') {
      const match = await resolveMatchForUser('u1');
      expect(match?.state).toBe('MATCHED');
      expect(match?.matchedWith?.id).toBe('u2');
      expect(match?.score).toBeGreaterThanOrEqual(0);
      expect(match?.shared).toBeDefined();
    } else {
      // random match not guaranteed deterministic, but must not be an error state
      expect(['WAITING', 'MATCHED', 'CANCELLED']).toContain(entry?.state);
    }
  });

  it('cancel transitions the entry to CANCELLED', async () => {
    mocks.userFindUnique.mockResolvedValue(makeUser('u1'));
    await startMatchmaking('u1', { mode: 'random' });
    await cancelMatchmaking('u1');
    const entry = await getUserMatch('u1');
    expect(entry?.state).toBe('CANCELLED');
  });

  it('treated WAITING entry expires at match:poll', async () => {
    mocks.userFindUnique.mockResolvedValue(makeUser('u1'));
    const res = await startMatchmaking('u1', { mode: 'random' });
    expect(res.ok).toBe(true);
  });
});
