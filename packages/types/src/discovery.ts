import { ProfileCard } from './user';

export interface DiscoveryQuery {
  limit?: number;
  cursor?: string;
  mode?: 'random' | 'interests' | 'nearby' | 'online' | 'new' | 'recommended' | 'talks';
  gender?: string;
  minAge?: number;
  maxAge?: number;
  language?: string;
  interest?: string;
  country?: string;
  isPremiumOnly?: boolean;
  isVerifiedOnly?: boolean;
  isCreator?: boolean;
  sortBy?: 'compatibility' | 'distance' | 'newest' | 'online';
}

export interface DiscoveryResponse {
  items: ProfileCard[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

export interface LikePayload {
  userId: string;
  type: 'like' | 'super_like';
  replyTo?: string;
}

export interface LikeResult {
  liked: boolean;
  isMatch: boolean;
  conversationId?: string;
  matchId?: string;
}

export interface CompatibilityResult {
  userId: string;
  otherUserId: string;
  score: number;
  factors: CompatibilityFactor[];
}

export interface CompatibilityFactor {
  name: string;
  weight: number;
  value: number;
  matchedValues: string[];
}
