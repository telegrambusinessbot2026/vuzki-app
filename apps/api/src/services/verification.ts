import { prisma } from '@vuzki/database';
import { VerificationBadge, VerificationStatus, NotificationType, KycStatus } from '@vuzki/shared';
import { VERIFIED_CREATOR_MIN_KYC } from '@vuzki/shared';

/**
 * Verified badges — SERVER-CONTROLLED ONLY.
 * The frontend can only request verification; the badge is granted by an
 * authorized moderator reviewing evidence. The client can never self-assign.
 */

export async function requestVerification(params: {
  userId: string;
  badge: string; // VerificationBadge.USER | CREATOR
  method: string;
  evidence?: Record<string, unknown>;
}) {
  const existing = await prisma.verification.findFirst({
    where: { userId: params.userId, badge: params.badge, status: { in: [VerificationStatus.PENDING, VerificationStatus.REVIEW] } },
  });
  if (existing) return { existing: true, verification: existing };

  const verification = await prisma.verification.create({
    data: {
      userId: params.userId,
      badge: params.badge,
      method: params.method,
      evidence: (params.evidence as any) ?? undefined,
      status: VerificationStatus.PENDING,
    },
  });
  return { existing: false, verification };
}

/** Admin grants the badge. Deterministic rules validate prerequisites. */
export async function approveVerification(params: { verificationId: string; adminId: string; note?: string }) {
  const v = await prisma.verification.findUnique({ where: { id: params.verificationId } });
  if (!v) throw new Error('VERIFICATION_NOT_FOUND');

  if (v.badge === VerificationBadge.CREATOR) {
    const profile = await prisma.creatorProfile.findUnique({ where: { userId: v.userId } });
    const kycOk = profile && profile.kyciStatus === VERIFIED_CREATOR_MIN_KYC;
    if (!kycOk) throw new Error('CREATOR_KYC_REQUIRED');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.verification.update({
      where: { id: v.id },
      data: { status: VerificationStatus.VERIFIED, approvedBy: params.adminId, approvedAt: new Date() },
    });
    await tx.user.update({
      where: { id: v.userId },
      data: {
        isVerified: true,
        verificationStatus: v.badge === VerificationBadge.CREATOR ? 'VERIFIED_CREATOR' : 'VERIFIED_USER',
      },
    });
    await tx.moderationAction.create({
      data: { userId: v.userId, actionType: 'VERIFY_USER', severity: 'LOW', reason: params.note || 'Verified', adminId: params.adminId },
    });
    await tx.notification.create({
      data: { userId: v.userId, type: NotificationType.SYSTEM, title: 'Profile verified', body: `You are now a verified ${v.badge === VerificationBadge.CREATOR ? 'creator' : 'user'}.` },
    });
    return updated;
  });
}

export async function rejectVerification(params: { verificationId: string; adminId: string; reason: string }) {
  const v = await prisma.verification.findUnique({ where: { id: params.verificationId } });
  if (!v) throw new Error('VERIFICATION_NOT_FOUND');
  return prisma.verification.update({
    where: { id: v.id },
    data: { status: VerificationStatus.REJECTED, rejectedBy: params.adminId, rejectedAt: new Date(), rejectReason: params.reason },
  });
}

export async function listVerifications(params: { status?: string; badge?: string; page?: number; limit?: number }) {
  const { status, badge, page = 1, limit = 20 } = params;
  const where: Record<string, any> = {};
  if (status) where.status = status;
  if (badge) where.badge = badge;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.verification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { user: { select: { id: true, displayName: true, username: true, isVerified: true } } },
    }),
    prisma.verification.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function getUserVerifications(userId: string) {
  return prisma.verification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

export function verificationBadgeFor(user: { isVerified?: boolean; verificationStatus?: string | null; isCreator?: boolean; creator?: { kyciStatus?: string | null } | null }): VerificationBadge {
  if (user.isVerified) {
    if ((user.isCreator && user.creator?.kyciStatus === KycStatus.VERIFIED) || user.verificationStatus === 'VERIFIED_CREATOR') {
      return VerificationBadge.CREATOR;
    }
    return VerificationBadge.USER;
  }
  return VerificationBadge.NONE;
}
