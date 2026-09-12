import { prisma } from '@vuzki/database';
import { AppealStatus, NotificationType } from '@vuzki/shared';

/**
 * Appeals — allow an affected user to view their restriction status, submit an
 * appeal with an explanation, and track its progress. Admins can review,
 * uphold, reduce or remove the underlying action.
 */

export const APPEALABLE = ['WARNING', 'MUTE', 'COMM_RESTRICTION', 'CALL_RESTRICTION', 'MATCH_RESTRICTION', 'TEMP_SUSPENSION', 'SUSPENSION'];

export async function viewRestrictionStatus(userId: string) {
  const [restrictions, appeals] = await Promise.all([
    prisma.userRestriction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.appeal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);
  return { restrictions, appeals };
}

export async function submitAppeal(params: {
  userId: string;
  restrictionType: string;
  violationCount?: number;
  message?: string;
  caseId?: string;
}) {
  return prisma.appeal.create({
    data: {
      userId: params.userId,
      caseId: params.caseId,
      restrictionType: params.restrictionType,
      violationCount: params.violationCount ?? 1,
      reason: `Appeal of ${params.restrictionType.toLowerCase().replace('_', ' ')}`,
      message: params.message,
      status: AppealStatus.SUBMITTED,
    },
  });
}

export async function listAppeals(params: { status?: string; page?: number; limit?: number }) {
  const { status, page = 1, limit = 20 } = params;
  const where: Record<string, any> = {};
  if (status) where.status = status;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.appeal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { user: { select: { id: true, displayName: true, username: true, status: true } } },
    }),
    prisma.appeal.count({ where }),
  ]);
  return { items, total, page, limit };
}

/** Review an appeal: uphold (keep), reduce (apply lighter action), remove (revoke). */
export async function reviewAppeal(params: {
  appealId: string;
  decision: AppealStatus | 'REDUCE';
  note?: string;
  adminId: string;
  restrictionId?: string;
  daysReducedTo?: number;
}) {
  const appeal = await prisma.appeal.findUnique({ where: { id: params.appealId } });
  if (!appeal) throw new Error('APPEAL_NOT_FOUND');

  const status = params.decision === 'REDUCE' ? AppealStatus.REDUCED : (params.decision as AppealStatus);

  await prisma.appeal.update({
    where: { id: appeal.id },
    data: { status, reviewedBy: params.adminId, reviewNote: params.note, decidedAt: new Date() },
  });

  // Apply the decision to the underlying restriction (deterministic admin action).
  if (params.decision === 'REMOVED' && params.restrictionId) {
    await prisma.userRestriction.updateMany({
      where: { id: params.restrictionId, userId: appeal.userId },
      data: { isActive: false },
    });
  }

  await prisma.notification.create({
    data: {
      userId: appeal.userId,
      type: NotificationType.SYSTEM,
      title: 'Appeal decision',
      body: params.note || `Your appeal was ${status.toLowerCase()}.`,
      data: { appealId: appeal.id, decision: status },
    },
  });

  return { id: appeal.id, status };
}

export async function getUserAppeals(userId: string) {
  return prisma.appeal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
}
