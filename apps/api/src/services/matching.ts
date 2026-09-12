import { prisma } from '@vuzki/database';
import { RestrictionType } from '@vuzki/shared';

interface MatchWeights {
  interests: number;
  languages: number;
  distance: number;
  age: number;
  activity: number;
  availability: number;
  premium: number;
  verified: number;
}

const DEFAULT_WEIGHTS: MatchWeights = {
  interests: 0.25,
  languages: 0.25,
  distance: 0.15,
  age: 0.1,
  activity: 0.05,
  availability: 0.05,
  premium: 0.05,
  verified: 0.1,
};

export interface CompatibilityFactors {
  sharedInterests: string[];
  sharedInterestsCount: number;
  sharedLanguages: string[];
  sharedLanguagesCount: number;
  distanceKm: number | null;
  ageDiff: number | null;
  isOnline: boolean;
  isPremium: boolean;
  isVerified: boolean;
  isCreator: boolean;
}

type ProfileInput = {
  interests: string[];
  languages: string[];
  age?: number | null;
  isOnline?: boolean;
  isPremium?: boolean;
  isVerified?: boolean;
  isCreator?: boolean;
};

export function computeCompatibility(
  a: ProfileInput,
  b: ProfileInput,
  distanceKm: number | null = null,
  weights: MatchWeights = DEFAULT_WEIGHTS
): { score: number; factors: CompatibilityFactors } {
  const sharedInterests = a.interests.filter((i) => b.interests.includes(i));
  const sharedLanguages = a.languages.filter((l) => b.languages.includes(l));

  const interestScore =
    a.interests.length > 0 ? sharedInterests.length / Math.max(a.interests.length, b.interests.length, 1) : 0.2;
  const languageScore =
    a.languages.length > 0 ? sharedLanguages.length / Math.max(a.languages.length, b.languages.length, 1) : 0.3;

  let distanceScore = 0.5;
  if (distanceKm !== null) {
    distanceScore = Math.max(0, 1 - distanceKm / 200);
  }

  let ageScore = 0.5;
  if (a.age && b.age) {
    const diff = Math.abs(a.age - b.age);
    ageScore = Math.max(0, 1 - diff / 30);
  }

  const score =
    interestScore * weights.interests +
    languageScore * weights.languages +
    distanceScore * weights.distance +
    ageScore * weights.age +
    0.5 * weights.activity +
    0.5 * weights.availability +
    (b.isPremium ? 1 : 0.5) * weights.premium +
    (b.isVerified ? 1 : 0.5) * weights.verified;

  return {
    score: Math.round(score * 100),
    factors: {
      sharedInterests,
      sharedInterestsCount: sharedInterests.length,
      sharedLanguages,
      sharedLanguagesCount: sharedLanguages.length,
      distanceKm,
      ageDiff: a.age && b.age ? Math.abs(a.age - b.age) : null,
      isOnline: !!b.isOnline,
      isPremium: !!b.isPremium,
      isVerified: !!b.isVerified,
      isCreator: !!b.isCreator,
    },
  };
}

export interface DiscoveryCandidate {
  user: any;
  score: number;
  factors: CompatibilityFactors;
}

export async function findCandidates(params: {
  userId: string;
  limit?: number;
  filters?: Record<string, any>;
  mode?: string;
}): Promise<DiscoveryCandidate[]> {
  const me = await prisma.user.findUnique({
    where: { id: params.userId },
    include: {
      profile: true,
      interests: true,
      languages: true,
      blocksReceived: true,
      blocksMade: true,
      likesGiven: { select: { receiverId: true } },
    },
  });
  if (!me) return [];

  const myInterests = me.profile?.interests ?? [];
  const myLanguages = me.profile?.languages ?? [];
  const myAge = me.dateOfBirth ? ageOf(me.dateOfBirth) : null;
  const myPrefs = me.profile;

  const blockedBy = new Set(me.blocksReceived.map((b) => b.blockerId));
  const blockedByMe = new Set(me.blocksMade.map((b) => b.blockedId));
  // Exclude users we have already liked (they are handled by the likes/matches flows),
  // NOT users who liked us (those are our most promising candidates and must stay visible).
  const likedUsers = new Set(me.likesGiven.map((l) => l.receiverId));

  const ageFrom = myPrefs?.ageRangeFrom ?? 18;
  const ageTo = myPrefs?.ageRangeTo ?? 50;
  const genderPref = myPrefs?.genderPreference ?? 'all';
  const maxDistance = myPrefs?.maxDistanceKm ?? 200;
  const onlineOnly = myPrefs?.onlinePreference ?? false;
  const verifiedOnly = myPrefs?.verifiedPreference ?? false;

  const where: Record<string, any> = {
    id: {
      not: { in: [...blockedBy, ...blockedByMe, ...likedUsers, params.userId] },
    },
    dateOfBirth: {
      not: null,
    },
    status: 'ACTIVE',
    deletedAt: null,
    onboardingStep: 'COMPLETE',
    // Enforce an active MATCH restriction: restricted users are never surfaced
    // in the discovery feed or candidate pool.
    restrictions: { none: { isActive: true, type: RestrictionType.MATCH_RESTRICTION } },
  };

  // Apply the age-range preference (inclusive bounds in years).
  if (typeof ageFrom === 'number' || typeof ageTo === 'number') {
    const now = new Date();
    const from = typeof ageFrom === 'number' ? ageFrom : 18;
    const to = typeof ageTo === 'number' ? ageTo : 99;
    const maxDob = new Date(now.getFullYear() - from - 1, now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const minDob = new Date(now.getFullYear() - to, now.getMonth(), now.getDate());
    where.dateOfBirth = { gte: minDob, lte: maxDob, not: null };
  }

  if (params.filters?.gender && params.filters.gender !== 'all') {
    where.gender = params.filters.gender;
  }
  if (params.filters?.isCreator === true) where.isCreator = true;
  if (params.filters?.isVerifiedOnly) where.isVerified = true;
  if (params.filters?.isPremiumOnly) where.premiumTier = { not: 'FREE' };
  if (params.filters?.language) {
    where.languages = { some: { code: params.filters.language } };
  }
  if (params.filters?.interest) {
    where.interests = { some: { name: params.filters.interest } };
  }
  if (params.filters?.country) where.countryCode = params.filters.country;
  if (onlineOnly) where.onlineStatus = true;

  // get a broader candidate pool then score
  const candidates = await prisma.user.findMany({
    where,
    take: Math.min(100, params.limit ? params.limit * 5 : 100),
    orderBy: onlineOnly ? {} : { lastActiveAt: 'desc' },
    include: {
      profile: true,
    },
  });

  const myLat = me.latitude;
  const myLng = me.longitude;

  const scored = candidates
    .map((c) => {
      const dist =
        myLat && myLng && c.latitude && c.longitude
          ? haversine(myLat, myLng, c.latitude, c.longitude)
          : null;
      const candidateInterests = c.profile?.interests ?? [];
      const candidateLanguages = c.profile?.languages ?? [];
      const candidateAge = c.dateOfBirth ? ageOf(c.dateOfBirth) : null;
      return computeCompatibility(
        { interests: myInterests, languages: myLanguages, age: myAge },
        {
          interests: candidateInterests,
          languages: candidateLanguages,
          age: candidateAge,
          isOnline: c.onlineStatus,
          isPremium: c.premiumTier !== 'FREE',
          isVerified: c.isVerified,
          isCreator: c.isCreator,
        },
        dist
      );
    })
    .map((r, idx) => ({ result: r, candidate: candidates[idx] }));

  scored.sort((a, b) => b.result.score - a.result.score);

  return scored.slice(0, params.limit ?? 20).map(({ result, candidate }) => ({
    user: candidate,
    score: result.score,
    factors: result.factors,
  }));
}

function ageOf(d: Date): number {
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
const toRad = (v: number) => (v * Math.PI) / 180;
