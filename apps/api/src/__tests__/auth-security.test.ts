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
  verifyAppleToken: vi.fn(),
}));

import { verifyGoogleToken, verifyAppleToken } from '../services/oauth';

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
  });

  describe('Apple OAuth Security', () => {
    it('rejects forged providerId without token', async () => {
      const res = await request(buildApp()).post('/api/v1/auth/register').send({
        provider: 'apple',
        providerId: 'forged_apple_id',
        gender: 'MALE',
        dob: '1990-01-01',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('TOKEN_REQUIRED');
    });

    it('rejects invalid Apple token', async () => {
      vi.mocked(verifyAppleToken).mockRejectedValueOnce(new Error('Invalid token'));
      const res = await request(buildApp()).post('/api/v1/auth/register').send({
        provider: 'apple',
        token: 'invalid_apple_jwt',
        gender: 'MALE',
        dob: '1990-01-01',
      });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_OAUTH_TOKEN');
    });
  });

  describe('Age Restriction', () => {
    it('rejects underage registration (DOB)', async () => {
      const res = await request(buildApp()).post('/api/v1/auth/register').send({
        provider: 'local',
        email: 'underage@gmail.com',
        password: 'Password123!',
        dob: new Date().toISOString(), // Today (0 years old)
        gender: 'MALE',
      });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('UNDERAGE');
    });

    it('accepts valid adult registration (DOB)', async () => {
      mocks.userFindUnique.mockResolvedValueOnce(null); // check email
      mocks.userCreate.mockResolvedValueOnce({ id: 'u1' });
      
      const res = await request(buildApp()).post('/api/v1/auth/register').send({
        provider: 'local',
        email: 'adult@gmail.com',
        password: 'Password123!',
        dob: '2000-01-01',
        gender: 'MALE',
      });
      if (res.status !== 201) console.log('RESPONSE:', res.body);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('rejects future DOB', async () => {
      const res = await request(buildApp()).post('/api/v1/auth/register').send({
        provider: 'local',
        email: 'future@gmail.com',
        password: 'Password123!',
        dob: '2050-01-01',
        gender: 'MALE',
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
