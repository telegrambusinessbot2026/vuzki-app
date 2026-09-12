import { kv } from './store';
import { prisma } from '@vuzki/database';

/**
 * Presence service backed by the distributed KV store (Redis w/ in-memory
 * fallback). Never exposes network metadata; only user-facing states.
 *
 * States:
 *  - OFFLINE: no open socket / explicitly gone
 *  - ONLINE: available
 *  - AWAY: inactive for a while (no events)
 *  - BUSY: in an active call or declined further interactions
 *  - IN_CALL: currently in a call (RTC active)
 */

export type PresenceState = 'ONLINE' | 'AWAY' | 'BUSY' | 'IN_CALL' | 'OFFLINE';

export interface PresenceSnapshot {
  userId: string;
  state: PresenceState;
  lastActive: number; // epoch ms
  currentSession: string | null; // socket session id
  currentCall: string | null; // active call id if any
  updatedAt: number;
}

const PRESENCE_KEY = (id: string) => `presence:${id}`;
const PRESENCE_CHANNEL = 'presence:channel';
const PRESENCE_TTL_MS = 12 * 60 * 60 * 1000; // keep last state ~12h

export interface PresenceUpdate {
  userId: string;
  state: PresenceState;
  currentCall?: string | null;
  lastActive?: number;
}

function serialize(p: PresenceSnapshot): string {
  return JSON.stringify(p);
}

export function parsePresence(raw: string | null): PresenceSnapshot | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PresenceSnapshot;
  } catch {
    return null;
  }
}

export async function startPresenceChannel(handler: (msg: PresenceUpdate) => void) {
  await kv.subscribe(PRESENCE_CHANNEL, (channel, message) => {
    try {
      handler(parsePresence(message) as unknown as PresenceUpdate);
    } catch {
      /* ignore malformed */
    }
  });
}

export async function publishPresence(update: PresenceUpdate) {
  await kv.publish(PRESENCE_CHANNEL, JSON.stringify(update));
}

/**
 * Record a presence transition and announce it on the pub/sub channel for
 * multi-instance fan-out. Callers (socket events) pass their own io to fan out
 * to connected peers; the channel handles cross-instance propagation.
 */
export async function setPresence(
  params: PresenceUpdate & { sessionId?: string | null }
): Promise<PresenceSnapshot> {
  const prev = parsePresence(await kv.get(PRESENCE_KEY(params.userId)));
  const snapshot: PresenceSnapshot = {
    userId: params.userId,
    state: params.state,
    lastActive: params.lastActive ?? Date.now(),
    currentSession: params.sessionId !== undefined ? params.sessionId : prev?.currentSession ?? null,
    currentCall: params.currentCall !== undefined ? params.currentCall : prev?.currentCall ?? null,
    updatedAt: Date.now(),
  };
  await kv.set(PRESENCE_KEY(params.userId), serialize(snapshot), PRESENCE_TTL_MS);

  const hydrate = async () => {
    await prisma.user.update({
      where: { id: params.userId },
      data: {
        onlineStatus: params.state !== 'OFFLINE',
        lastActiveAt: new Date(snapshot.lastActive),
      },
    });
  };
  // fire-and-forget DB persistence keeps socket handling non-blocking
  hydrate().catch(() => {});

  await publishPresence({
    userId: params.userId,
    state: params.state,
    currentCall: snapshot.currentCall,
    lastActive: snapshot.lastActive,
  });
  return snapshot;
}

export async function getPresence(userId: string): Promise<PresenceSnapshot | null> {
  const raw = await kv.get(PRESENCE_KEY(userId));
  return parsePresence(raw);
}

export async function getUsersPresence(userIds: string[]): Promise<Record<string, PresenceSnapshot>> {
  const out: Record<string, PresenceSnapshot> = {};
  await Promise.all(
    userIds.map(async (id) => {
      const p = await getPresence(id);
      if (p) out[id] = p;
      else out[id] = { userId: id, state: 'OFFLINE', lastActive: 0, currentSession: null, currentCall: null, updatedAt: 0 };
    })
  );
  return out;
}

export async function setCurrentCall(userId: string, callId: string | null) {
  const prev = parsePresence(await kv.get(PRESENCE_KEY(userId)));
  const snapshot = prev
    ? {
        ...prev,
        currentCall: callId,
        state: callId ? ('IN_CALL' as PresenceState) : (prev.state === 'IN_CALL' ? 'ONLINE' as PresenceState : prev.state),
        updatedAt: Date.now(),
      }
    : {
        userId,
        state: (callId ? 'IN_CALL' : 'ONLINE') as PresenceState,
        lastActive: Date.now(),
        currentSession: null,
        currentCall: callId,
        updatedAt: Date.now(),
      };
  await kv.set(PRESENCE_KEY(userId), JSON.stringify(snapshot), PRESENCE_TTL_MS);
  const up: PresenceUpdate = { userId, state: snapshot.state, currentCall: callId };
  await publishPresence(up);
  return snapshot;
}

export async function isOnlinePresence(userId: string): Promise<boolean> {
  const p = await getPresence(userId);
  return !!p && p.state !== 'OFFLINE';
}

export async function clearPresence(userId: string) {
  await kv.del(PRESENCE_KEY(userId));
  await publishPresence({ userId, state: 'OFFLINE', lastActive: Date.now() });
}
