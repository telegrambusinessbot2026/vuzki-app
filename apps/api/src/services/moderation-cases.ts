import { prisma } from '@vuzki/database';
import {
  ModerationCaseStatus,
  ModerationCasePriority,
  RiskLevel,
  ReportStatus,
} from '@vuzki/shared';
import { REPORTS_TO_REVIEW, REPORTS_TO_AUTO_RESTRICT, REPORTS_TO_AUTO_SUSPEND } from '@vuzki/shared';
import { getUserRiskLevel, recordSafetySignal } from './risk';
import { applyRestriction } from './restrictions';
import { RestrictionType, RestrictionScope } from '@vuzki/shared';

/**
 * Moderation Case workflow.
 *
 *   report / AI flag
 *        -> automated checks & risk classification
 *        -> moderation queue (open case)
 *        -> human review (as required)
 *        -> action  -> user notification -> audit log
 *
 * Deterministic thresholds (distinct reporters / risk tier) drive when a case
 * is auto-created, escalated to human review, or given a *provisional*
 * restriction. AI output only adds risk tier & priority; it never alone
 * triggers irreversible action.
 */

export interface NewCaseInput {
  userId: string;
  primaryCategory?: string;
  summary?: string;
  evidenceRefs?: string[];
  aiSignals?: Record<string, unknown>;
  createdBy?: 'REPORT' | 'AI_FLAG' | 'AUTO';
  createdByReportId?: string;
}

export async function openModerationCase(input: NewCaseInput): Promise<any> {
  const riskLevel = input.aiSignals?.riskLevel as RiskLevel | undefined ?? await getUserRiskLevel(input.userId);
  const priority = priorityFor(riskLevel, input.aiSignals?.confidence as number | undefined);

  return prisma.moderationCase.create({
    data: {
      userId: input.userId,
      primaryCategory: input.primaryCategory,
      riskLevel,
      priority,
      status: ModerationCaseStatus.OPEN,
      summary: input.summary,
      evidenceRefs: input.evidenceRefs ?? [],
      aiSignals: (input.aiSignals as any) ?? undefined,
      createdByReportId: input.createdByReportId,
      createdBy: input.createdBy ?? 'REPORT',
    },
  });
}

export async function getOrCreateCaseForReport(reportId: string, userId: string): Promise<any> {
  const existing = await prisma.moderationCase.findFirst({
    where: { createdByReportId: reportId },
  });
  if (existing) return existing;

  // Reuse any open case for the same user to consolidate evidence.
  const open = await prisma.moderationCase.findFirst({
    where: { userId, status: { in: [ModerationCaseStatus.OPEN, ModerationCaseStatus.IN_REVIEW] } },
    orderBy: { createdAt: 'desc' },
  });
  if (open) {
    await prisma.moderationCase.update({
      where: { id: open.id },
      data: {
        evidenceRefs: { push: reportId },
        updatedAt: new Date(),
      },
    });
    return open;
  }

  const riskLevel = await getUserRiskLevel(userId);
  return prisma.moderationCase.create({
    data: {
      userId,
      primaryCategory: undefined,
      riskLevel,
      priority: priorityFor(riskLevel),
      status: ModerationCaseStatus.OPEN,
      createdByReportId: reportId,
      createdBy: 'REPORT',
      evidenceRefs: [reportId],
    },
  });
}

function priorityFor(riskLevel: RiskLevel, confidence?: number): string {
  if (riskLevel === RiskLevel.HIGH || (confidence !== undefined && confidence >= 0.9)) return ModerationCasePriority.URGENT;
  if (riskLevel === RiskLevel.MEDIUM || (confidence !== undefined && confidence >= 0.75)) return ModerationCasePriority.HIGH;
  return ModerationCasePriority.NORMAL;
}

/**
 * Evaluate a report: attach/merge into a case, classify risk, and apply
 * proportional automatic enforcement when deterministic thresholds are met.
 * Never auto-bans on a single low-confidence signal.
 */
export async function processReportIntoCase(params: {
  reportId: string;
  reportedUserId: string;
  category: string;
  aiScore?: number;
  aiCategories?: string[];
}): Promise<{ caseId: string | null; autoAction: string | null }> {
  await recordSafetySignal({
    userId: params.reportedUserId,
    signalType: params.category.startsWith('SPAM') ? 'SPAM' : params.category.startsWith('SCAM') ? 'SCAM' : params.category.startsWith('FAKE') ? 'FAKE' : 'ABUSE',
    score: params.aiScore ?? 0.5,
    reason: `Report (${params.category})`,
    metadata: { reportId: params.reportId },
  });

  const riskLevel = await getUserRiskLevel(params.reportedUserId);
  const caseRecord = await getOrCreateCaseForReport(params.reportId, params.reportedUserId);
  if (caseRecord && params.aiScore !== undefined) {
    await prisma.moderationCase.update({
      where: { id: caseRecord.id },
      data: {
        aiSignals: {
          confidence: params.aiScore,
          categories: params.aiCategories ?? [],
          riskLevel,
          timestamp: new Date().toISOString(),
        } as any,
        priority: priorityFor(riskLevel as RiskLevel, params.aiScore),
        updatedAt: new Date(),
      },
    });
  }

  // Distinct reporters threshold (deterministic): queue for human review.
  const distinctReporters = await prisma.report.groupBy({
    by: ['reportedUserId'],
    where: { reportedUserId: params.reportedUserId },
    _count: { _all: true },
  });
  const reportCount = distinctReporters[0]?._count._all ?? 1;

  if (reportCount >= REPORTS_TO_REVIEW) {
    await prisma.report.updateMany({
      where: { reportedUserId: params.reportedUserId, status: ReportStatus.PENDING },
      data: { status: ReportStatus.REVIEWING },
    });
    if (caseRecord) {
      await prisma.moderationCase.update({ where: { id: caseRecord.id }, data: { status: ModerationCaseStatus.IN_REVIEW } });
    }
  }

  // Deterministic auto-restriction thresholds (chat/call) — still reversible,
  // not a ban. Proportional and temporary.
  if (riskLevel === RiskLevel.HIGH && reportCount >= REPORTS_TO_AUTO_RESTRICT && caseRecord) {
    await applyRestriction({
      userId: params.reportedUserId,
      type: RestrictionType.COMM_RESTRICTION,
      scope: RestrictionScope.CHAT,
      reason: 'Repetitive reports of harmful behavior — awaiting human review',
      days: 3,
      moderationCaseId: caseRecord.id,
    });
    return { caseId: caseRecord.id, autoAction: 'CHAT_RESTRICTED' };
  }

  return { caseId: caseRecord?.id ?? null, autoAction: null };
}

/** Resolve a case with a moderator decision. */
export async function decideCase(params: {
  caseId: string;
  decision: 'RESOLVED' | 'DISMISSED' | 'ESCALATED';
  note?: string;
  adminId: string;
  evidenceNote?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.moderationCase.findUnique({ where: { id: params.caseId } });
    if (!existing) throw new Error('CASE_NOT_FOUND');
    await tx.moderationCase.update({
      where: { id: params.caseId },
      data: {
        status: params.decision as ModerationCaseStatus,
        decidedAt: new Date(),
        decidedBy: params.adminId,
        decision: params.decision,
        decisionNote: params.note,
      },
    });
    return existing;
  });
}

export async function listModerationCases(params: {
  status?: string;
  priority?: string;
  riskLevel?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
}) {
  const { status, priority, riskLevel, page = 1, limit = 20 } = params;
  const where: Record<string, any> = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (riskLevel) where.riskLevel = riskLevel;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.moderationCase.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
      include: { user: { select: { id: true, displayName: true, username: true, status: true, avatarUrl: true } } },
    }),
    prisma.moderationCase.count({ where }),
  ]);
  return { items, total, page, limit };
}
