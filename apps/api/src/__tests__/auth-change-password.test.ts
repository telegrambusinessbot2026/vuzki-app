import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Module under test: POST /auth/change-password ---
// Real password policy + session revocation, with hashing/DB/auth seams mocked.

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn();
  const userUpdate = vi.fn();
  const sessionUpdateMany = vi.fn();
  const verifyPassword = vi.fn();
  const hashPassword = vi.fn();
  const isValidPassword = vi.fn();
  return { userFindUnique, userUpdate, sessionUpdateMany, verifyPassword, hashPassword, isValidPassword };
});

vi.mock('@vuzki/database', () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      findFirst: vi.fn(),
      update: mocks.userUpdate,
      create: vi.fn(),
    },
    session: {
      create: vi.fn(),
      updateMany: mocks.sessionUpdateMany,
      findFirst: vi.fn(),
    },
    otp: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  },
}));

vi.mock('@vuzki/utils', () => ({
  hashPassword: mocks.hashPassword,
  verifyPassword: mocks.verifyPassword,
  isValidPassword: mocks.isValidPassword,
  generateReferralCode: vi.fn(() => 'REFCODE'),
  isValidEmail: vi.fn(() => true),
  isValidPhone: vi.fn(() => true),
  isValidOtp: vi.fn(() => true),
  isAdult: vi.fn(() => true),
}));

vi.mock('../middleware/rateLimit', () => ({ rateLimiter: () => (_req: any, _res: any, next: any) => next() }));

vi.mock('../middleware/auth', () => ({
  authenticate: () => (req: any, _res: any, next: any) => {
    req.auth = { userId: 'u1', sessionId: 's1' };
    next();
  },
}));

vi.mock('../services/jwt', () => ({ issueTokens: vi.fn(), verifyRefreshToken: vi.fn(), signRefreshToken: vi.fn() }));
vi.mock('../services/otp', () => ({ sendOtp: vi.fn(), verifyOtp: vi.fn(), createAndValidateOtp: vi.fn() }));
vi.mock('../services/wallet', () => ({ creditCoins: vi.fn(), getWallet: vi.fn() }));

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

const localUser = {
  id: 'u1',
  authProvider: 'local',
  passwordHash: 'hashed:old',
  email: 'me@vuzki.app',
  username: 'me',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.hashPassword.mockResolvedValue('hashed:new');
  mocks.verifyPassword.mockResolvedValue(true);
  mocks.isValidPassword.mockImplementation((pw: string) => /[a-zA-Z]/.test(pw) && /\d/.test(pw));
  mocks.sessionUpdateMany.mockResolvedValue({ count: 2 });
});

describe('POST /auth/change-password', () => {
  it('hashes + stores the new password and revokes every OTHER session', async () => {
    mocks.userFindUnique.mockResolvedValue(localUser);

    const res = await request(buildApp()).post('/auth/change-password').send({
      currentPassword: 'OldPass1',
      newPassword: 'NewPass1!',
    }).expect(200);

    expect(mocks.verifyPassword).toHaveBeenCalledWith('OldPass1', 'hashed:old');
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { passwordHash: 'hashed:new' },
    });
    expect(mocks.sessionUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', isActive: true, id: { not: 's1' } },
      data: { isActive: false },
    });
    expect(res.body.data).toMatchObject({ changed: true });
  });

  it('rejects a wrong current password', async () => {
    mocks.userFindUnique.mockResolvedValue(localUser);
    mocks.verifyPassword.mockResolvedValue(false);

    const res = await request(buildApp()).post('/auth/change-password').send({
      currentPassword: 'Wrong1!',
      newPassword: 'NewPass1!',
    }).expect(401);

    expect(res.body.error.code).toBe('INVALID_PASSWORD');
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it('rejects a weak new password', async () => {
    mocks.userFindUnique.mockResolvedValue(localUser);

    const res = await request(buildApp()).post('/auth/change-password').send({
      currentPassword: 'OldPass1',
      newPassword: '12345678',
    }).expect(400);

    expect(res.body.error.code).toBe('WEAK_PASSWORD');
  });

  it('rejects social-only accounts with no password set', async () => {
    mocks.userFindUnique.mockResolvedValue({ ...localUser, authProvider: 'google', passwordHash: null });

    const res = await request(buildApp()).post('/auth/change-password').send({
      currentPassword: 'OldPass1',
      newPassword: 'NewPass1!',
    }).expect(400);

    expect(res.body.error.code).toBe('NO_PASSWORD');
  });
});