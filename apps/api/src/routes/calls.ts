import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@vuzki/database';
import { ApiErrorResponse } from '@vuzki/types';
import { wrap } from './helpers';
import { authenticate, AuthedRequest } from '../middleware/auth';
import { initiateCall, endCall, buildRtcConnection, calculateCallCost } from '../services/calls';
import { notify } from '../services/notification';
import { CallType, NotificationType } from '@vuzki/shared';
import { toPublicUser } from './helpers';
import {
  startMatchmaking,
  cancelMatchmaking,
  getUserMatch,
  resolveMatchForUser,
  getAvailableListeners,
} from '../realtime/matching';

export const callRoutes = Router();

// ============ TALK NOW (matchmaking) ============

// POST /calls/talk-now/start
callRoutes.post('/talk-now/start', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const { preferredGender, preferredLanguage, interests, mode } = z.object({
    preferredGender: z.string().optional(),
    preferredLanguage: z.string().optional(),
    interests: z.array(z.string()).optional(),
    mode: z.enum(['random', 'matched']).optional(),
  }).parse(req.body ?? {});

  const result = await startMatchmaking(req.auth!.userId, {
    preferredGender,
    preferredLanguage,
    interests,
    mode,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
}));

// GET /calls/talk-now/status
callRoutes.get('/talk-now/status', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const entry = await getUserMatch(req.auth!.userId);
  if (!entry) {
    return res.json({ success: true, data: { state: 'IDLE' } });
  }
  if (entry.state === 'MATCHED') {
    const match = await resolveMatchForUser(req.auth!.userId);
    return res.json({ success: true, data: { state: 'MATCHED', match } });
  }
  if (Date.now() > entry.expiryMs && entry.state === 'WAITING') {
    await cancelMatchmaking(req.auth!.userId);
    return res.json({ success: true, data: { state: 'EXPIRED' } });
  }
  res.json({ success: true, data: { state: entry.state } });
}));

// POST /calls/talk-now/cancel
callRoutes.post('/talk-now/cancel', authenticate(), wrap(async (req: AuthedRequest, res) => {
  await cancelMatchmaking(req.auth!.userId);
  res.json({ success: true, data: { state: 'CANCELLED' } });
}));

// GET /calls/talk-now/listeners - "No one is available right now" fallback
callRoutes.get('/talk-now/listeners', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const limit = z.coerce.number().min(1).max(50).default(20).parse(req.query.limit ?? 20);
  const items = await getAvailableListeners(req.auth!.userId, limit);
  res.json({ success: true, data: { items } });
}));

// POST /calls/initiate
callRoutes.post('/initiate', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const { receiverId, type } = z.object({
    receiverId: z.string(),
    type: z.enum([CallType.AUDIO, CallType.VIDEO]),
  }).parse(req.body);

  const { call, rate } = await initiateCall({ callerId: req.auth!.userId, receiverId, type });

  const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
  notify({
    userId: receiverId,
    type: NotificationType.INCOMING_CALL,
    title: 'Incoming call',
    body: `${receiver?.displayName || 'Someone'} is calling (${type.toLowerCase()})`,
    data: { callId: call.id, callerId: req.auth!.userId, type },
  }).catch(() => {});

  res.status(201).json({
    success: true,
    data: {
      call: { id: call.id, status: call.status, type: call.type, rate },
      rtc: buildRtcConnection(call.id, req.auth!.userId, type),
    },
  });
}));

// GET /calls/history
callRoutes.get('/history', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const calls = await prisma.call.findMany({
    where: { OR: [{ callerId: me }, { receiverId: me }, { participants: { some: { userId: me } } }] },
    include: {
      caller: true,
      receiver: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const items = calls.map((c) => {
    const other = c.callerId === me ? c.receiver : c.caller;
    const meRole = c.callerId === me ? 'CALLER' : 'RECEIVER';
    return {
      id: c.id,
      other: toPublicUser(other),
      type: c.type,
      status: c.status,
      role: meRole,
      startedAt: c.startedAt,
      endedAt: c.endedAt,
      durationSeconds: c.durationSeconds,
      costCoins: c.costCoins,
    };
  });
  res.json({ success: true, data: { items } });
}));

// GET /calls/cost?type=&minutes=
callRoutes.get('/cost', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const { type, minutes } = z.object({
    type: z.enum([CallType.AUDIO, CallType.VIDEO]),
    minutes: z.coerce.number().min(1).max(1440).default(1),
  }).parse(req.query);
  const cost = calculateCallCost(type, minutes);
  res.json({ success: true, data: { type, minutes, cost } });
}));

// POST /calls/:id/end
callRoutes.post('/:id/end', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const call = await prisma.call.findUnique({ where: { id: req.params.id } });
  if (!call) throw new ApiErrorResponse(404, 'CALL_NOT_FOUND', 'Call not found');
  // SECURITY: only a participant of the call may end it (prevents anyone from
  // force-terminating a paid call and triggering billing).
  if (call.callerId !== me && call.receiverId !== me) {
    throw new ApiErrorResponse(403, 'FORBIDDEN', 'Not part of this call');
  }
  const result = await endCall(req.params.id, { endBy: me });
  res.json({ success: true, data: result });
}));

// POST /calls/:id/rtc - get RTC conn token (for joining)
callRoutes.post('/:id/join', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const call = await prisma.call.findUnique({ where: { id: req.params.id } });
  if (!call) throw new ApiErrorResponse(404, 'CALL_NOT_FOUND', 'Call not found');
  // SECURITY: only a participant of the call may join it.
  const isParticipant =
    call.callerId === me || call.receiverId === me ||
    (await prisma.callParticipant.findFirst({ where: { callId: call.id, userId: me } })) !== null;
  if (!isParticipant) {
    throw new ApiErrorResponse(403, 'FORBIDDEN', 'Not part of this call');
  }
  res.json({ success: true, data: { rtc: buildRtcConnection(call.id, me, call.type) } });
}));
