import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { adminRoutes } from '../routes/admin';
import { scanOutgoingText } from '../services/content-moderation';
import { submitAppeal, reviewAppeal } from '../services/appeals';
import { errorHandler } from '../middleware/errors';

const mocks = vi.hoisted(() => ({
  contentFlagFindMany: vi.fn(),
  contentFlagCount: vi.fn(),
  contentFlagUpdate: vi.fn(),
  contentFlagCreate: vi.fn().mockResolvedValue({}),
  appealFindMany: vi.fn(),
  appealCount: vi.fn(),
  appealCreate: vi.fn(),
  appealFindUnique: vi.fn(),
  appealUpdate: vi.fn(),
  userRestrictionUpdateMany: vi.fn(),
  notificationCreate: vi.fn(),
  moderationAuditCreate: vi.fn().mockResolvedValue({}),
  safetySignalCreate: vi.fn().mockResolvedValue({}),
}));

vi.mock('@vuzki/database', () => ({
  prisma: {
    contentFlag: {
      findMany: mocks.contentFlagFindMany,
      count: mocks.contentFlagCount,
      update: mocks.contentFlagUpdate,
      create: mocks.contentFlagCreate,
    },
    appeal: {
      findMany: mocks.appealFindMany,
      count: mocks.appealCount,
      create: mocks.appealCreate,
      findUnique: mocks.appealFindUnique,
      update: mocks.appealUpdate,
    },
    userRestriction: {
      updateMany: mocks.userRestrictionUpdateMany,
    },
    notification: {
      create: mocks.notificationCreate,
    },
    moderationAudit: {
      create: mocks.moderationAuditCreate,
    },
    safetySignal: {
      create: mocks.safetySignalCreate,
    },
    $transaction: vi.fn(async (cb) => cb({
      contentFlag: { create: mocks.contentFlagCreate },
    })),
  }
}));

vi.mock('../guards', () => ({
  requireAdmin: (req: any, res: any, next: any) => {
    req.admin = { adminId: 'admin1', role: 'ADMIN' };
    next();
  },
  requirePermission: (perm: string) => (req: any, res: any, next: any) => {
    if (req.headers['x-reject-perm'] === perm) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
    }
    next();
  },
  requireRole: () => (req: any, res: any, next: any) => next(),
  authenticate: () => (req: any, res: any, next: any) => next(),
}));

const app = express();
app.use(express.json());
app.use('/admin', adminRoutes);
app.use(errorHandler);

describe('Content Moderation & AI Safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.contentFlagFindMany.mockResolvedValue([]);
    mocks.contentFlagCount.mockResolvedValue(0);
    mocks.appealFindMany.mockResolvedValue([]);
    mocks.appealCount.mockResolvedValue(0);
  });

  describe('AI Text Moderation Integration (scanOutgoingText)', () => {
    it('allows benign text without flagging', async () => {
      const result = await scanOutgoingText('hello world', 'u1');
      expect(result.decision).toBe('ALLOW');
      expect(result.signal.score).toBeLessThan(0.8);
    });

    it('hard blocks toxic text (heuristic bypass)', async () => {
      // "stupid" triggers toxic heuristic 0.8 which is >= 0.7 REVIEW_THRESHOLD
      const result = await scanOutgoingText('you are stupid', 'u1');
      expect(result.decision).toBe('REVIEW');
      expect(result.signal.categories).toContain('toxic');
    });

    it('flags scam text', async () => {
      // "send money" triggers scam 0.8 which is >= 0.7 REVIEW_THRESHOLD
      const result = await scanOutgoingText('send money now', 'u1');
      expect(result.decision).toBe('REVIEW');
      expect(result.signal.categories).toContain('scam');
    });
  });

  describe('Admin UI Endpoints', () => {
    it('GET /admin/content-flags retrieves paginated flags', async () => {
      mocks.contentFlagFindMany.mockResolvedValue([{ id: 'cf1', status: 'REVIEW' }]);
      mocks.contentFlagCount.mockResolvedValue(1);

      const res = await request(app).get('/admin/content-flags?status=REVIEW');
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
    });

    it('GET /admin/content-flags rejects unauthorized', async () => {
      const res = await request(app).get('/admin/content-flags').set('x-reject-perm', 'moderation.read');
      expect(res.status).toBe(403);
    });

    it('PATCH /admin/content-flags/:id decides a flag', async () => {
      mocks.contentFlagUpdate.mockResolvedValue({ id: 'cf1', status: 'REJECTED' });

      const res = await request(app).patch('/admin/content-flags/cf1').send({
        decision: 'REJECTED',
        note: 'Violation confirmed'
      });

      expect(res.status).toBe(200);
      expect(mocks.contentFlagUpdate).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'cf1' },
        data: expect.objectContaining({ status: 'REJECTED', reviewedBy: 'admin1' })
      }));
    });

    it('GET /admin/appeals retrieves appeals', async () => {
      mocks.appealFindMany.mockResolvedValue([{ id: 'ap1', status: 'PENDING' }]);
      mocks.appealCount.mockResolvedValue(1);

      const res = await request(app).get('/admin/appeals?status=PENDING');
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
    });

    it('PATCH /admin/appeals/:id updates appeal status', async () => {
      mocks.appealFindUnique.mockResolvedValue({ id: 'ap1', userId: 'u1' });
      mocks.appealUpdate.mockResolvedValue({ id: 'ap1', status: 'REMOVED' });

      const res = await request(app).patch('/admin/appeals/ap1').send({
        action: 'REMOVED',
        note: 'False positive',
        restrictionId: 'res1'
      });

      expect(res.status).toBe(200);
      expect(mocks.appealUpdate).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'ap1' },
        data: expect.objectContaining({ status: 'REMOVED', reviewNote: 'False positive' })
      }));
      expect(mocks.userRestrictionUpdateMany).toHaveBeenCalledWith({
        where: { id: 'res1', userId: 'u1' },
        data: { isActive: false }
      });
      expect(mocks.notificationCreate).toHaveBeenCalled();
    });
  });

  describe('Service Functions', () => {
    it('submitAppeal creates an appeal record', async () => {
      mocks.appealCreate.mockResolvedValue({ id: 'ap2' });
      const res = await submitAppeal({
        userId: 'u1',
        restrictionType: 'MUTE',
        message: 'I did not do it'
      });
      expect(res.id).toBe('ap2');
      expect(mocks.appealCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          userId: 'u1',
          restrictionType: 'MUTE',
          message: 'I did not do it',
          status: 'SUBMITTED'
        })
      }));
    });
  });
});
