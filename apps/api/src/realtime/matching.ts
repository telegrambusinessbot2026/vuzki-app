import { kv } from './store';
import { prisma } from '@vuzki/database';
import { isBlockedPair } from '../services/ai-moderation';
import { computeCompatibility, normalizeGender, oppositeOf, isStrictlyOppositeGender } from '../services/matching';
import { allow } from './ratelimit';
import { getPresence } from './presence';

/**
 * Talk Now matchmaking queue.
 *
 * State machine in the KV store:
 *   WAITING -> MATCHED -> CONNECTING -> CONNECTED  (happy path)
 *   WAITING -> CANCELLED                            (user leaves / timeout)
 *
 * Also supports querying "who's online & available to talk" for the
 * "No one is available right now" fallback and the listener browser.
 */

export type MatchState = 'WAITING' | 'MATCHED' | 'CONNECTING' | 'CANCELLED' | 'EXPIRED';

export interface TalkNowEntry {
  userId: string;
  gender?: string;
  state: MatchState;
  preferredGender?: string;
  preferredLanguage?: string;
  interests?: string[];
  mode?: 'random' | 'matched';
  matchedWith?: string | null;
  matchedAt?: number | null;
  expiryMs: number; // epoch ms for timeout
  createdAt: number;
  compatibilityScore?: number | null;
  sharedInterests?: string[];
}

const QUEUE_KEY = 'talknow:queue';
const ENTRY_KEY = (uid: string) => `talknow:entry:${uid}`;
const MATCH_CHANNEL = 'talknow:matches';
const ENTRY_TTL = 120_000; // 120s to hold a spot
const TIMEOUT_MS = 60_000; // wait up to 60s for a match in "random" mode

function serialize(e: TalkNowEntry) {
  return JSON.stringify(e);
}
function parse(raw: string | null): TalkNowEntry | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TalkNowEntry;
  } catch {
    return null;
  }
}

export async function startMatchmaking(
  userId: string,
  opts: { preferredGender?: string; preferredLanguage?: string; interests?: string[]; mode?: 'random' | 'matched' }
): Promise<{ ok: boolean; result: TalkNowEntry | null; reason?: string }> {
  const limit = await allow('match', userId);
  if (!limit.allowed) return { ok: false, reason: 'RATE_LIMITED', result: null };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
  if (!user) return { ok: false, reason: 'USER_NOT_FOUND', result: null };

  // Prevent matching with self / already waiting
  const existing = parse(await kv.get(ENTRY_KEY(userId)));
  if (existing && (existing.state === 'WAITING' || existing.state === 'CONNECTING')) {
    return { ok: true, result: existing };
  }

  const entry: TalkNowEntry = {
    userId,
    state: 'WAITING',
    gender: normalizeGender(user.gender) ?? undefined,
    preferredGender: opts.preferredGender ?? user.profile?.genderPreference ?? 'all',
    preferredLanguage: opts.preferredLanguage,
    interests: opts.interests ?? user.profile?.interests ?? [],
    mode: opts.mode ?? 'matched',
    matchedWith: null,
    matchedAt: null,
    expiryMs: Date.now() + (opts.mode === 'random' ? TIMEOUT_MS : TIMEOUT_MS + 30000),
    createdAt: Date.now(),
  };

  await kv.set(ENTRY_KEY(userId), serialize(entry), ENTRY_TTL);
  await kv.push(QUEUE_KEY, userId);

  const candidate = await findCompatibleCandidate(entry);
  if (candidate) {
    return { ok: true, result: await finalizeMatch(entry, candidate) };
  }

  return { ok: true, result: entry };
}

interface ScoredCandidate {
  uid: string;
  score: number;
}

async function findCompatibleCandidate(entry: TalkNowEntry): Promise<ScoredCandidate | null> {
  const meGender = normalizeGender(entry.gender);
  // A saved/requested gender preference is only honored when it targets the
  // opposite gender; otherwise the hard rule is the floor and preference is ignored.
  const targetGender = meGender && normalizeGender(entry.preferredGender ?? '') === oppositeOf(meGender)
    ? oppositeOf(meGender)
    : null;

  const queued = await kv.list(QUEUE_KEY);
  const candidateIds: string[] = [];
  for (const uid of queued) {
    if (uid === entry.userId) continue;
    const other = parse(await kv.get(ENTRY_KEY(uid)));
    if (!other || other.state !== 'WAITING') continue;
    candidateIds.push(uid);
  }

  // Fresh pool of online users not necessarily queued for a better match pool.
  const onlineUsers = await prisma.user.findMany({
    where: {
      onlineStatus: true,
      status: 'ACTIVE',
      deletedAt: null,
      id: { not: entry.userId },
      ...(meGender ? { gender: oppositeOf(meGender) } : {}),
    },
    include: { profile: true },
    take: 50,
  });

  const scored: ScoredCandidate[] = [];

  for (const uid of [...new Set([...candidateIds, ...onlineUsers.map((u) => u.id)])]) {
    if (await isBlockedPair(entry.userId, uid)) continue;
    const other = onlineUsers.find((u) => u.id === uid) ??
      (await prisma.user.findUnique({ where: { id: uid }, include: { profile: true } }));
    if (!other || other.status !== 'ACTIVE' || other.deletedAt) continue;
    // HARD RULE: only a strictly opposite gender candidate may match.
    if (!isStrictlyOppositeGender(entry.gender, other.gender)) continue;
    const candidateGender = normalizeGender(other.gender);
    if (targetGender && candidateGender !== targetGender) continue;
    if (entry.preferredLanguage && other.profile && !other.profile.languages.includes(entry.preferredLanguage)) {
      continue;
    }
    const { score } = computeCompatibility(
      {
        interests: entry.interests ?? [],
        languages: entry.preferredLanguage ? [entry.preferredLanguage] : [],
      },
      {
        interests: other.profile?.interests ?? [],
        languages: other.profile?.languages ?? [],
        isOnline: !!other.onlineStatus,
        isPremium: other.premiumTier !== 'FREE',
        isVerified: !!other.isVerified,
        isCreator: !!other.isCreator,
      }
    );
    scored.push({ uid, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored[0] ?? null;
}

async function finalizeMatch(a: TalkNowEntry, candidate: ScoredCandidate): Promise<TalkNowEntry | null> {
  const otherUserId = candidate.uid;
  const me = await prisma.user.findUnique({ where: { id: a.userId }, include: { profile: true } });
  const other = await prisma.user.findUnique({ where: { id: otherUserId }, include: { profile: true } });

  // Defense in depth: never finalize a same-gender / ambiguous pair, even if the
  // candidate pool changed between candidate selection and finalization.
  if (!isStrictlyOppositeGender(me?.gender, other?.gender)) {
    return parse(await kv.get(ENTRY_KEY(a.userId)));
  }

  const sharedFor = (self: any, peer: any) =>
    (self?.profile?.interests ?? []).filter((i: string) => (peer?.profile?.interests ?? []).includes(i));

  const sharedSelf = sharedFor(me, other);
  const score = Math.round(Math.min(99, 60 + sharedSelf.length * 9 + (other?.isVerified ? 7 : 0) + (other?.premiumTier !== 'FREE' ? 4 : 0)));

  const setState = async (uid: string, matchedWith: string) => {
    const e = parse(await kv.get(ENTRY_KEY(uid)));
    if (!e) return;
    e.state = 'MATCHED';
    e.matchedWith = matchedWith;
    e.matchedAt = Date.now();
    e.compatibilityScore = score;
    await kv.set(ENTRY_KEY(uid), serialize(e), ENTRY_TTL * 2);
  };

  await setState(a.userId, otherUserId);
  await setState(otherUserId, a.userId);
  await kv.remove(QUEUE_KEY, a.userId);
  await kv.remove(QUEUE_KEY, otherUserId);

  const aDto = buildMatchDto(other, sharedSelf, score);
  const sharedOther = sharedFor(other, me);
  const bDto = buildMatchDto(me, sharedOther, score);

  await kv.publish(MATCH_CHANNEL, JSON.stringify({ userId: a.userId, match: aDto }));
  await kv.publish(MATCH_CHANNEL, JSON.stringify({ userId: otherUserId, match: bDto }));

  return parse(await kv.get(ENTRY_KEY(a.userId)));
}

function buildMatchDto(other: any, sharedInterests: string[], score: number) {
  return {
    matchedWith: {
      id: other?.id,
      displayName: other?.displayName,
      username: other?.username,
      avatarUrl: other?.avatarUrl,
      gender: other?.gender,
      isCreator: other?.isCreator,
      isVerified: other?.isVerified,
      premiumTier: other?.premiumTier,
    },
    compatibilityScore: score,
    sharedInterests: sharedInterests.slice(0, 3),
    mode: 'matched',
  };
}

export async function cancelMatchmaking(userId: string): Promise<void> {
  const e = parse(await kv.get(ENTRY_KEY(userId)));
  if (e) {
    e.state = 'CANCELLED';
    await kv.set(ENTRY_KEY(userId), serialize(e), 5000);
  }
  await kv.remove(QUEUE_KEY, userId);
}

export async function getUserMatch(userId: string): Promise<TalkNowEntry | null> {
  return parse(await kv.get(ENTRY_KEY(userId)));
}

export async function resolveMatchForUser(
  userId: string
): Promise<{ state: string; matchedWith?: any; score?: number | null; shared?: string[] } | null> {
  const e = await getUserMatch(userId);
  if (!e) return null;
  if (e.state !== 'MATCHED' || !e.matchedWith) {
    return { state: e.state, score: e.compatibilityScore, shared: e.sharedInterests };
  }
  const other = await prisma.user.findUnique({ where: { id: e.matchedWith }, include: { profile: true } });
  if (!other) return { state: 'EXPIRED' };
  const shared = (other.profile?.interests ?? []).filter((i: string) => (e.interests ?? []).includes(i));
  return {
    state: 'MATCHED',
    matchedWith: {
      id: other.id,
      displayName: other.displayName,
      username: other.username,
      avatarUrl: other.avatarUrl,
      gender: other.gender,
      isVerified: other.isVerified,
      isCreator: other.isCreator,
      premiumTier: other.premiumTier,
    },
    score: e.compatibilityScore ?? Math.round(60 + shared.length * 9),
    shared: shared.slice(0, 3),
  };
}

/** "No one is available right now" fallback: list of available listeners/creators. */
export async function getAvailableListeners(userId: string, limit = 20) {
  const me = await prisma.user.findUnique({ where: { id: userId }, include: { blocksMade: true, blocksReceived: true, profile: true } });
  if (!me) return [];
  // HARD RULE: the requester needs a known gender before any listeners are listed.
  const meGender = normalizeGender(me.gender);
  if (!meGender) return [];
  const blocked = new Set([
    ...(me.blocksMade ?? []).map((b) => b.blockedId),
    ...(me.blocksReceived ?? []).map((b) => b.blockerId),
    userId,
  ]);
  const online = await prisma.user.findMany({
    where: { onlineStatus: true, status: 'ACTIVE', deletedAt: null, gender: oppositeOf(meGender), id: { notIn: [...blocked] } },
    include: { profile: true },
    take: 100,
  });
  const out = [];
  for (const u of online) {
    if (!isStrictlyOppositeGender(me.gender, u.gender)) continue;
    const { score, factors } = computeCompatibility(
      { interests: me?.profile?.interests ?? [], languages: me?.profile?.languages ?? [] },
      { interests: u.profile?.interests ?? [], languages: u.profile?.languages ?? [], isOnline: true, isVerified: u.isVerified, isPremium: u.premiumTier !== 'FREE' }
    );
    out.push({ user: toLite(u), score, factors });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit).map((x) => ({ ...x.user, matchScore: x.score, sharedInterests: x.factors.sharedInterests.slice(0, 3) }));
}

function toLite(u: any) {
  return {
    id: u.id,
    displayName: u.displayName,
    username: u.username,
    avatarUrl: u.avatarUrl,
    gender: u.gender,
    isCreator: u.isCreator,
    isVerified: u.isVerified,
    premiumTier: u.premiumTier,
  };
}

export async function subscribeMatches(handler: (userId: string, match: any) => void) {
  await kv.subscribe(MATCH_CHANNEL, (channel, message) => {
    try {
      const { userId, match } = JSON.parse(message);
      handler(userId, match);
    } catch {
      /* ignore */
    }
  });
}
