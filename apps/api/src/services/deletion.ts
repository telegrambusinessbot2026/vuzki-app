import { prisma } from '@vuzki/database';
import { AccountDeletionStatus, AccountStatus, NotificationType, SecurityEventType } from '@vuzki/shared';
import { RETENTION_DAYS } from '@vuzki/shared';
import { recordSecurityEvent } from './security';

/**
 * Account deletion & data retention.
 *
 * On account deletion: disable account, remove from discovery, stop matching,
 * cancel eligible communication, then run an anonymization/retention job that
 * keeps only data legally/financially required (payments, withdrawals, audit).
 */

export async function requestAccountDeletion(params: { userId: string; reason?: string }) {
  const existing = await prisma.accountDeletion.findUnique({ where: { userId: params.userId } });
  if (existing) return { already: true, deletion: existing };

  const deletion = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: params.userId }, data: { status: AccountStatus.DELETED, onlineStatus: false } });
    // Remove from discovery/matching.
    await tx.user.updateMany({ where: { id: params.userId }, data: { deletedAt: new Date(), onboardingStep: 'NONE' } });
    const d = await tx.accountDeletion.create({
      data: { userId: params.userId, reason: params.reason, status: AccountDeletionStatus.PENDING },
    });
    return d;
  });

  await recordSecurityEvent({ userId: params.userId, type: SecurityEventType.RESTRICTION, notifyUser: true, metadata: { deletion: true } });

  // Fire-and-forget processing job.
  runDeletionJob(params.userId).catch(() => {});

  return { already: false, deletion };
}

export async function cancelAccountDeletion(userId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.accountDeletion.deleteMany({ where: { userId, status: { in: [AccountDeletionStatus.PENDING, AccountDeletionStatus.PROCESSING] } } });
    await tx.user.updateMany({ where: { id: userId }, data: { status: AccountStatus.ACTIVE, deletedAt: null, onboardingStep: 'COMPLETE' } });
  });
}

/**
 * The deletion job: anonymize safe-to-delete PII and mark financial records for
 * legal/regulatory retention. This is a best-effort job — it must not throw.
 */
export async function runDeletionJob(userId: string) {
  try {
    await prisma.accountDeletion.update({
      where: { userId },
      data: { status: AccountDeletionStatus.PROCESSING, processedAt: new Date() },
    });

    // Anonymize the user's identifying fields (keep finance/audit rows with the
    // original ID for legal retention but strip PII).
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${userId}@vuzki.app`,
        phone: null,
        displayName: 'Deleted user',
        username: `deleted_${userId.slice(0, 8)}`,
        avatarUrl: null,
        bannerUrl: null,
        bio: null,
        latitude: null,
        longitude: null,
        passwordHash: null,
      },
    });

    // Cancel/end active communications (fire and forget semantics at job level).
    await prisma.call.updateMany({
      where: { status: { in: ['RINGING', 'ONGOING'] }, OR: [{ callerId: userId }, { receiverId: userId }] },
      data: { status: 'FAILED', endedAt: new Date() },
    });

    await prisma.accountDeletion.update({
      where: { userId },
      data: { status: AccountDeletionStatus.ANONYMIZED, anonymizedAt: new Date() },
    });
  } catch {
    await prisma.accountDeletion.update({ where: { userId }, data: { status: AccountDeletionStatus.FAILED } }).catch(() => {});
  }
}

export async function listDeletionJobs(params: { status?: string; page?: number; limit?: number }) {
  const { status, page = 1, limit = 20 } = params;
  const where: Record<string, any> = {};
  if (status) where.status = status;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.accountDeletion.findMany({ where, orderBy: { requestedAt: 'desc' }, skip, take: limit }),
    prisma.accountDeletion.count({ where }),
  ]);
  return { items, total, page, limit };
}

/**
 * Retention sweep — delete data older than policy (excluding financial/legal
 * holds). Only runs when retention is enabled via config. Returns counts.
 */
export async function runRetentionSweep() {
  const results: Record<string, number> = { messages: 0, auditLogs: 0, safetySignals: 0, contentFlags: 0, reports: 0 };
  const cutoff = (label: keyof typeof RETENTION_DAYS) => {
    const days = RETENTION_DAYS[label];
    return days > 0 ? new Date(Date.now() - days * 86_400_000) : null;
  };

  const msgCut = cutoff('message');
  if (msgCut) {
    const del = await prisma.message.deleteMany({ where: { unsent: true, createdAt: { lt: msgCut } } });
    results.messages = del.count;
  }

  const auditCut = cutoff('auditLog');
  if (auditCut) {
    const del = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: auditCut } } });
    results.auditLogs = del.count;
  }

  const sigCut = cutoff('safetySignal');
  if (sigCut) {
    const del = await prisma.safetySignal.deleteMany({ where: { createdAt: { lt: sigCut } } });
    results.safetySignals = del.count;
  }

  const repCut = cutoff('report');
  if (repCut) {
    const del = await prisma.report.deleteMany({ where: { createdAt: { lt: repCut }, status: { in: ['RESOLVED', 'DISMISSED'] } } });
    results.reports = del.count;
  }

  return results;
}
