import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { adminRoutes } from '../routes/admin';
import { prisma } from '@vuzki/database';
import { decideCase } from '../services/moderation-cases';
import { applyRestriction } from '../services/restrictions';
import { errorHandler } from '../middleware/errors';

vi.mock('@vuzki/database', () => ({
  prisma: {
    report: { findUnique: vi.fn(), update: vi.fn() },
    user: { update: vi.fn(), findUnique: vi.fn() },
    moderationAction: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(async (cb) => cb(prisma)),
  },
}));

vi.mock('../services/moderation-cases', () => ({
  listModerationCases: vi.fn(),
  decideCase: vi.fn(),
}));

vi.mock('../services/restrictions', () => ({
  applyRestriction: vi.fn(),
}));

// Mock feature flags
vi.mock('../services/feature-flags', () => ({
  getAllFeatureFlags: vi.fn(),
  setFeatureFlag: vi.fn(),
  resetFeatureFlags: vi.fn(),
  getFeatureFlag: vi.fn(),
}));

vi.mock('../services/payments', () => ({
  handlePaymentSuccess: vi.fn(),
}));
vi.mock('../services/fraud', () => ({
  listFraudFlags: vi.fn(),
  decideFraudFlag: vi.fn(),
  checkPaymentAnomalies: vi.fn(),
}));
vi.mock('../services/content-moderation', () => ({
  listContentFlags: vi.fn(),
  decideContentFlag: vi.fn(),
}));
vi.mock('../services/appeals', () => ({
  listAppeals: vi.fn(),
  reviewAppeal: vi.fn(),
}));

const mockAuth = vi.fn();
const mockAdmin = vi.fn();
const mockPermission = vi.fn();
const mockRole = vi.fn();

vi.mock('../guards', () => ({
  requireAuth: () => mockAuth,
  requireAdmin: (req: any, res: any, next: any) => mockAdmin(req, res, next),
  requirePermission: () => (req: any, res: any, next: any) => mockPermission(req, res, next),
  requireRole: () => (req: any, res: any, next: any) => mockRole(req, res, next),
}));

const app = express();
app.use(express.json());
app.use('/admin', adminRoutes);
app.use(errorHandler);

describe('Moderation Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin.mockImplementation((req, res, next) => {
      req.admin = { adminId: 'a1', role: 'ADMIN', permissions: [] };
      next();
    });
    mockPermission.mockImplementation((req, res, next) => next());
  });

  describe('PATCH /admin/reports/:id', () => {
    it('resolves a report and logs audit', async () => {
      vi.mocked(prisma.report.findUnique).mockResolvedValue({ id: 'r1', reportedUserId: 'u1' } as any);

      const res = await request(app)
        .patch('/admin/reports/r1')
        .send({ decision: 'resolve', note: 'All good' });

      expect(res.status).toBe(200);
      expect(prisma.report.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'r1' },
        data: expect.objectContaining({ status: 'RESOLVED', resolution: 'All good' }),
      }));
      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          actorId: 'a1',
          action: 'report:resolve',
          entityType: 'Report',
          entityId: 'r1',
        })
      }));
    });

    it('actions a report and applies restriction', async () => {
      vi.mocked(prisma.report.findUnique).mockResolvedValue({ id: 'r1', reportedUserId: 'u1' } as any);

      const res = await request(app)
        .patch('/admin/reports/r1')
        .send({ decision: 'action', actionType: 'BAN', note: 'Violator' });

      expect(res.status).toBe(200);
      expect(applyRestriction).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'u1',
        type: 'BAN',
      }));
      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ action: 'report:action' })
      }));
    });
  });

  describe('PATCH /admin/users/:id', () => {
    it('bans a user, applies restriction, and logs audit', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1' } as any);

      const res = await request(app)
        .patch('/admin/users/u1')
        .send({ action: 'ban', reason: 'Spamming' });

      expect(res.status).toBe(200);
      expect(applyRestriction).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'u1',
        type: 'BAN',
        reason: 'Spamming',
      }));
      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          action: 'user:ban',
          entityType: 'User',
          entityId: 'u1',
        })
      }));
    });
  });

  describe('PATCH /admin/moderation-cases/:id', () => {
    it('decides a case and logs audit', async () => {
      vi.mocked(decideCase).mockResolvedValue({ id: 'c1' } as any);

      const res = await request(app)
        .patch('/admin/moderation-cases/c1')
        .send({ decision: 'RESOLVED', note: 'Reviewed' });

      expect(res.status).toBe(200);
      expect(decideCase).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          action: 'moderation_case:RESOLVED',
          entityType: 'ModerationCase',
          entityId: 'c1',
        })
      }));
    });
  });
});
