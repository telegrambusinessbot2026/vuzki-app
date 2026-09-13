import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@vuzki/database';
import { ApiErrorResponse } from '@vuzki/types';
import { hashPassword, verifyPassword, generateReferralCode, isValidEmail, isValidPhone, isValidPassword, isValidOtp, isAdult } from '@vuzki/utils';
import { wrap, toSelfUser } from './helpers';
import { rateLimiter } from '../middleware/rateLimit';
import { issueTokens, verifyRefreshToken, signRefreshToken } from '../services/jwt';
import { sendOtp, verifyOtp } from '../services/otp';
import { creditCoins, getWallet } from '../services/wallet';
import { authenticate, AuthedRequest } from '../middleware/auth';
import {
  AccountStatus,
  OnboardingStep,
  PremiumTier,
  REFERRAL_REWARD_COINS,
  WalletTransactionType,
} from '@vuzki/shared';

export const authRoutes = Router();

const registerSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(8).optional(),
  provider: z.enum(['local', 'google', 'apple']).default('local'),
  providerId: z.string().optional(),
  name: z.string().optional(),
  username: z.string().optional(),
  gender: z.string().optional(),
  age: z.number().int().min(18).max(120).optional(),
  countryCode: z.string().max(3).optional(),
  referralCode: z.string().optional(),
  otp: z.string().optional(),
});

// POST /auth/send-otp
authRoutes.post('/send-otp', rateLimiter(15 * 60 * 1000, 8), wrap(async (req, res) => {
  const { identifier, purpose } = z.object({
    identifier: z.string(),
    purpose: z.enum(['registration', 'login', 'password_reset']),
  }).parse(req.body);

  if (!isValidEmail(identifier) && !isValidPhone(identifier)) {
    throw new ApiErrorResponse(400, 'INVALID_IDENTIFIER', 'Provide a valid email or phone');
  }
  await sendOtp(identifier, purpose);
  res.json({ success: true, data: { sent: true } });
}));

// POST /auth/register
authRoutes.post('/register', rateLimiter(15 * 60 * 1000, 5), wrap(async (req, res) => {
  const body = registerSchema.parse(req.body);

  if (body.provider === 'local') {
    if (!body.email && !body.phone) throw new ApiErrorResponse(400, 'IDENTIFIER_REQUIRED', 'Email or phone is required');
    if (!body.password || !isValidPassword(body.password)) {
      throw new ApiErrorResponse(400, 'WEAK_PASSWORD', 'Password must be at least 8 chars with letters and numbers');
    }
    if (body.email && !isValidEmail(body.email)) throw new ApiErrorResponse(400, 'INVALID_EMAIL', 'Invalid email');
    if (body.phone && !isValidPhone(body.phone)) throw new ApiErrorResponse(400, 'INVALID_PHONE', 'Invalid phone');
  } else if (body.provider === 'google' || body.provider === 'apple') {
    if (!body.providerId) throw new ApiErrorResponse(400, 'PROVIDER_ID_REQUIRED', 'Provider ID required');
    const existing = await prisma.user.findFirst({ where: { authProvider: body.provider, providerId: body.providerId } });
    if (existing) {
      // log them in
      return loginExistingUser(res, existing);
    }
  }

  const identifier = body.email || body.phone;
  const existing = body.email
    ? await prisma.user.findUnique({ where: { email: body.email } })
    : body.phone
    ? await prisma.user.findUnique({ where: { phone: body.phone } })
    : null;
  if (existing) {
    throw new ApiErrorResponse(409, 'ACCOUNT_EXISTS', 'An account with this identity already exists', undefined, {
      identifier: 'Account already exists. Try logging in.',
    });
  }

  let username = await generateUniqueUsername((body.username || body.name || 'user').toLowerCase());

  // Derive dateOfBirth from `age` (year-accurate; the user can refine later).
  const dateOfBirth: Date | undefined =
    typeof body.age === 'number' ? new Date(new Date().getFullYear() - body.age, 0, 1) : undefined;

  // reward referrer if referral code present
  const referralCode = (body.referralCode || (req.body.referralCode as string) || '').toUpperCase() || null;
  const referrer = referralCode ? await prisma.user.findUnique({ where: { referralCode } }) : null;

  const user = await prisma.user.create({
    data: {
      email: body.email || null,
      phone: body.phone || null,
      passwordHash: body.provider === 'local' ? await hashPassword(body.password!) : null,
      authProvider: body.provider,
      providerId: body.providerId,
      username,
      displayName: body.name || username,
      gender: body.gender || undefined,
      countryCode: body.countryCode || undefined,
      dateOfBirth: dateOfBirth || undefined,
      referralCode: generateReferralCode(),
      referredById: referrer?.id || null,
      onboardingStep: OnboardingStep.NONE,
      status: AccountStatus.ACTIVE,
      wallet: { create: {} },
    },
  });

  // referral tracking
  if (referrer) {
    await prisma.referral.create({
      data: { referrerId: referrer.id, referredUserId: user.id, status: 'PENDING' },
    });
    // Fraud check: flag suspicious referral patterns (self-referral, farming,
    // same-device clusters) for finance/admin review.
    const { checkReferralFraud } = await import('../services/fraud');
    checkReferralFraud({ referrerId: referrer.id, referredUserId: user.id, deviceId: req.body.deviceId, ipAddress: req.ip }).catch(() => {});
  }

  const session = await createSession(user.id, req);

  const tokens = issueTokens({ userId: user.id, sessionId: session.id });

  await creditCoins(user.id, 0, WalletTransactionType.ADJUSTMENT, { note: 'account created' }).catch(() => {});

  res.status(201).json({
    success: true,
    data: {
      user: toSelfUser(user),
      tokens,
      needsOnboarding: true,
      onboardingStep: OnboardingStep.NONE,
    },
  });
}));

async function loginExistingUser(res: any, user: any) {
  const session = await createSession(user.id, res.req);
  const tokens = issueTokens({ userId: user.id, sessionId: session.id });
  const full = await prisma.user.findUnique({ where: { id: user.id }, include: { wallet: true, preferences: true, subscriptions: { where: { status: 'ACTIVE' } } } });
  const needsOnboarding = user.onboardingStep !== OnboardingStep.COMPLETE;
  res.json({
    success: true,
    data: {
      user: toSelfUser(full),
      tokens,
      needsOnboarding,
      onboardingStep: user.onboardingStep,
    },
  });
}

// POST /auth/login
authRoutes.post('/login', rateLimiter(15 * 60 * 1000, 10), wrap(async (req, res) => {
  const { identifier, password, otp } = z.object({
    identifier: z.string(),
    password: z.string().optional(),
    otp: z.string().optional(),
  }).parse(req.body);

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { phone: identifier }],
      authProvider: 'local',
    },
  });

  if (!user) throw new ApiErrorResponse(401, 'INVALID_CREDENTIALS', 'Invalid credentials');

  if (user.status === AccountStatus.BANNED) throw new ApiErrorResponse(403, 'BANNED', 'This account is banned');
  if (user.status === AccountStatus.SUSPENDED) throw new ApiErrorResponse(403, 'SUSPENDED', 'Account suspended');

  if (otp) {
    if (!isValidOtp(otp)) throw new ApiErrorResponse(400, 'INVALID_OTP', 'Invalid OTP');
    await verifyOtp(identifier, otp, 'login').catch(() => {
      throw new ApiErrorResponse(401, 'INVALID_OTP', 'Invalid or expired OTP');
    });
  } else if (password) {
    if (!user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      throw new ApiErrorResponse(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }
  } else {
    throw new ApiErrorResponse(400, 'CREDENTIAL_REQUIRED', 'Password or OTP required');
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const session = await createSession(user.id, req);
  const tokens = issueTokens({ userId: user.id, sessionId: session.id });
  const full = await prisma.user.findUnique({ where: { id: user.id }, include: { wallet: true, preferences: true, subscriptions: { where: { status: 'ACTIVE' } } } });
  const needsOnboarding = user.onboardingStep !== OnboardingStep.COMPLETE;

  res.json({
    success: true,
    data: {
      user: toSelfUser(full),
      tokens,
      needsOnboarding,
      onboardingStep: user.onboardingStep,
    },
  });
}));

async function createSession(userId: string, req: any) {
  const token = signRefreshToken({ userId, sessionId: 'pending' });
  const session = await prisma.session.create({
    data: {
      userId,
      refreshToken: token,
      deviceName: req.headers['user-agent']?.slice(0, 200) || 'unknown',
      deviceType: 'web',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']?.slice(0, 500) || null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  const finalToken = signRefreshToken({ userId, sessionId: session.id });
  await prisma.session.update({ where: { id: session.id }, data: { refreshToken: finalToken } });
  return { ...session, refreshToken: finalToken };
}

// POST /auth/refresh
authRoutes.post('/refresh', rateLimiter(60 * 1000, 60), wrap(async (req, res) => {
  const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiErrorResponse(401, 'INVALID_REFRESH', 'Invalid refresh token');
  }
  const session = await prisma.session.findFirst({ where: { id: payload.sessionId } });
  if (!session || !session.isActive || session.expiresAt < new Date()) {
    throw new ApiErrorResponse(401, 'REFRESH_EXPIRED', 'Session expired, please log in');
  }

  // Reuse detection + rotation: only the CURRENT stored refresh token is valid.
  // If the presented token is not the session's latest token, a prior token was
  // replayed (classic theft/replay attack) -> revoke the entire session so the
  // attacker cannot keep refreshing with a stolen token.
  if (session.refreshToken !== refreshToken) {
    await prisma.session.update({ where: { id: session.id }, data: { isActive: false } });
    throw new ApiErrorResponse(401, 'REFRESH_REUSED', 'Session revoked, please log in');
  }

  // Rotate: issue a brand-new refresh token and store it on the session so the
  // just-presented token can never be used again. Each refresh yields a fresh
  // token; an old one is instantly invalidated server-side.
  const tokens = issueTokens({ userId: payload.userId, sessionId: session.id });
  await prisma.session.update({
    where: { id: session.id },
    data: { refreshToken: tokens.refreshToken, lastUsedAt: new Date() },
  });
  res.json({ success: true, data: { tokens } });
}));

// POST /auth/logout - revoke the current session (authenticated) and/or a
// provided refresh token. Requires authentication so a user can only revoke
// their own session, and an access token cannot outlive its session afterwards.
authRoutes.post('/logout', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const { refreshToken } = z.object({ refreshToken: z.string().optional() }).parse(req.body ?? {});

  // Revoke the current access token's session server-side.
  if (req.auth?.sessionId) {
    await prisma.session.updateMany({
      where: { id: req.auth.sessionId, userId: req.auth!.userId, isActive: true },
      data: { isActive: false },
    });
  }

  // Also revoke a provided refresh token if it belongs to this user.
  if (refreshToken) {
    await prisma.session.updateMany({
      where: { refreshToken, userId: req.auth!.userId },
      data: { isActive: false },
    });
  }

  res.json({ success: true });
}));

// POST /auth/change-password - change the password for a logged-in local account
authRoutes.post('/change-password', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const { currentPassword, newPassword } = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  }).parse(req.body);

  if (!isValidPassword(newPassword)) throw new ApiErrorResponse(400, 'WEAK_PASSWORD', 'Weak password');

  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user) throw new ApiErrorResponse(404, 'USER_NOT_FOUND', 'User not found');
  if (user.authProvider !== 'local' || !user.passwordHash) {
    throw new ApiErrorResponse(400, 'NO_PASSWORD', 'This account has no password (social login)');
  }
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new ApiErrorResponse(401, 'INVALID_PASSWORD', 'Current password is incorrect');
  }

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });

  // Revoke every OTHER active session so a leaked password stops working
  // elsewhere; the current session stays signed in.
  if (req.auth?.sessionId) {
    await prisma.session.updateMany({
      where: { userId: user.id, isActive: true, id: { not: req.auth.sessionId } },
      data: { isActive: false },
    });
  }

  res.json({ success: true, data: { changed: true } });
}));

// POST /auth/forgot-password
authRoutes.post('/forgot-password', rateLimiter(15 * 60 * 1000, 5), wrap(async (req, res) => {
  const { identifier } = z.object({ identifier: z.string() }).parse(req.body);
  const user = await prisma.user.findFirst({ where: { OR: [{ email: identifier }, { phone: identifier }] } });
  if (!user) {
    // Don't reveal existence
    return res.json({ success: true, data: { sent: true } });
  }
  await sendOtp(identifier, 'password_reset');
  res.json({ success: true, data: { sent: true } });
}));

// POST /auth/reset-password
authRoutes.post('/reset-password', rateLimiter(15 * 60 * 1000, 5), wrap(async (req, res) => {
  const { identifier, otp, newPassword } = z.object({
    identifier: z.string(),
    otp: z.string(),
    newPassword: z.string().min(8),
  }).parse(req.body);

  if (!isValidPassword(newPassword)) throw new ApiErrorResponse(400, 'WEAK_PASSWORD', 'Weak password');

  await verifyOtp(identifier, otp, 'password_reset').catch(() => {
    throw new ApiErrorResponse(401, 'INVALID_OTP', 'Invalid or expired OTP');
  });

  const user = await prisma.user.findFirst({ where: { OR: [{ email: identifier }, { phone: identifier }] } });
  if (!user) throw new ApiErrorResponse(404, 'USER_NOT_FOUND', 'User not found');

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
  await prisma.session.updateMany({ where: { userId: user.id }, data: { isActive: false } });

  res.json({ success: true, data: { reset: true } });
}));

// GET /auth/me
authRoutes.get('/me', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    include: { wallet: true, preferences: true, subscriptions: { where: { status: 'ACTIVE' } } },
  });
  if (!user) throw new ApiErrorResponse(404, 'USER_NOT_FOUND', 'User not found');
  res.json({ success: true, data: { user: toSelfUser(user) } });
}));

// GET /auth/devices
authRoutes.get('/devices', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const devices = await prisma.session.findMany({
    where: { userId: req.auth!.userId },
    orderBy: { lastUsedAt: 'desc' },
    select: { id: true, deviceName: true, deviceType: true, ipAddress: true, lastUsedAt: true, isActive: true },
  });
  res.json({ success: true, data: { devices } });
}));

// DELETE /auth/devices/:id
authRoutes.delete('/devices/:id', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const session = await prisma.session.findFirst({ where: { id: req.params.id, userId: req.auth!.userId } });
  if (!session) throw new ApiErrorResponse(404, 'DEVICE_NOT_FOUND', 'Device not found');
  await prisma.session.update({ where: { id: session.id }, data: { isActive: false } });
  res.json({ success: true });
}));

// POST /auth/verify (complete registration with OTP if phone/email verification needed)
authRoutes.post('/verify', rateLimiter(15 * 60 * 1000, 8), wrap(async (req, res) => {
  const { identifier, otp } = z.object({ identifier: z.string(), otp: z.string() }).parse(req.body);
  if (!isValidOtp(otp)) throw new ApiErrorResponse(400, 'INVALID_OTP', 'Invalid OTP');
  await verifyOtp(identifier, otp, 'registration').catch(() => {
    throw new ApiErrorResponse(401, 'INVALID_OTP', 'Invalid or expired OTP');
  });
  const user = await prisma.user.findFirst({ where: { OR: [{ email: identifier }, { phone: identifier }] } });
  if (user) {
    if (user.email === identifier) await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    if (user.phone === identifier) await prisma.user.update({ where: { id: user.id }, data: { phoneVerified: true } });
  }
  res.json({ success: true, data: { verified: true } });
}));

async function generateUniqueUsername(base: string): Promise<string> {
  let username = sanitizeUsername(base) || `user${Math.floor(Math.random() * 10000)}`;
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? username : `${username}${i}`;
    const exists = await prisma.user.findUnique({ where: { username: candidate } });
    if (!exists) return candidate;
  }
  return `user${Date.now().toString(36)}`;
}

function sanitizeUsername(u: string): string {
  return u.replace(/[^a-zA-Z0-9_.]/g, '').slice(0, 20);
}
