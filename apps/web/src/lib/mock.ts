export interface MockUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  age: number;
  countryCode: string;
  city?: string;
  bio: string;
  gender: 'female' | 'male' | 'other';
  isCreator: boolean;
  isPremium: boolean;
  isVerified: boolean;
  onlineStatus: boolean;
  interests: string[];
  languages: string[];
  profileViews?: number;
  totalCoins?: number;
  followers?: number;
  following?: number;
  rating?: number;
  badges: string[];
  distance?: string;
}
