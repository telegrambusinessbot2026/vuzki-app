/**
 * Server-side call lifecycle deadlines.
 *
 * These are the "make sure nothing is EVER left in a half-open state" handlers
 * for the call protocol. They run on in-flight timers armed by the realtime
 * layer and guarantee every RINGING / ACCEPTED / CONNECTED call terminates:
 *
 *   RINGING  + no answer in ~35s  -> MISSED  (both peers notified, BUSY cleared)
 *   ACCEPTED + no connection ~25s -> FAILED  (never billed — no connectedAt)
 *   CONNECTED + peer drop >grace  -> FAILED  (reconnect deadline, billed so far)
 *
 * Every handler is idempotent: it re-reads the live session and the DB row and
 * bails out silently if the call already moved to a terminal state.
 */

import { Server } from 'socket.io';
import { prisma } from '@vuzki/database';
import { CallStatus, NotificationType } from '@vuzki/shared';
import { endCall, missCall } from '../services/calls';
import { notify, getSocketIds } from '../services/notification';
import {
  getCallSession,
  updateCallStatus,
  cleanupCallSession,
  isCallTerminal,
} from './call-tracker';
import { setCurrentCall } from './presence';
import { realtimeMetrics } from './metrics';
import { clearCallTimers } from './timers';

export const RING_TIMEOUT_MS = 35_000; // within the 30–45s window
export const CONNECT_TIMEOUT_MS = 25_000; // accepted but WebRTC never establishes
export const RECONNECT_DEADLINE_BUFFER_MS = 1_000; // small slack past the grace period

function emitToUser(io: Server, userId: string, event: string, payload: unknown) {
  for (const id of getSocketIds(userId)) io.to(id).emit(event, payload);
}

async function clearLiveUserState(callId: string, callerId: string, receiverId: string) {
  await setCurrentCall(callerId, null).catch(() => {});
  await setCurrentCall(receiverId, null).catch(() => {});
}

/**
 * Ring timeout: the receiver never accepted or rejected the call within
 * RING_TIMEOUT_MS. Mark it MISSED (only if it is still RINGING), clear the
 * creator BUSY state, stop ringing, notify BOTH participants and tear down.
 */
export async function handleRingTimeout(callId: string, io: Server): Promise<void> {
  clearCallTimers(callId);
  const session = await getCallSession(callId);
  if (!session || isCallTerminal(session.status)) return;
  try {
    const row = await prisma.call.findUnique({ where: { id: callId } });
    if (!row || row.status !== CallStatus.RINGING) return;

    await missCall(callId).catch(() => {});
    await updateCallStatus(callId, 'MISSED').catch(() => {});
    realtimeMetrics.calls.missed++;

    emitToUser(io, session.callerId, 'call:missed', { callId, by: session.receiverId, reason: 'RING_TIMEOUT' });
    emitToUser(io, session.receiverId, 'call:missed', { callId, reason: 'RING_TIMEOUT' });
    io.to(`call:${callId}`).emit('call:state', { callId, status: 'MISSED', reason: 'RING_TIMEOUT' });

    await notify({ userId: session.callerId, type: NotificationType.MISSED_CALL, title: 'Call missed', body: 'Your call was not answered', data: { callId, receiverId: session.receiverId, reason: 'RING_TIMEOUT' } }).catch(() => {});
    await notify({ userId: session.receiverId, type: NotificationType.MISSED_CALL, title: 'Missed call', body: 'You missed a call', data: { callId, callerId: session.callerId, reason: 'RING_TIMEOUT' } }).catch(() => {});
  } finally {
    clearCallTimers(callId);
    await clearLiveUserState(callId, session.callerId, session.receiverId);
    await cleanupCallSession(callId).catch(() => {});
  }
}

/**
 * Connect timeout: the receiver accepted (DB ONGOING) but the WebRTC peers never
 * connected within CONNECT_TIMEOUT_MS. End the call as FAILED without billing —
 * endCall only bills from connectedAt, which was never set.
 */
export async function handleConnectTimeout(callId: string, io: Server): Promise<void> {
  clearCallTimers(callId);
  const session = await getCallSession(callId);
  if (!session || isCallTerminal(session.status)) return;
  if (session.status === 'CONNECTED') return; // connected before the deadline
  try {
    const result = await endCall(callId, { failReason: 'NO_CONNECTION' }).catch(() => null);
    await updateCallStatus(callId, 'FAILED').catch(() => {});
    realtimeMetrics.calls.failed++;

    emitToUser(io, session.callerId, 'call:ended', { callId, by: 'system', reason: 'NO_CONNECTION', ...result?.call });
    emitToUser(io, session.receiverId, 'call:ended', { callId, by: 'system', reason: 'NO_CONNECTION', ...result?.call });
    io.to(`call:${callId}`).emit('call:state', { callId, status: 'FAILED', reason: 'NO_CONNECTION' });
  } finally {
    clearCallTimers(callId);
    await clearLiveUserState(callId, session.callerId, session.receiverId);
    await cleanupCallSession(callId).catch(() => {});
  }
}

/**
 * Reconnect deadline: a peer disconnected from an established (CONNECTED) call
 * and never returned within the reconnect grace period. Cleanly end the call —
 * billing covers the actual CONNECTED time only, and the whole duration so far
 * is still billed fairly.
 */
export async function handleReconnectTimeout(callId: string, io: Server): Promise<void> {
  clearCallTimers(callId);
  const session = await getCallSession(callId);
  if (!session || isCallTerminal(session.status)) return;
  try {
    const result = await endCall(callId, { failReason: 'RECONNECT_TIMEOUT' }).catch(() => null);
    await updateCallStatus(callId, 'FAILED').catch(() => {});
    realtimeMetrics.calls.failed++;

    emitToUser(io, session.callerId, 'call:ended', { callId, by: 'system', reason: 'RECONNECT_TIMEOUT', ...result?.call });
    emitToUser(io, session.receiverId, 'call:ended', { callId, by: 'system', reason: 'RECONNECT_TIMEOUT', ...result?.call });
    io.to(`call:${callId}`).emit('call:state', { callId, status: 'FAILED', reason: 'RECONNECT_TIMEOUT' });
  } finally {
    clearCallTimers(callId);
    await clearLiveUserState(callId, session.callerId, session.receiverId);
    await cleanupCallSession(callId).catch(() => {});
  }
}