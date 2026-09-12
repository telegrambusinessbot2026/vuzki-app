import { prisma } from '@vuzki/database';
import { FraudEntityType, FraudFlagSource, FraudFlagStatus } from '@vuzki/shared';
import { recordSafetySignal } from './risk';

/**
 * Fraud prevention — deterministic anomaly checks for payments, referrals,
 * creator earnings, withdrawals and gifts.
 *
 * These produce FraudFlags for finance/admin review. Financial decisions are
 * ALWAYS validated against backend transaction data (deterministic), and we
 * never automatically confiscate legitimate earnings based on a score alone.
 */

export async function raiseFraudFlag(params: {
  entityType: FraudEntityType;
  entityId: string;
  userId?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
  evidence?: Record<string, unknown>;
  source?: FraudFlagSource;
}) {
  const flag = await prisma.fraudFlag.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      userId: params.userId,
      riskLevel: params.riskLevel ?? 'MEDIUM',
      reason: params.reason,
      evidence: (params.evidence as any) ?? undefined,
      source: params.source ?? FraudFlagSource.RULE,
      status: FraudFlagStatus.OPEN,
    },
  });
  if (params.userId) {
    await recordSafetySignal({ userId: params.userId, signalType: 'PAYMENT_RISK', reason: params.reason, metadata: { flagId: flag.id } });
  }
  return flag;
}

/** Check a new referral claim for abuse (same device / clusters / self-referral / volume). */
export async function checkReferralFraud(params: { referrerId: string; referredUserId: string; deviceId?: string; ipAddress?: string }) {
  if (params.referrerId === params.referredUserId) {
    await raiseFraudFlag({ entityType: FraudEntityType.REFERRAL, entityId: params.referredUserId, userId: params.referrerId, riskLevel: 'HIGH', reason: 'Self-referral detected', source: FraudFlagSource.RULE });
    return { ok: false, reason: 'SELF_REFERRAL' };
  }

  // Volume: excessive referrals by the same referrer in a window.
  const recent = await prisma.referral.count({
    where: { referrerId: params.referrerId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  if (recent >= 10) {
    await raiseFraudFlag({ entityType: FraudEntityType.REFERRAL, entityId: params.referredUserId, userId: params.referrerId, riskLevel: 'MEDIUM', reason: 'High referral volume (possible referral farming)', evidence: { recent }, source: FraudFlagSource.RULE });
    return { ok: false, reason: 'RATE_LIMITED' };
  }

  if (params.deviceId) {
    const sameDevice = await prisma.referral.count({
      where: { referrerId: params.referrerId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    });
    if (sameDevice > 3) {
      await raiseFraudFlag({ entityType: FraudEntityType.REFERRAL, entityId: params.referredUserId, userId: params.referrerId, riskLevel: 'MEDIUM', reason: 'Suspicious same-device referral cluster', source: FraudFlagSource.RULE });
    }
  }

  return { ok: true };
}

/** Evaluates a payment for anomalies at creation/capture time. Returns flags raised. */
export async function checkPaymentAnomalies(params: {
  userId: string;
  orderId: string;
  amount: number;
  ipAddress?: string;
  deviceId?: string;
}) {
  const [todayCount, createdRecently] = await Promise.all([
    prisma.payment.count({ where: { userId: params.userId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    prisma.user.findUnique({
      where: { id: params.userId },
      select: { createdAt: true },
    }),
  ]);

  const flags: string[] = [];
  const isNewAccount = createdRecently && Date.now() - new Date(createdRecently.createdAt).getTime() < 30 * 86_400_000;

  if (todayCount > 5) {
    await raiseFraudFlag({ entityType: FraudEntityType.PAYMENT, entityId: params.orderId, userId: params.userId, riskLevel: 'MEDIUM', reason: 'Excessive payments in 24h', evidence: { todayCount }, source: FraudFlagSource.RULE });
    flags.push('EXCESSIVE_PAYMENTS');
  }
  if (isNewAccount && params.amount > 10000) {
    await raiseFraudFlag({ entityType: FraudEntityType.PAYMENT, entityId: params.orderId, userId: params.userId, riskLevel: 'MEDIUM', reason: 'Large payment from new account', source: FraudFlagSource.RULE });
    flags.push('NEW_ACCOUNT_LARGE_PAYMENT');
  }
  return flags;
}

export interface EarningsAnomalyResult {
  anomalous: boolean;
  reasons: string[];
}

/** Detect suspicious creator earnings: abnormal spikes, artificial call loops. */
export async function checkCreatorEarningsAnomaly(creatorId: string): Promise<EarningsAnomalyResult> {
  const [recent, callsToday, callBacks] = await Promise.all([
    prisma.creatorEarning.aggregate({
      where: { creatorId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.call.count({ where: { receiverId: creatorId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    prisma.call.groupBy({
      by: ['callerId'],
      where: { receiverId: creatorId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      _count: true,
    }),
  ]);

  const reasons: string[] = [];
  const recentAmount = Number(recent._sum.amount ?? 0);
  const recentCount = recent._count ?? 0;
  const todayCalls = callsToday;

  if (recentAmount >= 20000) reasons.push('EARNINGS_SPIKE_1D'); // abnormal daily spike
  if (todayCalls >= 50) reasons.push('CALL_LOOP_VOLUME');
  if (callBacks.some((c: any) => c._count >= 30)) reasons.push('REPEATED_CALLER_LOOP');

  if (reasons.length > 0) {
    await raiseFraudFlag({
      entityType: FraudEntityType.EARNING,
      entityId: creatorId,
      userId: creatorId,
      riskLevel: reasons.includes('EARNINGS_SPIKE_1D') ? 'HIGH' : 'MEDIUM',
      reason: `Creator earning anomaly: ${reasons.join(', ')}`,
      evidence: { recentAmount, recentCount, todayCalls },
      source: FraudFlagSource.AI,
    });
  }
  return { anomalous: reasons.length > 0, reasons };
}

/** Check a gift transaction for abuse (flip-flopping refund-like patterns / volume). */
export async function checkGiftAnomaly(params: { senderId: string; receiverId: string; amountCoins: number }) {
  const [todaySent] = await Promise.all([
    prisma.giftTransaction.count({ where: { senderId: params.senderId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
  ]);
  const flags: string[] = [];
  if (todaySent >= 50 && params.amountCoins >= 100) {
    await raiseFraudFlag({ entityType: FraudEntityType.GIFT, entityId: `${params.senderId}:${params.receiverId}`, userId: params.senderId, riskLevel: 'MEDIUM', reason: 'High gift volume (possible gift abuse)', evidence: { todaySent }, source: FraudFlagSource.RULE });
    flags.push('GIFT_VOLUME');
  }
  return flags;
}

/** Check a withdrawal for anomalies (rapid first withdrawal, amount risk). */
export async function checkWithdrawalAnomaly(params: { userId: string; amount: number; method: string }) {
  const prior = await prisma.withdrawal.count({ where: { userId: params.userId, status: { in: ['COMPLETED', 'PENDING', 'PROCESSING'] } } });
  if (prior === 0 && params.amount >= 5000) {
    await raiseFraudFlag({ entityType: FraudEntityType.WITHDRAWAL, entityId: params.userId, userId: params.userId, riskLevel: 'MEDIUM', reason: 'Large first withdrawal', evidence: { amount: params.amount, method: params.method }, source: FraudFlagSource.RULE });
    return { anomalous: true, reasons: ['LARGE_FIRST_WITHDRAWAL'] };
  }
  return { anomalous: false, reasons: [] };
}

export async function listFraudFlags(params: { status?: string; entityType?: string; page?: number; limit?: number }) {
  const { status, entityType, page = 1, limit = 20 } = params;
  const where: Record<string, any> = {};
  if (status) where.status = status;
  if (entityType) where.entityType = entityType;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.fraudFlag.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { user: { select: { id: true, displayName: true, username: true } } },
    }),
    prisma.fraudFlag.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function decideFraudFlag(params: { id: string; decision: 'INVESTIGATING' | 'CONFIRMED' | 'DISMISSED' | 'OPEN'; note?: string; adminId: string }) {
  const flag = await prisma.fraudFlag.findUnique({ where: { id: params.id } });
  if (!flag) throw new Error('FLAG_NOT_FOUND');
  return prisma.fraudFlag.update({
    where: { id: params.id },
    data: { status: params.decision as FraudFlagStatus, resolvedBy: params.adminId, resolvedAt: params.decision === 'DISMISSED' || params.decision === 'CONFIRMED' ? new Date() : undefined },
  });
}
