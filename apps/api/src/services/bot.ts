import { prisma } from '@vuzki/database';
import { BOT } from '@vuzki/shared';
import { recordSafetySignal } from './risk';

/**
 * Bot / automation detection & spam protection.
 *
 * Deterministic signals detect automation: extremely fast repetitive actions,
 * identical messages, impossible interaction patterns, excessive requests and
 * suspicious account clusters. Rate limits (realtime/ratelimit.ts + API
 * middleware) handle volume; here we add progressive signals and lightweight
 * challenges. Never relies on CAPTCHA alone.
 */

export interface BotCheckResult {
  botLikelihood: 'LOW' | 'MEDIUM' | 'HIGH';
  signals: string[];
  shouldChallenge: boolean;
}

const ipRegister = new Map<string, number[]>();

export async function recordSignupIp(ip: string) {
  const key = ip || 'unknown';
  const now = Date.now();
  const arr = ipRegister.get(key);
  const window = 24 * 60 * 60 * 1000;
  if (arr) {
    const fresh = arr.filter((t) => now - t < window);
    fresh.push(now);
    if (fresh.length > BOT.MAX_SIGNUP_IP) {
      recordSafetySignal({ userId: 'system', signalType: 'BOT', score: 0.8, reason: 'Too many signups from single IP', metadata: { ip } }).catch(() => {});
    }
    ipRegister.set(key, fresh.slice(-50));
  } else {
    ipRegister.set(key, [now]);
  }
}

export async function checkBotActivity(params: { userId: string; action: 'message' | 'like' | 'call' | 'login' | 'signup'; identicalRecent?: number; speedMs?: number }): Promise<BotCheckResult> {
  const signals: string[] = [];
  let score = 0;

  const fresh = await prisma.user.findUnique({ where: { id: params.userId }, select: { createdAt: true } });
  const accountAgeMs = fresh ? Date.now() - new Date(fresh.createdAt).getTime() : 0;

  if (params.identicalRecent && params.identicalRecent >= BOT.IDENTICAL_MESSAGE_COUNT) {
    signals.push('IDENTICAL_MESSAGES');
    score += 45;
  }

  if (params.speedMs !== undefined && params.speedMs < 400 && accountAgeMs !== 0) {
    signals.push('ABNORMAL_SPEED');
    score += 30;
  }

  if (accountAgeMs < 10 * 60 * 1000 && (params.action === 'call' || params.action === 'like')) {
    signals.push('RAPID_ACCOUNT_ACTIVITY');
    score += 25;
  }

  if (score >= 40) {
    await recordSafetySignal({ userId: params.userId, signalType: 'BOT', score: score / 100, reason: signals.join(', '), metadata: { action: params.action } });
  }

  const botLikelihood: BotCheckResult['botLikelihood'] = score >= 70 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';
  // Progressive challenge only for medium-high bot risk, never blocking genuine users outright.
  const shouldChallenge = botLikelihood !== 'LOW';
  return { botLikelihood, signals, shouldChallenge };
}

export async function getActiveRestrictionsFor(userId: string): Promise<string[]> {
  const res = await prisma.userRestriction.findMany({
    where: { userId, isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    select: { type: true },
  });
  return res.map((r) => r.type);
}
