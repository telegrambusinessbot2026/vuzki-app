import { kv } from './store';

/**
 * Distributed rate limiting + anti-spam guards for realtime actions
 * (messages, calls, Talk Now matches, likes, super likes, gifts).
 * Backed by the KV store (Redis w/ in-memory fallback) so limits hold across
 * socket instances.
 */

export interface RateLimitRule {
  /** max allowed actions in the window */
  max: number;
  /** window in ms */
  windowMs: number;
}

const RULES: Record<string, RateLimitRule> = {
  message: { max: 30, windowMs: 10_000 }, // 30 msgs / 10s
  message_recipient: { max: 60, windowMs: 60_000 }, // 60 msgs to same user / min
  call: { max: 10, windowMs: 60_000 }, // call attempts / min
  call_recipient: { max: 20, windowMs: 60_000 }, // call attempts to same user / min
  match: { max: 5, windowMs: 60_000 }, // Talk Now starts / min
  like: { max: 50, windowMs: 60_000 }, // likes / min
  super_like: { max: 5, windowMs: 60_000 }, // super likes / min
  gift: { max: 20, windowMs: 60_000 }, // gifts / min
  typing: { max: 5, windowMs: 1000 }, // typing pings / sec
};

function keyFor(rule: string, actor: string, scope?: string): string {
  return `rl:${rule}:${actor}${scope ? ':' + scope : ''}`;
}

/**
 * Returns true if the action is allowed. Use `peek` for non-blocking checks.
 */
export async function allow(
  rule: string,
  actor: string,
  scope?: string
): Promise<{ allowed: boolean; retryAfterMs: number; remaining: number }> {
  const r = RULES[rule];
  if (!r) return { allowed: true, retryAfterMs: 0, remaining: Infinity as unknown as number };
  const key = keyFor(rule, actor, scope);
  const count = await kv.incr(key, r.windowMs);
  if (count === 1) await kv.expire(key, r.windowMs);
  if (count > r.max) {
    // reset counter so we can compute remaining cooldown
    return { allowed: false, retryAfterMs: r.windowMs, remaining: 0 };
  }
  return { allowed: true, retryAfterMs: 0, remaining: r.max - count };
}

/** Additive spam guard: too many rapid actions => temporary mute/lockout. */
export async function spamGuard(actor: string, rule: string): Promise<boolean> {
  // e.g. 10 violation flags in 5 minutes => treat as spammer (return true means flagged)
  const key = `spam:${actor}:${rule}`;
  const n = await kv.incr(key, 5 * 60 * 1000);
  if (n === 1) await kv.expire(key, 5 * 60 * 1000);
  return n >= 10;
}

export function isRateLimited(result: { allowed: boolean }): boolean {
  return !result.allowed;
}

export async function resetRateLimiter(rule: string, actor: string, scope?: string) {
  await kv.del(keyFor(rule, actor, scope));
}
