import { kv } from './store';
import { CallType, CallConnectionStatus } from '@vuzki/shared';

/**
 * Live call session state machine (not persisted - lives in the KV store).
 *
 * Coarse persisted status lives on Call.status (RINGING/.../COMPLETED) in the
 * DB; this tracker holds the realtime sub-state used for signaling and the
 * WebRTC connection lifecycle:
 *
 *   RINGING -> ACCEPTED -> CONNECTING -> CONNECTED
 *   CONNECTED <-> RECONNECTING (on peer drop)
 *   ACCEPTED/CONNECTING/CONNECTED -> ENDED / FAILED
 *   RINGING -> REJECTED | CANCELLED | MISSED | BUSY
 */

export type CallLiveStatus =
  | 'RINGING'
  | 'ACCEPTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'BUSY'
  | 'REJECTED'
  | 'MISSED'
  | 'CANCELLED'
  | 'ENDED'
  | 'FAILED';

export interface PeerConnectionState {
  userId: string;
  role: 'CALLER' | 'RECEIVER';
  connection: CallConnectionStatus;
  joinedAt: number;
  lastActiveAt: number;
}

export interface CallSession {
  callId: string;
  type: CallType;
  callerId: string;
  receiverId: string;
  status: CallLiveStatus;
  createdAt: number;
  answeredAt?: number;
  connectedAt?: number;
  endedAt?: number;
  ringingDeadlineMs?: number;
  peers: Record<string, PeerConnectionState>;
  reconnectDeadlineMs?: number;
}

const SESSION_KEY = (id: string) => `call:session:${id}`;
const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
export const RECONNECT_GRACE_MS = 20_000;

export const TERMINAL_LIVE_STATUSES: CallLiveStatus[] = ['ENDED', 'FAILED', 'REJECTED', 'MISSED', 'CANCELLED', 'BUSY'];

export function isCallTerminal(status: CallLiveStatus): boolean {
  return TERMINAL_LIVE_STATUSES.includes(status);
}

function sessKey(callId: string) {
  return SESSION_KEY(callId);
}

export async function createCallSession(params: {
  callId: string;
  type: CallType;
  callerId: string;
  receiverId: string;
}): Promise<CallSession> {
  const now = Date.now();
  const session: CallSession = {
    callId: params.callId,
    type: params.type,
    callerId: params.callerId,
    receiverId: params.receiverId,
    status: 'RINGING',
    createdAt: now,
    peers: {
      [params.callerId]: {
        userId: params.callerId,
        role: 'CALLER',
        connection: CallConnectionStatus.CONNECTING,
        joinedAt: now,
        lastActiveAt: now,
      },
    },
  };
  await kv.set(sessKey(params.callId), JSON.stringify(session), SESSION_TTL_MS);
  return session;
}

export async function getCallSession(callId: string): Promise<CallSession | null> {
  const raw = await kv.get(sessKey(callId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CallSession;
  } catch {
    return null;
  }
}

async function save(session: CallSession): Promise<CallSession> {
  await kv.set(sessKey(session.callId), JSON.stringify(session), SESSION_TTL_MS);
  return session;
}

export async function updateCallStatus(callId: string, status: CallLiveStatus): Promise<CallSession | null> {
  const s = await getCallSession(callId);
  if (!s) return null;
  s.status = status;
  const now = Date.now();
  if (status === 'ACCEPTED') s.answeredAt = now;
  if (status === 'CONNECTED') {
    s.connectedAt = now;
    for (const p of Object.values(s.peers)) p.connection = CallConnectionStatus.CONNECTED;
  }
  if (isCallTerminal(status)) s.endedAt = now;
  return save(s);
}

// Record the server-side ring deadline on the session so the timeout handler
// can check the field (and so multi-instance/pub-sub aware code can act on it).
export async function setRingingDeadline(callId: string, deadlineMs: number): Promise<CallSession | null> {
  const s = await getCallSession(callId);
  if (!s) return null;
  s.ringingDeadlineMs = deadlineMs;
  return save(s);
}

export async function addPeer(callId: string, peer: PeerConnectionState): Promise<CallSession | null> {
  const s = await getCallSession(callId);
  if (!s) return null;
  s.peers[peer.userId] = peer;
  s.status = s.status === 'RINGING' ? 'ACCEPTED' : s.status;
  return save(s);
}

export async function setPeerConnection(
  callId: string,
  userId: string,
  connection: CallConnectionStatus
): Promise<CallSession | null> {
  const s = await getCallSession(callId);
  if (!s) return null;
  const peer = s.peers[userId];
  if (!peer) return null;
  peer.connection = connection;
  peer.lastActiveAt = Date.now();

  if (connection === CallConnectionStatus.RECONNECTING) {
    s.reconnectDeadlineMs = Date.now() + RECONNECT_GRACE_MS;
    s.status = 'RECONNECTING';
  } else if (connection === CallConnectionStatus.CONNECTED) {
    if (s.status === 'RECONNECTING' || s.status === 'CONNECTING' || s.status === 'ACCEPTED') {
      s.status = 'CONNECTED';
    }
    s.reconnectDeadlineMs = undefined;
    if (Object.values(s.peers).every((p) => p.connection === CallConnectionStatus.CONNECTED)) {
      s.connectedAt = s.connectedAt ?? Date.now();
    }
  }
  return save(s);
}

export async function endCallSession(callId: string): Promise<CallSession | null> {
  const s = await getCallSession(callId);
  if (!s) return null;
  s.status = 'ENDED';
  s.endedAt = Date.now();
  await save(s);
  return s;
}

export async function cleanupCallSession(callId: string): Promise<void> {
  await kv.del(sessKey(callId));
}

export function otherPeer(session: CallSession, userId: string): string {
  return session.callerId === userId ? session.receiverId : session.callerId;
}

export function isCallActive(session: CallSession | null): boolean {
  if (!session) return false;
  return ['RINGING', 'ACCEPTED', 'CONNECTING', 'CONNECTED', 'RECONNECTING'].includes(session.status);
}
