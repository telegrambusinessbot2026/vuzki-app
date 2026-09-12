import { Gender, AccountStatus, OnboardingStep, PremiumTier } from '@vuzki/shared';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: UserPublic;
  tokens: AuthTokens;
  needsOnboarding: boolean;
  onboardingStep: OnboardingStep;
}

export interface OtpVerifyPayload {
  identifier: string;
  otp: string;
}

export interface OtpSendPayload {
  identifier: string;
  via: 'email' | 'phone';
  purpose: 'registration' | 'login' | 'password_reset';
}

export interface RegisterPayload {
  email?: string;
  phone?: string;
  password?: string;
  otp?: string;
  provider?: 'local' | 'google' | 'apple';
  providerId?: string;
  name?: string;
}

export interface LoginPayload {
  identifier: string;
  password?: string;
  otp?: string;
}

export interface UserPublic {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  gender: Gender;
  age: number | null;
  countryCode: string | null;
  isPremium: boolean;
  premiumTier: PremiumTier;
  isVerified: boolean;
  isCreator: boolean;
  status: AccountStatus;
  onlineStatus: boolean;
  bio: string | null;
  interests: string[];
  languages: string[];
  lastActiveAt: Date | null;
}

export interface UserPrivate extends UserPublic {
  email: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
  onboardingStep: OnboardingStep;
  coinBalance: number;
}
