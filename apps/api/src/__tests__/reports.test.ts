import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { reportRoutes } from '../routes/reports';
import { prisma } from '@vuzki/database';
import { processReportIntoCase } from '../services/moderation-cases';
import { moderateText } from '../services/ai-moderation';
import { errorHandler } from '../middleware/errors';

vi.mock('@vuzki/database', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    report: { create: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock('../services/moderation-cases', () => ({
  processReportIntoCase: vi.fn(),
}));

vi.mock('../services/ai-moderation', () => ({
  moderateText: vi.fn(),
}));

const { mockAuthMiddleware } = vi.hoisted(() => ({
  mockAuthMiddleware: vi.fn(),
}));
vi.mock('../middleware/auth', () => ({
  authenticate: () => mockAuthMiddleware,
}));

const app = express();
app.use(express.json());
app.use('/reports', reportRoutes);
app.use(errorHandler);

describe('Report Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /reports', () => {
    it('creates a report successfully', async () => {
      mockAuthMiddleware.mockImplementation((req, res, next) => {
        req.auth = { userId: 'u1' };
        next();
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u2' } as any);
      vi.mocked(moderateText).mockResolvedValue({ flagged: false, score: 0.1, categories: [] });
      vi.mocked(prisma.report.create).mockResolvedValue({ id: 'r1', status: 'PENDING' } as any);
      vi.mocked(processReportIntoCase).mockResolvedValue({ caseId: 'c1', autoAction: null });

      const res = await request(app)
        .post('/reports')
        .send({
          reportedUserId: 'u2',
          category: 'HARASSMENT',
          description: 'bad things',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reportId).toBe('r1');
      expect(prisma.report.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          reporterId: 'u1',
          reportedUserId: 'u2',
          category: 'HARASSMENT',
        })
      }));
      expect(processReportIntoCase).toHaveBeenCalledWith(expect.objectContaining({ reportId: 'r1', reportedUserId: 'u2' }));
    });

    it('rejects self-report', async () => {
      mockAuthMiddleware.mockImplementation((req, res, next) => {
        req.auth = { userId: 'u1' };
        next();
      });

      const res = await request(app)
        .post('/reports')
        .send({
          reportedUserId: 'u1',
          category: 'SPAM',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Cannot report yourself');
      expect(prisma.report.create).not.toHaveBeenCalled();
    });

    it('returns 404 for missing target user', async () => {
      mockAuthMiddleware.mockImplementation((req, res, next) => {
        req.auth = { userId: 'u1' };
        next();
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .post('/reports')
        .send({
          reportedUserId: 'missing',
          category: 'SPAM',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toBe('User not found');
    });

    it('fails if unauthenticated', async () => {
      mockAuthMiddleware.mockImplementation((req, res, next) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      const res = await request(app)
        .post('/reports')
        .send({
          reportedUserId: 'u2',
          category: 'SPAM',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /reports/my', () => {
    it('returns authenticated user reports', async () => {
      mockAuthMiddleware.mockImplementation((req, res, next) => {
        req.auth = { userId: 'u1' };
        next();
      });
      vi.mocked(prisma.report.findMany).mockResolvedValue([
        { id: 'r1', category: 'SPAM', status: 'PENDING', createdAt: new Date() } as any
      ]);

      const res = await request(app).get('/reports/my');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(prisma.report.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { reporterId: 'u1' }
      }));
    });
  });
});
