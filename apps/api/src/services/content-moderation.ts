import { config } from '../config';
import { prisma } from '@vuzki/database';
import { TOXICITY_THRESHOLD, ContentFlagType, ContentFlagStatus } from '@vuzki/shared';
import { moderateText } from './ai-moderation';

/**
 * AI Content Moderation — text & image safety with privacy preservation.
 *
 * Key properties:
 *  - AI is an *assistant* producing a signal (FLAG / CLEAR / REVIEW). It never
 *    makes irreversible decisions by itself.
 *  - Deterministic rules keep the platform running even if AI fails entirely.
 *  - AI decisions + the eventual human decision are stored in ModerationAudit.
 *  - Uncertain / medium-confidence cases go to a ContentFlag review queue.
 *  - Message *content* is scanned in-memory; we do not persist raw text other
 *    than the message itself that already exists by platform design.
 */

export interface ModerationSignal {
  flagged: boolean;
  clear: boolean;
  review: boolean;
  score: number;
  categories: string[];
  provider: string;
  modelId: string | null;
  version: string | null;
}

const DETERMINISTIC_PROVIDER = 'deterministic';
const REVIEW_THRESHOLD = 0.55; // at/above this -> queue for human review
const BLOCK_THRESHOLD = 0.95; // near-certain -> reject outright (deterministic)

/** AI provider call that must NEVER throw — returns null on failure. */
async function safeAiCall<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await Promise.race([fn(), new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500))]);
  } catch {
    return null;
  }
}

/**
 * Moderate arbitrary text with AI assist + deterministic fallback.
 * On any AI failure, returns the deterministic result so messaging & discovery
 * continue operating normally.
 */
export async function moderateTextContent(text: string, input: { type?: 'message' | 'bio' | 'report'; userId?: string; contextId?: string }): Promise<ModerationSignal> {
  const deterministic = await moderateText(text, { type: input.type ?? 'message', userId: input.userId, contextId: input.contextId });
  const score = deterministic.score;

  let ai: ModerationSignal | null = null;
  if (config.aiProvider === 'openai' && config.openaiApiKey) {
    ai = await safeAiCall(() => openaiModeration(text));
  }

  const mergedScore = Math.max(score, ai?.score ?? 0);
  const categories = [...new Set([...deterministic.categories, ...(ai?.categories ?? [])])];
  const provider = ai ? ai.provider : DETERMINISTIC_PROVIDER;
  const modelId = ai ? ai.modelId : null;

  const signal: ModerationSignal = {
    flagged: mergedScore >= TOXICITY_THRESHOLD,
    clear: mergedScore < REVIEW_THRESHOLD,
    review: mergedScore >= REVIEW_THRESHOLD && mergedScore < BLOCK_THRESHOLD,
    score: Math.round(mergedScore * 100) / 100,
    categories,
    provider,
    modelId,
    version: ai?.version ?? null,
  };

  await persistAudit(signal, input.userId, input.contextId, 'TEXT');
  return signal;
}

/** Whether to hard-block a message via deterministic near-certain signal. */
export function shouldHardBlock(signal: ModerationSignal): boolean {
  return signal.score >= BLOCK_THRESHOLD && signal.review === false;
}

/**
 * Scan text and return a decision for the chat pipeline:
 *  - HARD_BLOCK  -> reject and replace with an inline "message hidden" note
 *  - FLAG        -> deliver but record a content flag / risk signal
 *  - REVIEW      -> queue for human review (deliver with soft text)
 *  - ALLOW       -> deliver normally
 */
export async function scanOutgoingText(text: string, userId: string, contextId?: string): Promise<{ decision: 'HARD_BLOCK' | 'FLAG' | 'REVIEW' | 'ALLOW'; signal: ModerationSignal }> {
  const signal = await moderateTextContent(text, { type: 'message', userId, contextId });
  if (signal.score >= BLOCK_THRESHOLD) {
    return { decision: 'HARD_BLOCK', signal };
  }
  if (signal.review) {
    await enqueueContentFlag({ contentType: ContentFlagType.TEXT, contentId: contextId, ownerUserId: userId, category: signal.categories[0] || 'GENERAL', confidence: signal.score, provider: signal.provider, modelId: signal.modelId ?? undefined, isBlocking: true });
    return { decision: 'REVIEW', signal };
  }
  if (signal.flagged) {
    return { decision: 'FLAG', signal };
  }
  return { decision: 'ALLOW', signal };
}

/**
 * Image safety: validate dimensions/type and run the configured moderation
 * service. Never returns sensitive provider details; outcomes are stored in a
 * ContentFlag review queue for uncertain cases.
 */
export async function scanImage(input: {
  mime: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  ownerUserId: string;
  photoId?: string;
}): Promise<{ decision: 'ALLOW' | 'REVIEW' | 'REJECT'; signal: ModerationSignal; status: string }> {
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!ALLOWED_IMAGE_TYPES.includes(input.mime)) {
    await recordHardReject(input.ownerUserId, input.photoId, 'INVALID_TYPE');
    return { decision: 'REJECT', signal: emptySignal('type'), status: ContentFlagStatus.REJECTED };
  }
  if (input.sizeBytes > 10 * 1024 * 1024) {
    await recordHardReject(input.ownerUserId, input.photoId, 'TOO_LARGE');
    return { decision: 'REJECT', signal: emptySignal('size'), status: ContentFlagStatus.REJECTED };
  }

  let decision: 'ALLOW' | 'REVIEW' | 'REJECT' = 'ALLOW';
  let signal: ModerationSignal = { flagged: false, clear: true, review: false, score: 0, categories: [], provider: DETERMINISTIC_PROVIDER, modelId: null, version: null };

  if (config.imageModerationEnabled && config.imageModerationProvider !== 'off' && config.openaiApiKey) {
    signal = (await safeAiCall(() => openaiImageScan(input.mime))) ?? signal;
    if (signal.score >= BLOCK_THRESHOLD) decision = 'REJECT';
    else if (signal.review) decision = 'REVIEW';
    else if (signal.flagged) decision = 'REVIEW';
  }

  await persistAudit(signal, input.ownerUserId, input.photoId, 'IMAGE');
  if (decision !== 'ALLOW') {
    await enqueueContentFlag({ contentType: ContentFlagType.IMAGE, contentId: input.photoId, ownerUserId: input.ownerUserId, category: signal.categories[0] || 'IMAGE_RISK', confidence: signal.score, provider: signal.provider, modelId: signal.modelId ?? undefined, isBlocking: decision === 'REJECT' });
    return { decision, signal, status: decision === 'REJECT' ? ContentFlagStatus.REJECTED : ContentFlagStatus.REVIEW };
  }
  return { decision, signal, status: ContentFlagStatus.APPROVED };
}

async function recordHardReject(ownerUserId: string, photoId: string | undefined, reason: string) {
  await prisma.contentFlag.create({
    data: {
      contentType: ContentFlagType.IMAGE,
      contentId: photoId,
      ownerUserId,
      category: 'DISALLOWED_CONTENT',
      confidence: 1,
      status: ContentFlagStatus.REJECTED,
      provider: DETERMINISTIC_PROVIDER,
      isBlocking: true,
      modelId: `${reason}`,
    },
  }).catch(() => {});
}

function emptySignal(reason: string): ModerationSignal {
  return { flagged: false, clear: false, review: false, score: 0, categories: [reason], provider: DETERMINISTIC_PROVIDER, modelId: null, version: null };
}

function emptyFlag(): ModerationSignal {
  return { flagged: false, clear: true, review: false, score: 0, categories: [], provider: DETERMINISTIC_PROVIDER, modelId: null, version: null };
}

export async function enqueueContentFlag(params: {
  contentType: string;
  contentId?: string;
  ownerUserId: string;
  category: string;
  confidence: number;
  provider: string;
  modelId?: string;
  isBlocking?: boolean;
}) {
  return prisma.contentFlag.create({ data: params as any }).catch(() => null);
}

async function persistAudit(signal: ModerationSignal, userId?: string, contextId?: string, contentType?: string) {
  await prisma.moderationAudit.create({
    data: {
      modelId: signal.modelId || signal.provider,
      version: signal.version,
      category: signal.categories[0] || 'GENERAL',
      confidence: signal.score,
      result: signal.flagged ? (signal.review ? 'REVIEW' : 'FLAG') : 'CLEAR',
      userId,
      contextId,
      metadata: { provider: signal.provider, contentType },
    },
  }).catch(() => {});
}

// External AI provider integration points (async only when a key is present).
async function openaiModeration(text: string): Promise<ModerationSignal> {
  const res = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.openaiApiKey}` },
    body: JSON.stringify({ input: text }),
  });
  if (!res.ok) return emptyFlag();
  const json: any = await res.json();
  const r = json?.results?.[0];
  const catMap: Record<string, string> = { harassment: 'HARASSMENT', hate: 'HATE', violence: 'THREATS', sexual: 'INAPPROPRIATE', self_harm: 'SAFETY', 'sexual/minors': 'SEXUAL_EXPLOITATION' };
  const categories: string[] = [];
  if (r?.categories) {
    for (const [k, v] of Object.entries(r.categories)) {
      if (v) categories.push(catMap[k] || k.toUpperCase());
    }
  }
  const score = r ? (1 - (r.category_scores?.harassment ? (1 - r.category_scores?.harassment) : r.score ?? 0)) : 0;
  return {
    flagged: r?.flagged ?? false,
    clear: !r?.flagged,
    review: !!(r?.flagged && (r?.score ?? 0) < BLOCK_THRESHOLD),
    score: r?.score ?? 0,
    categories,
    provider: 'openai',
    modelId: 'openai:moderation-latest',
    version: config.aiModerationVersion,
  };
}

async function openaiImageScan(mime: string): Promise<ModerationSignal> {
  // Content moderation for images requires image input support; this is a
  // controlled stub that never throws. When no provider is configured, the
  // deterministic path (type/size) is authoritative.
  return emptyFlag();
}

export async function countReviewQueue() {
  return prisma.contentFlag.count({ where: { status: ContentFlagStatus.REVIEW } });
}

export async function listContentFlags(params: { status?: string; page?: number; limit?: number }) {
  const { status, page = 1, limit = 20 } = params;
  const where: Record<string, any> = {};
  if (status) where.status = status;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.contentFlag.findMany({
      where,
      orderBy: [{ isBlocking: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
      include: { user: { select: { id: true, displayName: true, username: true } } },
    }),
    prisma.contentFlag.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function decideContentFlag(params: { id: string; decision: 'APPROVED' | 'REJECTED' | 'REMOVED'; note?: string; adminId: string }) {
  return prisma.contentFlag.update({
    where: { id: params.id },
    data: { status: params.decision, reviewedBy: params.adminId, reviewedAt: new Date() },
  });
}
