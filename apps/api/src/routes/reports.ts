import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@vuzki/database';
import { ApiErrorResponse } from '@vuzki/types';
import { wrap } from './helpers';
import { authenticate, AuthedRequest } from '../middleware/auth';
import { ReportCategory, ReportTargetType, ReportStatus } from '@vuzki/shared';
import { moderateText } from '../services/ai-moderation';
import { processReportIntoCase } from '../services/moderation-cases';

export const reportRoutes = Router();

// POST /reports
reportRoutes.post('/', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const { reportedUserId, targetType, targetId, category, description } = z.object({
    reportedUserId: z.string(),
    targetType: z.enum([ReportTargetType.USER, ReportTargetType.MESSAGE, ReportTargetType.CALL, ReportTargetType.PROFILE]).default(ReportTargetType.USER),
    targetId: z.string().optional(),
    category: z.enum([
      ReportCategory.HARASSMENT,
      ReportCategory.SPAM,
      ReportCategory.SCAM,
      ReportCategory.FAKE_PROFILE,
      ReportCategory.INAPPROPRIATE,
      ReportCategory.THREATS,
      ReportCategory.FRAUD,
      ReportCategory.OTHER,
    ]),
    description: z.string().max(1000).optional(),
  }).parse(req.body);

  if (me === reportedUserId) throw new ApiErrorResponse(400, 'BAD_REQUEST', 'Cannot report yourself');

  const target = await prisma.user.findUnique({ where: { id: reportedUserId } });
  if (!target) throw new ApiErrorResponse(404, 'USER_NOT_FOUND', 'User not found');

  // AI assist: run moderation to prioritize report (not auto-ban)
  const modResult = description
    ? await moderateText(description, { type: 'report', userId: reportedUserId })
    : null;

  const report = await prisma.report.create({
    data: {
      reporterId: me,
      reportedUserId,
      targetType,
      targetId,
      category,
      description,
      status: ReportStatus.PENDING,
      attachments: modResult?.flagged ? { aiScore: modResult.score, aiCategories: modResult.categories } : undefined,
    },
  });

  // Auto-block future reports abuse (rate limiting at API level too)
  // Feed the report into the moderation-case pipeline so it records a safety
  // signal, creates/updates a moderation case, and can auto-restrict severe
  // repeat offenders (proportional + reversible), not just a dead-end row.
  const pipeline = await processReportIntoCase({
    reportId: report.id,
    reportedUserId,
    category,
    aiScore: modResult?.score,
    aiCategories: modResult?.categories,
  }).catch(() => ({ caseId: null, autoAction: null }));

  res.status(201).json({
    success: true,
    data: { reportId: report.id, status: report.status, aiFlagged: modResult?.flagged ?? false, autoAction: pipeline.autoAction },
  });
}));

// GET /reports/my
reportRoutes.get('/my', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const reports = await prisma.report.findMany({
    where: { reporterId: req.auth!.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({
    success: true,
    data: { items: reports.map((r) => ({ id: r.id, category: r.category, status: r.status, createdAt: r.createdAt, description: r.description })) },
  });
}));
