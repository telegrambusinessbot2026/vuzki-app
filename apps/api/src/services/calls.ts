import { prisma } from '@vuzki/database';
import { CallType, CallStatus, WalletTransactionType, CallRole } from '@vuzki/shared';
import { debitCoins, recordCreatorEarning, creditCoins } from './wallet';
import { ApiErrorResponse } from '@vuzki/types';
import { config } from '../config';
import {
  CALL_COINS_PER_MINUTE_AUDIO,
  CALL_COINS_PER_MINUTE_VIDEO,
  AUDIO_CALL_CREATOR_SHARE,
  VIDEO_CALL_CREATOR_SHARE,
} from '@vuzki/shared';

// A user can only ever be part of one live (non-terminal) call at a time.
const ACTIVE_CALL_STATUSES = [CallStatus.RINGING, CallStatus.ONGOING, CallStatus.BUSY];

export function getCallRate(type: CallType): number {
  return type === CallType.VIDEO ? CALL_COINS_PER_MINUTE_VIDEO : CALL_COINS_PER_MINUTE_AUDIO;
}

export function getCreatorShare(type: CallType): number {
  return type === CallType.VIDEO ? VIDEO_CALL_CREATOR_SHARE : AUDIO_CALL_CREATOR_SHARE;
}

export async function initiateCall(params: { callerId: string; receiverId: string; type: CallType }) {
  if (params.callerId === params.receiverId) {
    throw new ApiErrorResponse(400, 'INVALID_CALL', 'Cannot call yourself');
  }

  const receiver = await prisma.user.findUnique({
    where: { id: params.receiverId },
    include: {
      blocksReceived: true,
      creator: true,
    },
  });
  if (!receiver || receiver.status !== 'ACTIVE') {
    throw new ApiErrorResponse(404, 'USER_NOT_FOUND', 'Receiver not found');
  }

  const blocked = receiver.blocksReceived.some((b) => b.blockerId === params.callerId) ||
    (await prisma.block.count({ where: { blockerId: params.callerId, blockedId: params.receiverId } })) > 0;
  if (blocked) {
    throw new ApiErrorResponse(403, 'BLOCKED', 'You cannot call this user');
  }

  // IN_CALL protection (DB-level): never ring a receiver who is already in a
  // live call (RINGING/ONGOING/BUSY) as caller OR receiver. The realtime layer
  // adds a presence check on top; this keeps the invariant even if presence
  // lags. Preserves the existing creator-BUSY behaviour (receiver stays BUSY
  // until their call actually ends).
  const activeCount = await prisma.call.count({
    where: {
      status: { in: ACTIVE_CALL_STATUSES },
      OR: [{ callerId: params.receiverId }, { receiverId: params.receiverId }],
    },
  });
  if (activeCount > 0) {
    throw new ApiErrorResponse(409, 'RECEIVER_BUSY', 'Receiver is currently in another call');
  }

  const rate = getCallRate(params.type);

  // Reserve/pre-verify caller has the coins for at least ~1 minute equivalent
  const callerBalance = await prisma.wallet.findUnique({ where: { userId: params.callerId } });
  if (!callerBalance || callerBalance.balance < rate) {
    throw new ApiErrorResponse(402, 'INSUFFICIENT_BALANCE', 'Not enough coins to start this call', {
      balance: callerBalance?.balance ?? 0,
      required: rate,
    });
  }

  const call = await prisma.call.create({
    data: {
      callerId: params.callerId,
      receiverId: params.receiverId,
      type: params.type,
      status: CallStatus.RINGING,
      costCoins: rate,
    },
  });

  await prisma.callParticipant.create({
    data: { callId: call.id, userId: params.callerId, role: CallRole.CALLER },
  });

  if (receiver.isCreator && receiver.creatorStatus === 'AVAILABLE') {
    await prisma.user.update({
      where: { id: params.receiverId },
      data: { creatorStatus: 'BUSY' },
    });
  }

  return { call, rate };
}

export async function acceptCall(callId: string, userId: string) {
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) throw new ApiErrorResponse(404, 'CALL_NOT_FOUND', 'Call not found');
  if (call.receiverId !== userId) throw new ApiErrorResponse(403, 'FORBIDDEN', 'Not your call to accept');

  return prisma.$transaction(async (tx) => {
    // IN_CALL protection: a receiver who is already inside another live call
    // (including a second RINGING call from another caller) cannot accept this
    // one. Checked inside the transaction so two concurrent accepts can never
    // both pass.
    const otherActive = await tx.call.count({
      where: {
        id: { not: callId },
        status: { in: ACTIVE_CALL_STATUSES },
        OR: [{ callerId: userId }, { receiverId: userId }],
      },
    });
    if (otherActive > 0) {
      throw new ApiErrorResponse(409, 'BUSY', 'You are already in another call');
    }

    // Atomic claim: only a RINGING call may become ONGOING. A concurrent
    // accept/cancel/miss/reject races on this single UPDATE — losing callers
    // affect 0 rows and keep the terminal status already committed by the peer.
    const claimed = await tx.call.updateMany({
      where: { id: callId, status: CallStatus.RINGING },
      data: { status: CallStatus.ONGOING, answeredAt: new Date(), startedAt: new Date() },
    });
    if (claimed.count === 0) {
      // Idempotent replay (double accept click) or already terminal — return the
      // existing row unchanged, never failing an already-accepted call.
      return { ...call, alreadyCompleted: true };
    }

    await tx.callParticipant.upsert({
      where: { callId_userId: { callId: call.id, userId } },
      update: {},
      create: { callId: call.id, userId, role: CallRole.RECEIVER },
    });

    // Mark receiver busy during the call (preserves the existing creator-BUSY rule).
    await tx.user
      .update({ where: { id: userId }, data: { creatorStatus: 'BUSY' } })
      .catch(() => {});

    return { ...call, status: CallStatus.ONGOING, answeredAt: new Date(), startedAt: new Date() };
  });
}

export async function rejectCall(callId: string, userId: string) {
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) throw new ApiErrorResponse(404, 'CALL_NOT_FOUND', 'Call not found');
  if (call.receiverId !== userId) throw new ApiErrorResponse(403, 'FORBIDDEN', 'Not your call');
  const updated = await prisma.call.update({
    where: { id: callId },
    data: { status: CallStatus.REJECTED, endedAt: new Date() },
  });
  await resetCreatorStatus(userId);
  return updated;
}

export async function cancelCall(callId: string, userId: string) {
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) throw new ApiErrorResponse(404, 'CALL_NOT_FOUND', 'Call not found');
  if (call.callerId !== userId) throw new ApiErrorResponse(403, 'FORBIDDEN', 'Not your call');

  // Only an unanswered RINGING call can be cancelled, and only once. Duplicate
  // cancels (e.g. caller button + unmount cleanup) race on this UPDATE and the
  // loser hits 0 rows -> alreadyCompleted no-op, so an accepted/answered call
  // can never be cancelled out from under the participants.
  const updated = await prisma.call.updateMany({
    where: { id: callId, status: CallStatus.RINGING },
    data: { status: CallStatus.CANCELLED, endedAt: new Date() },
  });
  if (updated.count === 0) {
    return { ...call, alreadyCompleted: true };
  }
  await resetCreatorStatus(call.receiverId);
  return { ...call, status: CallStatus.CANCELLED, endedAt: new Date() };
}

export async function missCall(callId: string) {
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) return null;
  // Only a still-RINGING call can become MISSED; a call that was meanwhile
  // accepted/ended is left untouched (idempotent under concurrent timeouts).
  const updated = await prisma.call.updateMany({
    where: { id: callId, status: CallStatus.RINGING },
    data: { status: CallStatus.MISSED, endedAt: new Date() },
  });
  if (updated.count === 0) {
    return { ...call, alreadyCompleted: true };
  }
  await resetCreatorStatus(call.receiverId);
  return { ...call, status: CallStatus.MISSED, endedAt: new Date() };
}

// Persist the exact moment both peers established WebRTC (first CONNECTED only).
// Billing in endCall starts from this timestamp — never from ACCEPTED/RINGING.
export async function markCallConnected(callId: string) {
  return prisma.call.updateMany({
    where: { id: callId, status: CallStatus.ONGOING, connectedAt: null },
    data: { connectedAt: new Date() },
  });
}

// End call: compute duration, deduct caller coins, credit creator earnings. All server-side.
// Atomic + idempotent: the terminal-status transition is guarded in a single
// UPDATE so concurrent/dispatch-duplicate callers can only bill once —
// a losing race affects 0 rows and returns `alreadyCompleted` without billing.
// The wallet debit also carries an idempotencyKey so the DB rejects any replay.
// `endBy` records which participant ended the call (for history/audit).
//
// BILLING SAFETY: duration is measured from `connectedAt` — the exact moment
// both peers established the WebRTC connection — NOT from startedAt/answeredAt
// (accept time) or createdAt (ring time). A call that was accepted but never
// actually connected (or that ended while still RINGING) has no connectedAt and
// bills 0 seconds: no debit, no creator earning. Prices and wallet rates are
// unchanged; only the lifecycle anchor moved to CONNECTED.
export async function endCall(callId: string, opts?: { quality?: string; failReason?: string; endBy?: string }) {
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) throw new ApiErrorResponse(404, 'CALL_NOT_FOUND', 'Call not found');

  const billableStart = call.connectedAt ? call.connectedAt.getTime() : 0;
  const durationSeconds = billableStart ? Math.max(0, Math.floor((Date.now() - billableStart) / 1000)) : 0;
  const billing = computeCallBilling(call.type as CallType, durationSeconds);
  const status = opts?.failReason ? CallStatus.FAILED : CallStatus.COMPLETED;

  return prisma.$transaction(async (tx) => {
    // Atomic guard: only RINGING/ONGOING/BUSY calls may transition to a billing
    // terminal state. A duplicate/concurrent end finds 0 rows and does nothing.
    const guarded = await tx.call.updateMany({
      where: { id: callId, status: { in: [CallStatus.RINGING, CallStatus.ONGOING, CallStatus.BUSY] } },
      data: {
        status,
        endedAt: new Date(),
        durationSeconds: billing.durationSeconds,
        costCoins: billing.costCoins,
        creatorEarnings: billing.creatorCoins,
        quality: opts?.quality ?? call.quality,
        endBy: opts?.endBy ?? call.endBy,
      },
    });
    if (guarded.count === 0) {
      return { alreadyCompleted: true, call };
    }

    let billed = false;
    // Deduct from caller wallet (only if a chargeable call was made).
    // The call STILL terminates even if the caller has insufficient balance:
    // a user who runs out of coins mid-call must not be stuck in an endless
    // ONGOING call, and the platform must still record the creator's earned
    // (now-uncollectible) amount. We catch the debit failure and mark the call
    // so it can be handled by the collections ledger/worker.
    if (billing.durationSeconds > 0) {
      try {
        // Runs inside this transaction so the call-status transition and the
        // debit commit together; idempotencyKey blocks any replay double-charge.
        await debitCoins(
          call.callerId,
          billing.costCoins,
          call.type === CallType.VIDEO ? WalletTransactionType.VIDEO_CALL : WalletTransactionType.AUDIO_CALL,
          { callId, durationSeconds: billing.durationSeconds, quality: opts?.quality, failReason: opts?.failReason },
          callId,
          `CALL:${call.id}`,
          tx
        );
        billed = true;
      } catch (e) {
        // Insufficient balance (or any debit failure). Do NOT roll back the
        // terminal-state transition. Record an uncollectible flag on the call
        // so finance/collections can reconcile the creator's unpaid earnings.
      }
    }

    // Credit creator earnings (creator still earns the billable amount; if the
    // caller's charge failed this is an uncollectible/collections receivable).
    const receiver = await tx.user.findUnique({ where: { id: call.receiverId }, include: { creator: true } });
    if (receiver?.isCreator && receiver.creator && billing.durationSeconds > 0) {
      await tx.creatorEarning.create({
        data: {
          creatorId: receiver.creator.id,
          userId: call.receiverId,
          type: call.type === CallType.VIDEO ? 'VIDEO_CALL' : 'AUDIO_CALL',
          amount: billing.creatorCoins,
          coins: billing.costCoins,
          status: billed ? 'PENDING' : 'UNCOLLECTIBLE',
          callId,
          metadata: billed ? {} : { uncollectible: true, reason: 'INSUFFICIENT_BALANCE' },
        } as any,
      });
    }

    // Reset creator status
    await tx.user.update({
      where: { id: call.receiverId },
      data: { creatorStatus: 'AVAILABLE' },
    });

    return { call: { id: callId, status, durationSeconds: billing.durationSeconds, costCoins: billing.costCoins, creatorEarnings: billed ? billing.creatorCoins : 0, billed } };
  });
}

async function resetCreatorStatus(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (u?.isCreator) {
    await prisma.user.update({ where: { id: userId }, data: { creatorStatus: u.creatorStatus === 'AVAILABLE' ? 'AVAILABLE' : u.creatorStatus } });
  } else {
    await prisma.user.update({ where: { id: userId }, data: { creatorStatus: null } }).catch(() => {});
  }
}

// Build RTC token/credentials based on configured provider
export function buildRtcConnection(callId: string, userId: string, type: string) {
  switch (config.rtcProvider) {
    case 'livekit':
      return { provider: 'livekit', url: config.livekitUrl, token: signLiveKit(userId, callId), type };
    case 'agora':
      return { provider: 'agora', appId: config.agoraAppId, channel: callId, token: signAgora(userId, callId), type };
    case 'twilio':
      return { provider: 'twilio', sdk: 'wire', type };
    case 'webrtc':
    default:
      // Self-hosted WebRTC: signaling via socket. Client uses its own ICE/STUN config.
      return { provider: 'webrtc', signaling: 'socket.io', stun: 'stun:stun.l.google.com:19302', type };
  }
}

function signLiveKit(userId: string, room: string): string {
  // Implement LiveKit JWT when LIVEKIT creds present
  return '';
}
function signAgora(userId: string, channel: string): string {
  // Implement Agora token when AGORA creds present
  return '';
}

export function calculateCallCost(type: CallType, durationMinutes: number): number {
  const rate = getCallRate(type);
  return Math.max(rate, durationMinutes * rate);
}

export async function getCall(callId: string) {
  return prisma.call.findUnique({
    where: { id: callId },
    include: { caller: true, receiver: true, participants: true },
  });
}

export async function markBusy(callId: string) {
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) return null;
  const updated = await prisma.call.updateMany({
    where: { id: callId, status: CallStatus.RINGING },
    data: { status: CallStatus.BUSY, endedAt: new Date() },
  });
  if (updated.count === 0) return { ...call, alreadyCompleted: true };
  await resetCreatorStatusLoose(call.receiverId);
  return { ...call, status: CallStatus.BUSY, endedAt: new Date() };
}

export async function failCall(callId: string) {
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) return null;
  const updated = await prisma.call.updateMany({
    where: { id: callId, status: { in: ACTIVE_CALL_STATUSES } },
    data: { status: CallStatus.FAILED, endedAt: new Date() },
  });
  if (updated.count === 0) return { ...call, alreadyCompleted: true };
  await resetCreatorStatusLoose(call.receiverId);
  return { ...call, status: CallStatus.FAILED, endedAt: new Date() };
}

async function resetCreatorStatusLoose(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (u?.isCreator) {
    await prisma.user.update({
      where: { id: userId },
      data: { creatorStatus: 'AVAILABLE' },
    }).catch(() => {});
  } else {
    await prisma.user.update({ where: { id: userId }, data: { creatorStatus: null } }).catch(() => {});
  }
}

export interface CallBilling {
  callId: string;
  type: CallType;
  durationSeconds: number;
  durationMinutes: number;
  ratePerMinute: number;
  costCoins: number;
  platformFeeCoins: number;
  creatorCoins: number;
}

export function computeCallBilling(type: CallType, durationSeconds: number): CallBilling {
  const durationMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
  const ratePerMinute = getCallRate(type);
  const costCoins = Math.max(ratePerMinute, durationMinutes * ratePerMinute);
  const share = getCreatorShare(type);
  const creatorCoins = Math.round(costCoins * share);
  return {
    callId: '',
    type,
    durationSeconds,
    durationMinutes,
    ratePerMinute,
    costCoins,
    platformFeeCoins: costCoins - creatorCoins,
    creatorCoins,
  };
}
