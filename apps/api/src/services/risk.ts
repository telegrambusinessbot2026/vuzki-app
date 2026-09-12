import { prisma } from '@vuzki/database';
import { RiskLevel, ReportStatus, SecurityEventType } from '@vuzki/shared';
import { RISK } from '@vuzki/shared';

/**
 * Safety Risk Engine.
 *
 * Computes an INTERNAL risk score & tier for a user from aggregated signals.
 * Risk scores are never exposed to any client — only the LOW/MEDIUM/HIGH tier
 * is shown to authorized moderators, and even that is kept in the admin tool.
 *
 * Critical security & financial decisions remain controlled by deterministic
 * RULES (see restrictions.ts / fraud.ts). The AI/risk score only *assists*
 * prioritization and never auto-acts alone on uncertain signals.
 */

export interface SignalWeights {
  spam: number;
  scam: number;
  toxicity: number;
  fake: number;
  abuse: number;
  payment: number;
  referral: number;
  login: number;
}

const DEFAULT_WEIGHTS: SignalWeights = {
  spam: 10,
  scam: 20,
  toxicity: 8,
  fake: 15,
  abuse: 12,
  payment: 18,
  referral: 12,
  login: 10,
};

export interface RiskEvaluation {
  userId: string;
  totalScore: number;
  level: RiskLevel;
  signalCount: number;
  breakdown: Record<string, number>;
}

function tierFor(score: number): RiskLevel {
  if (score >= RISK.MEDIUM_MAX) return RiskLevel.HIGH;
  if (score >= RISK.LOW_MAX) return RiskLevel.MEDIUM;
  return RiskLevel.LOW;
}

const SIGNAL_TO_WEIGHT: Record<string, number> = {
  SPAM: DEFAULT_WEIGHTS.spam,
  SCAM: DEFAULT_WEIGHTS.scam,
  TOXICITY: DEFAULT_WEIGHTS.toxicity,
  FAKE: DEFAULT_WEIGHTS.fake,
  FAKE_PROFILE: DEFAULT_WEIGHTS.fake,
  ABUSE: DEFAULT_WEIGHTS.abuse,
  HARASSMENT: DEFAULT_WEIGHTS.abuse,
  PAYMENT_RISK: DEFAULT_WEIGHTS.payment,
  REFERRAL_FRAUD: DEFAULT_WEIGHTS.referral,
  SUSPICIOUS_LOGIN: DEFAULT_WEIGHTS.login,
  BOT: 10,
};

/**
 * Aggregate a user's persisted SafetySignals + relational signals into a risk
 * evaluation. Each contributing signal is capped so no single signal can force
 * a tier jump on its own.
 */
export async function evaluateUserRisk(userId: string): Promise<RiskEvaluation> {
  const [signals, reportsReceived, blocksReceived, moderationActions, securityEvents, restrictions] =
    await Promise.all([
      prisma.safetySignal.groupBy({
        by: ['signalType'],
        where: { userId },
        _count: { _all: true },
      }),
      prisma.report.count({ where: { reportedUserId: userId } }),
      prisma.block.count({ where: { blockedId: userId } }),
      prisma.moderationAction.count({ where: { userId: userId } }),
      prisma.securityEvent.count({
        where: { userId, type: SecurityEventType.SUSPICIOUS_LOGIN },
      }),
      prisma.userRestriction.count({ where: { userId, isActive: true } }),
    ]);

  const breakdown: Record<string, number> = {};
  let total = 0;

  const add = (key: string, weight: number, multiplier: number) => {
    if (weight <= 0) return;
    const contribution = Math.round(Math.min(RISK.MAX_SIGNAL_WEIGHT, weight * multiplier) * 100) / 100;
    breakdown[key] = (breakdown[key] || 0) + contribution;
    total += contribution;
  };

  for (const s of signals) {
    const w = SIGNAL_TO_WEIGHT[s.signalType] || DEFAULT_WEIGHTS.spam;
    add(s.signalType, w, s._count._all / 2 + 0.5);
  }

  add('REPORTS', DEFAULT_WEIGHTS.abuse, reportsReceived / 2);
  add('BLOCKS', DEFAULT_WEIGHTS.toxicity, blocksReceived / 3);
  add('MOD_ACTIONS', DEFAULT_WEIGHTS.toxicity, moderationActions / 2);
  add('SUSPICIOUS_LOGINS', DEFAULT_WEIGHTS.login, securityEvents);
  add('ACTIVE_RESTRICTIONS', DEFAULT_WEIGHTS.toxicity, restrictions);

  total = Math.round(total * 100) / 100;

  await prisma.userRisk.upsert({
    where: { userId },
    create: {
      userId,
      level: tierFor(total),
      totalScore: total,
      signalCount: signals.length + reportsReceived + securityEvents,
      breakdown,
      lastComputedAt: new Date(),
      flaggedAt: total >= RISK.MEDIUM_MAX ? new Date() : undefined,
    },
    update: {
      level: tierFor(total),
      totalScore: total,
      signalCount: signals.length + reportsReceived + securityEvents,
      breakdown,
      lastComputedAt: new Date(),
      flaggedAt: total >= RISK.MEDIUM_MAX ? new Date() : undefined,
    },
  });

  return { userId, totalScore: total, level: tierFor(total), signalCount: signals.length, breakdown };
}

/**
 * Get the current (cached) risk tier. Recomputes if none exists yet.
 * Returns only the internal tier — callers decide how to use it.
 */
export async function getUserRiskLevel(userId: string): Promise<RiskLevel> {
  const cached = await prisma.userRisk.findUnique({ where: { userId } });
  if (cached) return (cached.level as RiskLevel) || RiskLevel.LOW;
  const evalResult = await evaluateUserRisk(userId);
  return evalResult.level;
}

/**
 * Fire-and-forget recompute (does not block the caller's response path).
 */
export function queueRiskEvaluation(userId: string): void {
  evaluateUserRisk(userId).catch(() => {});
}

/**
 * Record a raw safety signal and kick an async recompute. Deterministic rules
 * (not this score) decide whether to restrict.
 */
export async function recordSafetySignal(input: {
  userId: string;
  signalType: string;
  score?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.safetySignal
    .create({
      data: {
        userId: input.userId,
        signalType: input.signalType,
        score: input.score ?? 1,
        reason: input.reason ?? undefined,
        metadata: (input.metadata as any) ?? undefined,
      },
    })
    .catch(() => {});
  queueRiskEvaluation(input.userId);
}

export async function listHighRiskUsers(limit = 50): Promise<any[]> {
  return prisma.userRisk.findMany({
    where: { level: { in: [RiskLevel.HIGH, RiskLevel.MEDIUM] } },
    orderBy: [{ level: 'desc' }, { totalScore: 'desc' }],
    take: limit,
    include: { user: { select: { id: true, displayName: true, username: true, status: true, isCreator: true } } },
  });
}
