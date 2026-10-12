import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { authRoutes } from '../routes/auth';
import { userRoutes } from '../routes/users';
import { errorHandler } from '../middleware/errors';

// Mock DB
const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userFindFirst: vi.fn(),
  userCreate: vi.fn(),
  userUpdate: vi.fn(),
}));

vi.mock('@vuzki/database', () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      findFirst: mocks.userFindFirst,
      create: mocks.userCreate,
      update: mocks.userUpdate,
    },
    session: { 
      create: vi.fn().mockResolvedValue({ id: 's1' }),
      update: vi.fn().mockResolvedValue({ id: 's1' })
    },
    referral: { create: vi.fn() },
    profile: { upsert: vi.fn(), create: vi.fn() },
    profilePreferences: { upsert: vi.fn(), create: vi.fn() },
    $transaction: vi.fn((cb) => cb({
      user: { update: mocks.userUpdate },
      profileInterest: { deleteMany: vi.fn(), createMany: vi.fn() },
      profileLanguage: { deleteMany: vi.fn(), createMany: vi.fn() },
      profile: { upsert: vi.fn() },
      profilePreferences: { upsert: vi.fn() },
    })),
  }
}));

// Mock rate limiter
vi.mock('../middleware/rateLimit', () => ({ rateLimiter: () => (_req: any, _res: any, next: any) => next() }));

// Mock Auth Middleware for user routes
vi.mock('../middleware/auth', () => ({
  authenticate: () => (req: any, _res: any, next: any) => {
    req.auth = { userId: 'u1', sessionId: 's1' };
    next();
  },
}));

// Mock oauth
vi.mock('../services/oauth', () => ({
  verifyGoogleToken: vi.fn(),
}));

// Mock otp
vi.mock('../services/otp', () => ({
  sendOtp: vi.fn().mockResolvedValue({ sent: true }),
  verifyOtp: vi.fn().mockResolvedValue(true),
}));

import { verifyGoogleToken } from '../services/oauth';
import { sendOtp, verifyOtp } from '../services/otp';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use(errorHandler);
  return app;
}

describe('Authentication Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Registration Form Validation & Email OTP', () => {
    it('sends registration OTP only to valid Gmail and never to phone', async () => {
      mocks.userFindUnique.mockResolvedValueOnce(null);
      const res = await request(buildApp()).post('/api/v1/auth/send-otp').send({
        identifier: 'newuser@gmail.com',
        purpose: 'registration',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(sendOtp).toHaveBeenCalledWith('newuser@gmail.com', 'registration');
    });

    it('rejects registration OTP for non-gmail addresses', async () => {
      const res = await request(buildApp()).post('/api/v1/auth/send-otp').send({
        identifier: 'newuser@yahoo.com',
        purpose: 'registration',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_EMAIL_DOMAIN');
    });

    it('rejects sending registration OTP to phone numbers', async () => {
      const res = await request(buildApp()).post('/api/v1/auth/send-otp').send({
        identifier: '+919876543210',
        purpose: 'registration',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_EMAIL');
    });

    it('rejects registration without OTP', async () => {
      const res = await request(buildApp()).post('/api/v1/auth/register').send({
        provider: 'local',
        name: 'Test User',
        email: 'testuser@gmail.com',
        phone: '+919876543210',
        password: 'Password123!',
        dob: '2000-01-01',
        gender: 'MALE',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('OTP_REQUIRED');
    });

    it('rejects registration with invalid or expired OTP', async () => {
      vi.mocked(verifyOtp).mockRejectedValueOnce(new Error('OTP_EXPIRED'));
      const res = await request(buildApp()).post('/api/v1/auth/register').send({
        provider: 'local',
        name: 'Test User',
        email: 'testuser@gmail.com',
        phone: '+919876543210',
        password: 'Password123!',
        dob: '2000-01-01',
        gender: 'MALE',
        otp: '123456',
      });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('OTP_EXPIRED');
    });

    it('rejects duplicate phone number during registration', async () => {
      vi.mocked(verifyOtp).mockResolvedValueOnce(true);
      mocks.userFindUnique.mockResolvedValueOnce(null); // email available
      mocks.userFindUnique.mockResolvedValueOnce({ id: 'u_phone_holder', phone: '+919876543210' }); // phone taken

      const res = await request(buildApp()).post('/api/v1/auth/register').send({
        provider: 'local',
        name: 'Test User',
        email: 'newuser@gmail.com',
        phone: '+919876543210',
        password: 'Password123!',
        dob: '2000-01-01',
        gender: 'MALE',
        otp: '123456',
      });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('PHONE_EXISTS');
    });

    it('successfully registers adult user with valid email OTP and normalized mobile number', async () => {
      vi.mocked(verifyOtp).mockResolvedValueOnce(true);
      mocks.userFindUnique.mockResolvedValueOnce(null); // email available
      mocks.userFindUnique.mockResolvedValueOnce(null); // phone available
      mocks.userFindUnique.mockResolvedValueOnce(null); // username available
      mocks.userCreate.mockResolvedValueOnce({
        id: 'u_new',
        email: 'newuser@gmail.com',
        phone: '+919876543210',
        displayName: 'Test User',
        emailVerified: true,
      });

      const res = await request(buildApp()).post('/api/v1/auth/register').send({
        provider: 'local',
        name: 'Test User',
        email: 'newuser@gmail.com',
        phone: '9876543210', // 10 digit Indian number
        countryCode: '+91',
        password: 'Password123!',
        dob: '2000-01-01',
        gender: 'MALE',
        otp: '123456',
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mocks.userCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          email: 'newuser@gmail.com',
          phone: '+919876543210',
          emailVerified: true,
          gender: 'MALE',
        }),
      }));
    });
  });

  describe('Mobile & Email Login', () => {
    it('sends login OTP to registered email when mobile number is provided without revealing account existence', async () => {
      // User exists with phone and email
      mocks.userFindUnique.mockResolvedValueOnce({
        id: 'u_phone_user',
        email: 'phoneuser@gmail.com',
        phone: '+919876543210',
      });

      const res = await request(buildApp()).post('/api/v1/auth/send-otp').send({
        identifier: '+919876543210',
        purpose: 'login',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // verify sendOtp received normalized phone as identifier and user.email as recipientEmail
      expect(sendOtp).toHaveBeenCalledWith('+919876543210', 'login', 'phoneuser@gmail.com');
    });

    it('returns generic success when mobile number does not exist to avoid user enumeration', async () => {
      mocks.userFindUnique.mockResolvedValueOnce(null);

      const res = await request(buildApp()).post('/api/v1/auth/send-otp').send({
        identifier: '+919999999999',
        purpose: 'login',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(sendOtp).not.toHaveBeenCalled();
    });

    it('logs in successfully using mobile number and verified OTP', async () => {
      vi.mocked(verifyOtp).mockResolvedValueOnce(true);
      mocks.userFindFirst.mockResolvedValueOnce({
        id: 'u_phone_user',
        email: 'phoneuser@gmail.com',
        phone: '+919876543210',
        status: 'ACTIVE',
        premiumTier: 'FREE',
        premiumExpiresAt: null,
        onboardingStep: 'COMPLETE',
      });
      mocks.userFindUnique.mockResolvedValueOnce({
        id: 'u_phone_user',
        email: 'phoneuser@gmail.com',
        phone: '+919876543210',
        status: 'ACTIVE',
        premiumTier: 'FREE',
        premiumExpiresAt: null,
        onboardingStep: 'COMPLETE',
      });

      const res = await request(buildApp()).post('/api/v1/auth/login').send({
        identifier: '+919876543210',
        otp: '654321',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(verifyOtp).toHaveBeenCalledWith('+919876543210', '654321', 'login');
    });
  });

  describe('Google OAuth Security', () => {
    it('rejects forged providerId without token', async () => {
      const res = await request(buildApp()).post('/api/v1/auth/register').send({
        provider: 'google',
        providerId: 'forged_id_123',
        gender: 'MALE',
        dob: '1990-01-01',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('TOKEN_REQUIRED');
    });

    it('rejects invalid Google token', async () => {
      vi.mocked(verifyGoogleToken).mockRejectedValueOnce(new Error('Invalid token'));
      const res = await request(buildApp()).post('/api/v1/auth/register').send({
        provider: 'google',
        token: 'invalid_jwt',
        gender: 'MALE',
        dob: '1990-01-01',
      });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_OAUTH_TOKEN');
    });

    it('accepts valid Google token', async () => {
      vi.mocked(verifyGoogleToken).mockResolvedValueOnce({
        providerId: 'google_valid_id',
        email: 'test_google@example.com',
        name: 'Test Google',
      });
      mocks.userFindFirst.mockResolvedValueOnce(null); // Not existing
      mocks.userFindUnique.mockResolvedValueOnce(null); // identifier existing check
      mocks.userCreate.mockResolvedValueOnce({ id: 'u2', email: 'test_google@example.com' });

      const res = await request(buildApp()).post('/api/v1/auth/register').send({
        provider: 'google',
        token: 'valid_google_token',
        dob: '1990-01-01',
        gender: 'MALE',
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('links account and logs in when user already exists with matching verified Google email', async () => {
      vi.mocked(verifyGoogleToken).mockResolvedValueOnce({
        providerId: 'google_existing_123',
        email: 'existing_user@example.com',
        name: 'Existing User',
      });
      const mockExistingUser = {
        id: 'u_existing',
        email: 'existing_user@example.com',
        provider: 'local',
        providerId: null,
        premiumTier: 'FREE',
        premiumExpiresAt: null,
        onboardingStep: 'COMPLETE',
      };
      // User not found by providerId
      mocks.userFindFirst.mockResolvedValueOnce(null);
      // User found by email
      mocks.userFindUnique.mockResolvedValueOnce(mockExistingUser);
      // Update returns updated user
      mocks.userUpdate.mockResolvedValueOnce({
        ...mockExistingUser,
        provider: 'google',
        providerId: 'google_existing_123',
        emailVerified: true,
      });
      // loginExistingUser calls findUnique with include: { profile: true, ... }
      mocks.userFindUnique.mockResolvedValueOnce({
        ...mockExistingUser,
        provider: 'google',
        providerId: 'google_existing_123',
        emailVerified: true,
      });

      const res = await request(buildApp()).post('/api/v1/auth/register').send({
        provider: 'google',
        token: 'valid_google_token_for_existing',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe('u_existing');
      expect(mocks.userUpdate).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'u_existing' },
        data: expect.objectContaining({
          authProvider: 'google',
          providerId: 'google_existing_123',
          emailVerified: true,
        }),
      }));
    });
  });

  describe('Age Restriction', () => {
    it('rejects underage registration (DOB)', async () => {
      const res = await request(buildApp()).post('/api/v1/auth/register').send({
        provider: 'local',
        email: 'underage@gmail.com',
        phone: '+919876543210',
        password: 'Password123!',
        dob: new Date().toISOString(), // Today (0 years old)
        gender: 'MALE',
        otp: '123456',
      });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('UNDERAGE');
    });

    it('rejects future DOB', async () => {
      const res = await request(buildApp()).post('/api/v1/auth/register').send({
        provider: 'local',
        email: 'future@gmail.com',
        phone: '+919876543210',
        password: 'Password123!',
        dob: '2050-01-01',
        gender: 'MALE',
        otp: '123456',
      });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('UNDERAGE');
    });
  });

  describe('Onboarding Bypass Prevention', () => {
    it('prevents completing onboarding without required fields', async () => {
      mocks.userFindUnique.mockResolvedValueOnce({
        id: 'u1',
        displayName: null,
        gender: null,
        dateOfBirth: null,
      });

      const res = await request(buildApp())
        .put('/api/v1/users/me/profile')
        .send({
          onboardingStep: 'COMPLETE',
        });
        
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INCOMPLETE_PROFILE');
    });
  });
});
