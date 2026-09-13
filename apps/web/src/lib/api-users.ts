import type { MockUser } from '@/lib/mock';

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  gender: string | null;
  age: number | null;
  countryCode: string | null;
  region: string | null;
  bio: string | null;
  isPremium: boolean;
  premiumTier: string;
  isVerified: boolean;
  isCreator: boolean;
  creatorStatus: string | null;
  onboardingStep: string | null;
  onlineStatus: boolean;
  interests: string[];
  languages: string[];
  lastActiveAt: string | null;
  status: string;
  rating?: number | null;
  isOwn?: boolean;
  isFollowing?: boolean;
  followers?: number;
  following?: number;
  profileViews?: number;
}

export type FeedUser = MockUser & {
  compatibilityScore?: number;
  matchLabel?: string;
  premiumTier?: string;
};

export function mapUser(u: PublicUser, extra?: { compatibilityScore?: number; matchLabel?: string }): FeedUser {
  const gender = (u.gender || '').toLowerCase();
  const badges: string[] = [];
  if (u.isCreator) badges.push('TRENDING');
  if (!u.isVerified && !u.isCreator) badges.push('NEW');

  const base: MockUser = {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    age: u.age ?? 0,
    countryCode: u.countryCode ?? '',
    city: u.region || u.countryCode || undefined,
    bio: u.bio ?? '',
    gender: gender === 'male' || gender === 'female' ? (gender as MockUser['gender']) : 'other',
    isCreator: u.isCreator,
    isPremium: u.isPremium,
    isVerified: u.isVerified,
    onlineStatus: u.onlineStatus,
    interests: u.interests ?? [],
    languages: u.languages ?? [],
    badges,
    profileViews: u.profileViews ?? 0,
    followers: u.followers ?? 0,
    following: u.following ?? 0,
    rating: u.rating ?? undefined,
  };
  const out = {
    ...base,
    premiumTier: u.premiumTier ?? 'FREE',
    isFollowing: u.isFollowing ?? false,
    compatibilityScore: extra?.compatibilityScore,
    matchLabel: extra?.matchLabel,
  };
  return out as FeedUser;
}

export function mapFeed(u: PublicUser & { compatibilityScore?: number; matchLabel?: string }): FeedUser {
  return mapUser(u, { compatibilityScore: u.compatibilityScore, matchLabel: u.matchLabel });
}