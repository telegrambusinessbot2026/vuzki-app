import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Module under test: authRoutes /auth/refresh (refresh-token rotation) ---
// We mount the real auth router on a slim express app and drive it with
// supertest, mocking only the DB/config/jwt/rate-limit seams.

const mocks = vi.hoisted(() => {
  const sessionFindFirst = vi.fn();
  const sessionUpdate = vi.fn();
  return { sessionFindFirst, sessionUpdate };
});

vi.mock('@vuzki/database', () => ({
  prisma: {
    session: { findFirst: mocks.sessionFindFirst, update: mocks.sessionUpdate },
    user: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    welcome: { findFirst: vi.fn() },
  },
}));

vi.mock('../config', () => ({
  config: {
    jwtSecret: 'test-secret',
    jwtRefreshSecret: 'test-refresh-secret',
    accessTokenTtl: '15m',
    refreshTokenTtlDays: 30,
    otpProvider: 'dev',
    smtpUser: '',
    isProd: false,
  },
}));

// Seam over JWT to inspect/replay the tokens deterministically.
const jwtMocks = vi.hoisted(() => ({
  verifyRefreshToken: vi.fn(),
  issueTokens: vi.fn(),
  signRefreshToken: vi.fn(),
}));

vi.mock('../services/jwt', () => ({
  verifyRefreshToken: jwtMocks.verifyRefreshToken,
  issueTokens: jwtMocks.issueTokens,
  signRefreshToken: jwtMocks.signRefreshToken,
}));

// Rate limiter is a no-op in these unit tests.
vi.mock('../middleware/rateLimit', () => ({
  rateLimiter: () => (_req: any, _res: any, next: any) => next(),
}));

import express from 'express';
import request from 'supertest';
import { authRoutes } from '@/routes/auth';
import { errorHandler } from '@/middleware/errors';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRoutes);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('auth: /auth/refresh refresh-token rotation + reuse detection', () => {
  it('rotates the refresh token and stores the new one on the session', async () => {
    jwtMocks.verifyRefreshToken.mockReturnValue({ userId: 'u1', sessionId: 's1' });
    jwtMocks.issueTokens.mockReturnValue({
      accessToken: 'access-new',
      refreshToken: 'refresh-new',
      expiresIn: '15m',
    });
    mocks.sessionFindFirst.mockResolvedValue({
      id: 's1',
      userId: 'u1',
      isActive: true,
      expiresAt: new Date(Date.now() + 60_000),
      refreshToken: 'refresh-old',
    });
    // verifyRefreshToken mock is the only `findFirst` usage path here.
    mocks.sessionUpdate.mockResolvedValue({ id: 's1' });

    const res = await request(buildApp())
      .post('/auth/refresh')
      .send({ refreshToken: 'refresh-old' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(jwtMocks.issueTokens).toHaveBeenCalledWith({ userId: 'u1', sessionId: 's1' });
    // The new (rotated) token is persisted on the session; the presented one is dead.
    expect(mocks.sessionUpdate).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: expect.objectContaining({ refreshToken: 'refresh-new' }),
    });
  });

  it('revokes the whole session when a rotated-out token is replayed (theft)', async () => {
    jwtMocks.verifyRefreshToken.mockReturnValue({ userId: 'u1', sessionId: 's1' });
    // Session still active, but its CURRENT stored token is newer than the one
    // the client just presented -> the presented token was already rotated -> replay.
    mocks.sessionFindFirst.mockResolvedValue({
      id: 's1',
      userId: 'u1',
      isActive: true,
      expiresAt: new Date(Date.now() + 60_000),
      refreshToken: 'refresh-newer',
    });
    mocks.sessionUpdate.mockResolvedValue({ id: 's1' });

    const res = await request(buildApp())
      .post('/auth/refresh')
      .send({ refreshToken: 'refresh-old' })
      .expect(401);

    expect(res.body.error.code).toBe('REFRESH_REUSED');
    // Reuse detected -> session revoked server-side, no new tokens issued.
    expect(mocks.sessionUpdate).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { isActive: false },
    });
    expect(jwtMocks.issueTokens).not.toHaveBeenCalled();
  });
});
