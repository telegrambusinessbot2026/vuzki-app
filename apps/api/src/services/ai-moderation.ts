import { config } from '../config';
import { prisma } from '@vuzki/database';
import { TOXICITY_THRESHOLD } from '@vuzki/shared';

export interface ModerationResult {
  flagged: boolean;
  score: number;
  categories: string[];
  reasons: string[];
}

// Heuristic + optional external AI moderation.
// Designed to FLAG for human review, NEVER auto-ban.
export async function moderateText(text: string, input: { type: 'message' | 'bio' | 'report'; contextId?: string; userId?: string }): Promise<ModerationResult> {
  const heuristic = heuristicCheck(text);

  let ai: ModerationResult | null = null;
  if (config.aiProvider === 'openai' && config.openaiApiKey) {
    ai = await aiCheck(text);
  }

  const score = Math.max(heuristic.score, ai?.score ?? 0);
  const categories = [...new Set([...heuristic.categories, ...(ai?.categories ?? [])])];
  const reasons = [...new Set([...heuristic.reasons, ...(ai?.reasons ?? [])])];

  const flagged = score >= TOXICITY_THRESHOLD;

  if (flagged && (input.userId || input.contextId)) {
    await recordSignal(input, score, categories);
  }

  return { flagged, score, categories, reasons };
}

function heuristicCheck(text: string) {
  const t = text.toLowerCase();
  const spamPatterns = [
    { key: 'spam', re: /(free money|click here|win prize|limited offer|bitcoin|buy now|earn daily|investment)/i, score: 0.6 },
    { key: 'scam', re: /(send money|bank details|otp|card number|upi pin|password|trust me bro|deposit)/i, score: 0.8 },
    { key: 'toxic', re: /(\b(suck|idiot|stupid|loser|ugly)\b|die|kill yourself|hate you)/i, score: 0.85 },
    { key: 'harass', re: /(send nudes|sexy pic|permission|cum|let me f\\*ck|slut)\w*/i, score: 0.9 },
  ];
  const categories: string[] = [];
  const reasons: string[] = [];
  let maxScore = 0;
  for (const p of spamPatterns) {
    if (p.re.test(t)) {
      categories.push(p.key);
      reasons.push(p.key);
      maxScore = Math.max(maxScore, p.score);
    }
  }
  return { flagged: maxScore >= TOXICITY_THRESHOLD, score: maxScore, categories, reasons };
}

async function aiCheck(text: string): Promise<ModerationResult | null> {
  // Integrate with OpenAI moderation endpoint here when OPENAI_API_KEY is provided.
  return null;
}

async function recordSignal(input: { type: string; contextId?: string; userId?: string }, score: number, categories: string[]) {
  if (!input.userId) return;
  await prisma.safetySignal.create({
    data: {
      userId: input.userId,
      signalType: categories[0] || 'GENERAL',
      score,
      reason: `Auto-flagged ${input.type}`,
      metadata: { contextId: input.contextId, categories },
    },
  }).catch(() => {});
}

export function isBlockedPair(userA: string, userB: string): Promise<boolean> {
  return prisma.block
    .findFirst({
      where: {
        OR: [
          { blockerId: userA, blockedId: userB },
          { blockerId: userB, blockedId: userA },
        ],
      },
    })
    .then((b) => !!b);
}
