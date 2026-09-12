export interface UpdateProfilePayload {
  displayName?: string;
  bio?: string;
  gender?: string;
  dateOfBirth?: string;
  countryCode?: string;
  region?: string;
  languages?: string[];
  interests?: string[];
  avatarUrl?: string;
  preferences?: ProfilePreferences;
}

export interface ProfilePreferences {
  ageRangeFrom: number;
  ageRangeTo: number;
  genderPreference: 'all' | 'male' | 'female' | 'other';
  maxDistanceKm: number;
  showOnlineOnly: boolean;
  showVerifiedOnly: boolean;
  showOnlineStatus: boolean;
  discoveryEnabled: boolean;
  publicProfileEnabled: boolean;
}

export interface SearchParams {
  query?: string;
  gender?: string;
  minAge?: number;
  maxAge?: number;
  language?: string;
  interest?: string;
  isCreator?: boolean;
  isOnline?: boolean;
  country?: string;
  page?: number;
  limit?: number;
}

export interface ProfileCard {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  age: number | null;
  countryCode: string | null;
  bio: string | null;
  interests: string[];
  languages: string[];
  isPremium: boolean;
  premiumTier: string;
  isVerified: boolean;
  isCreator: boolean;
  creatorAvailability: string | null;
  onlineStatus: boolean;
  lastActiveAt: Date | null;
  compatibilityScore?: number;
  distanceKm?: number | null;
  matchedLanguages: string[];
  matchedInterests: string[];
}
