import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { userRoutes } from '../routes/users';
import * as privacyService from '../services/privacy';

vi.mock('../services/privacy', () => ({
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
  getBlockedList: vi.fn(),
  getWhoBlockedMe: vi.fn(),
  isBlockedPair: vi.fn(),
}));

vi.mock('../middleware/auth', () => ({
  authenticate: () => (req: any, res: any, next: any) => {
    req.auth = { userId: 'u1', role: 'USER' };
    next();
  },
  requireRole: () => (req: any, res: any, next: any) => next(),
}));

import { errorHandler } from '../middleware/errors';

const app = express();
app.use(express.json());
app.use('/users', userRoutes);
app.use(errorHandler);

describe('Block API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows authenticated user to block another user', async () => {
    vi.mocked(privacyService.blockUser).mockResolvedValue({ created: true });

    const res = await request(app)
      .put('/users/u2/block')
      .send({ reason: 'Harassment' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(privacyService.blockUser).toHaveBeenCalledWith({
      blockerId: 'u1',
      blockedId: 'u2',
      reason: 'Harassment',
    });
  });

  it('rejects self-blocking', async () => {
    const res = await request(app)
      .put('/users/u1/block');

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Cannot block yourself');
    expect(privacyService.blockUser).not.toHaveBeenCalled();
  });

  it('allows unblocking a user', async () => {
    vi.mocked(privacyService.unblockUser).mockResolvedValue(true);

    const res = await request(app)
      .delete('/users/u2/block');

    expect(res.status).toBe(200);
    expect(privacyService.unblockUser).toHaveBeenCalledWith('u1', 'u2');
  });
});
