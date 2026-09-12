import { Request, Response, NextFunction } from 'express';
import { User } from '@prisma/client';
import { ageFromDateOfBirth } from '@vuzki/utils';

export type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function wrap(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// Serialize user to public DTO (no private info like email/phone revealed unnecessarily)
export function toPublicUser(user: any) {
  const isPremium = user.premiumTier !== 'FREE' && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    gender: user.gender,
    age: user.dateOfBirth ? ageFromDateOfBirth(user.dateOfBirth) : null,
    countryCode: user.countryCode,
    region: user.region,
    bio: user.bio,
    isPremium,
    premiumTier: user.premiumTier,
    isVerified: user.isVerified,
    isCreator: user.isCreator,
    creatorStatus: user.creatorStatus,
    onlineStatus: user.onlineStatus,
    lastActiveAt: user.lastActiveAt,
    interests: user.profile?.interests ?? [],
    languages: user.profile?.languages ?? [],
    status: user.status,
    rating: user.creator?.rating ?? null,
    isAdmin: false,
  };
}

// Full serialization for own profile
export function toSelfUser(user: any) {
  return {
    ...toPublicUser(user),
    email: user.email,
    phone: user.phone,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    dateOfBirth: user.dateOfBirth,
    onboardingStep: user.onboardingStep,
    referralCode: user.referralCode,
    wallet: { balance: user.wallet?.balance ?? 0, currency: user.wallet?.currency ?? 'INR' },
    preferences: user.preferences,
    hasActiveSubscription: user.subscriptions?.some((s: any) => s.status === 'ACTIVE') ?? false,
  };
}
