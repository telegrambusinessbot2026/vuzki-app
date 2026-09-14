import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '@vuzki/database';
import { allowedOrigins } from '../middleware/security';
import { getSocketIds, setIo, registerSocket, unregisterSocket } from '../services/notification';
import {
  acceptCall,
  rejectCall,
  cancelCall,
  endCall,
  missCall,
  markBusy,
  failCall,
  initiateCall,
  markCallConnected,
} from '../services/calls';
import { isBlockedPair } from '../services/ai-moderation';
import { moderateText } from '../services/ai-moderation';
import { notify } from '../services/notification';
import { sendGift } from '../services/gifts';
import { allow, isRateLimited, spamGuard } from './ratelimit';
import {
  setPresence,
  getPresence,
  setCurrentCall,
  startPresenceChannel,
} from './presence';
import {
  createCallSession,
  getCallSession,
  addPeer,
  setPeerConnection,
  updateCallStatus,
  cleanupCallSession,
  otherPeer,
  isCallActive,
  setRingingDeadline,
  CallLiveStatus,
  isCallTerminal,
} from './call-tracker';
import {
  armRingTimeout,
  armConnectTimeout,
  armReconnectDeadline,
  clearCallTimers,
} from './timers';
import {
  handleRingTimeout,
  handleConnectTimeout,
  handleReconnectTimeout,
  RING_TIMEOUT_MS,
  CONNECT_TIMEOUT_MS,
  RECONNECT_DEADLINE_BUFFER_MS,
} from './call-lifecycle';
import {
  startMatchmaking,
  cancelMatchmaking,
  getUserMatch,
  resolveMatchForUser,
  subscribeMatches,
} from './matching';
import { MessageType, CallConnectionStatus, CallStatus, NotificationType } from '@vuzki/shared';
import { realtimeMetrics } from './metrics';
import { canInteract, blockUser } from '../services/privacy';
import { isRestricted, RestrictionScope } from '../services/restrictions';
import { scanOutgoingText } from '../services/content-moderation';
import { processReportIntoCase } from '../services/moderation-cases';

type Socket = any;

export function createRealtimeServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins(),
      credentials: true,
    },
  });

  setIo(io);

  // JWT auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('unauthorized'));
    try {
      const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
      (socket as any).userId = payload.userId;
      if (!payload.userId) return next(new Error('unauthorized'));
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  // Presence / match fan-out across instances
  const localPresenceSockets: Record<string, Socket> = {};
  startPresenceChannel((up) => {
    io.emit('presence:update', up);
  }).catch(() => {});

  subscribeMatches((userId, match) => {
    for (const id of getSocketIds(userId)) {
      io.to(id).emit('match:found', match);
    }
  }).catch(() => {});

  io.on('connection', async (socket) => {
    const userId = (socket as any).userId as string;
    const socketId = socket.id;
    registerSocket(userId, socketId);
    void realtimeMetrics.connections.total;

    // Default: ONLINE presence
    const presence = await setPresence({
      userId,
      state: 'ONLINE',
      sessionId: socketId,
      lastActive: Date.now(),
    });
    io.emit('presence:update', { userId, state: presence.state, lastActive: presence.lastActive, currentCall: null });

    // Keep a local registry so we can push to this socket id directly
    localPresenceSockets[socketId] = socket;

    realtimeMetrics.connections.active = io.engine.clientsCount;
    realtimeMetrics.connections.peak = Math.max(realtimeMetrics.connections.peak, io.engine.clientsCount);
    void trackActiveUserSafe(userId);

    // ------------------------------------------------------------------
    // ROOM MEMBERSHIP
    // ------------------------------------------------------------------
    socket.on('room:join', (room: string) => socket.join(room));
    socket.on('room:leave', (room: string) => socket.leave(room));
    socket.on('conversation:join', (conversationId: string) => {
      socket.join(`conv:${conversationId}`);
    });
    socket.on('conversation:leave', (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
    });

    // ------------------------------------------------------------------
    // PRESENCE
    // ------------------------------------------------------------------
    socket.on('presence:set', async (payload, ack) => {
      const state = payload?.state;
      if (!['ONLINE', 'AWAY', 'BUSY'].includes(state)) return ack?.({ ok: false, error: 'INVALID_STATE' });
      const snapshot = await setPresence({ userId, state, sessionId: socketId, lastActive: Date.now() });
      io.emit('presence:update', {
        userId,
        state: snapshot.state,
        lastActive: snapshot.lastActive,
        currentCall: snapshot.currentCall,
      });
      ack?.({ ok: true });
    });

    // ------------------------------------------------------------------
    // CHAT & MESSAGES
    // ------------------------------------------------------------------
    socket.on('message:typing', async (payload) => {
      const { conversationId } = payload || {};
      const conv = await getConversation(conversationId, userId);
      if (!conv) return;
      const otherId = otherUser(conv, userId);
      const limit = await allow('typing', userId);
      if (!limit.allowed) return;
      emitToUser(io, otherId, 'message:typing', { conversationId, userId });
      emitToRoom(io, `conv:${conversationId}`, 'message:typing', { conversationId, userId, socketId: socket.id });
    });

    socket.on('message:stop_typing', async (payload) => {
      const { conversationId } = payload || {};
      const conv = await getConversation(conversationId, userId);
      if (!conv) return;
      const otherId = otherUser(conv, userId);
      emitToUser(io, otherId, 'message:stop_typing', { conversationId, userId });
    });

    socket.on('message:send', (payload, ack) => handleSendMessage(io, socket, userId, payload, ack));

    // Alias: replying uses the same pipeline with a reply context
    socket.on('message:reply', (payload, ack) => handleSendMessage(io, socket, userId, payload, ack));

    socket.on('message:read', async (payload, ack) => {
      try {
        const { conversationId } = payload || {};
        const conversation = await getConversation(conversationId, userId);
        if (!conversation) return ack?.({ ok: false, error: 'CONVERSATION_NOT_FOUND' });
        const otherId = otherUser(conversation, userId);

        const update = await prisma.message.updateMany({
          where: { conversationId, receiverId: userId, status: { in: ['SENT', 'DELIVERED'] } },
          data: { status: 'READ', readAt: new Date() },
        });
        await prisma.readReceipt.upsert({
          where: { conversationId_userId: { conversationId, userId } },
          update: { lastReadAt: new Date() },
          create: { conversationId, userId },
        });

        const readAt = new Date().toISOString();
        const readPayload = { conversationId, by: userId, readAt, count: update.count };
        emitToUser(io, otherId, 'message:read', readPayload);
        emitToRoom(io, `conv:${conversationId}`, 'message:read', { ...readPayload, socketId: socket.id });
        ack?.({ ok: true, readAt });
      } catch {
        ack?.({ ok: false });
      }
    });

    socket.on('message:reaction', async (payload, ack) => {
      try {
        const { messageId, emoji } = payload || {};
        if (!fileEmoji(emoji)) return ack?.({ ok: false, error: 'INVALID_EMOJI' });
        const message = await prisma.message.findUnique({ where: { id: messageId } });
        if (!message) return ack?.({ ok: false, error: 'MESSAGE_NOT_FOUND' });
        const conversation = await getConversation(message.conversationId, userId);
        if (!conversation) return ack?.({ ok: false, error: 'FORBIDDEN' });

        const reactions: Record<string, string[]> = (message.reactions as any) ?? {};
        const users = reactions[emoji] ? [...reactions[emoji]] : [];
        reactions[emoji] = users.includes(userId) ? users.filter((u) => u !== userId) : [...users, userId];
        await prisma.message.update({ where: { id: messageId }, data: { reactions: reactions as any } });

        const payloadOut = { messageId, conversationId: message.conversationId, by: userId, reactions };
        emitToRoom(io, `conv:${message.conversationId}`, 'message:reaction', payloadOut);
        const otherId = otherUser(conversation, userId);
        emitToUser(io, otherId, 'message:reaction', payloadOut);
        ack?.({ ok: true, reactions });
      } catch {
        ack?.({ ok: false });
      }
    });

    socket.on('message:delete', async (payload, ack) => {
      try {
        const { messageId } = payload || {};
        const message = await prisma.message.findUnique({ where: { id: messageId } });
        if (!message) return ack?.({ ok: false, error: 'MESSAGE_NOT_FOUND' });
        if (message.senderId !== userId) return ack?.({ ok: false, error: 'FORBIDDEN' });
        await prisma.message.update({ where: { id: messageId }, data: { unsent: true, content: '' } });
        const del = { messageId, conversationId: message.conversationId, by: userId };
        emitToRoom(io, `conv:${message.conversationId}`, 'message:deleted', del);
        const otherId = otherUser(
          { userAId: message.senderId, userBId: message.receiverId },
          userId
        );
        emitToUser(io, otherId, 'message:deleted', del);
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false });
      }
    });

    // ------------------------------------------------------------------
    // LIVE ROOM CHAT (live-stream room broadcasting)
    // ------------------------------------------------------------------
    socket.on('live:msg', async (payload) => {
      const { room, text } = payload || {};
      if (!room || typeof text !== 'string' || !text.trim()) return;
      const trimmed = text.trim().slice(0, 500);

      // Rate limit room messages per user.
      const limit = await allow('message', userId);
      if (!limit.allowed) return;

      // Moderate the text deterministically; hard-block clearly abusive input.
      try {
        const scan = await scanOutgoingText(trimmed, userId);
        if (scan.decision === 'HARD_BLOCK') return;
      } catch {
        /* AI failure -> deterministic rules already applied */
      }

      io.to(`live:${room}`).emit('live:msg', { from: userId, room, text: trimmed, timestamp: Date.now() });
    });

    // ------------------------------------------------------------------
    // CALLS (real-time signaling + state machine)
    // ------------------------------------------------------------------
    socket.on('call:initiate', async (payload, ack) => {
      try {
        const { receiverId, type } = payload || {};
        if (!receiverId || !['AUDIO', 'VIDEO'].includes(type)) return ack?.({ ok: false, error: 'INVALID_PAYLOAD' });

        // Safety enforcement (deterministic): blocking, restrictions, privacy.
        const interact = await canInteract({ actorId: userId, targetId: receiverId, kind: 'call' });
        if (!interact.allowed) return ack?.({ ok: false, error: interact.reason });
        if (await isRestricted(userId, RestrictionScope.CALL)) return ack?.({ ok: false, error: 'CALL_RESTRICTED' });

        const limit = await allow('call', userId);
        if (!limit.allowed) return ack?.({ ok: false, error: 'RATE_LIMITED' });
        const recvLimit = await allow('call_recipient', userId, receiverId);
        if (!recvLimit.allowed) return ack?.({ ok: false, error: 'RATE_LIMITED' });

        // IN_CALL protection (presence-level): never ring someone who is already
        // inside another WebRTC call. initiateCall adds a DB-level guard too.
        const cbPresence = await getPresence(receiverId).catch(() => null);
        if (cbPresence?.state === 'IN_CALL' || cbPresence?.currentCall) {
          return ack?.({ ok: false, error: 'RECEIVER_BUSY', message: 'Receiver is currently in another call' });
        }

        const { call, rate } = await initiateCall({ callerId: userId, receiverId, type });
        // Track live session
        const session = await createCallSession({ callId: call.id, type, callerId: userId, receiverId });
        getMetricsInstance().trackCallStarted();

        // Set caller presence IN_CALL-watch (RINGING)
        socket.join(`call:${call.id}`);

        const otherPresence = await getPresence(receiverId);
        const receiverOnline = !!otherPresence && otherPresence.state !== 'OFFLINE';
        const otherSockets = getSocketIds(receiverId);

        if (!receiverOnline || otherSockets.length === 0) {
          // mark missed immediately since offline
          await missCall(call.id).catch(() => {});
          await updateCallStatus(call.id, 'MISSED');
          await cleanupCallSession(call.id);
          realtimeMetrics.calls.missed++;
          return ack?.({
            ok: false,
            error: 'USER_OFFLINE',
            data: { callId: call.id },
          });
        }

        // Reliable server-side ring timeout: if the receiver never answers
        // within RING_TIMEOUT_MS the call is marked MISSED, BUSY is cleared,
        // both participants are notified and ringing stops. No call is ever
        // left permanently RINGING.
        await setRingingDeadline(call.id, Date.now() + RING_TIMEOUT_MS);
        armRingTimeout(call.id, RING_TIMEOUT_MS, () => void handleRingTimeout(call.id, io));

        const incoming = {
          callId: call.id,
          from: { id: userId, displayName: (socket.data?.displayName) || 'Someone', type },
          type,
          rate,
          timestamp: Date.now(),
        };
        for (const id of otherSockets) io.to(id).emit('call:incoming', incoming);

        notify({
          userId: receiverId,
          type: NotificationType.INCOMING_CALL,
          title: 'Incoming call',
          body: `You have an incoming ${type.toLowerCase()} call`,
          data: { callId: call.id, callerId: userId, type },
        }).catch(() => {});

        ack?.({ ok: true, data: { callId: call.id, type, rate, rtc: { provider: 'webrtc', signaling: 'socket.io' } }, session });
        void session;
      } catch (e: any) {
        ack?.({ ok: false, error: e?.code || 'INTERNAL', message: e?.message, ...(e?.details ? { details: e.details } : {}) });
      }
    });

    socket.on('call:signal', (payload) => {
      const { callId, to, event, data } = payload || {};
      if (!to || !event) return;
      // Only forward between the two call participants in a live call
      if (callId) {
        getCallSession(callId).then((session) => {
          if (!session) return;
          if (session.callerId !== to && session.receiverId !== to) return;
          if (session.callerId !== userId && session.receiverId !== userId) return;
          emitToUser(io, to, 'call:signal', { from: userId, callId, event, data });
        });
        return;
      }
      emitToUser(io, to, 'call:signal', { from: userId, event, data });
    });

    socket.on('call:accept', async (payload, ack) => {
      const { callId } = payload || {};
      try {
        await acceptCall(callId, userId);
        // No longer ringing: any ring timeout must not fire now.
        clearCallTimers(callId);
        const session = await addPeer(callId, {
          userId,
          role: 'RECEIVER',
          connection: CallConnectionStatus.CONNECTING,
          joinedAt: Date.now(),
          lastActiveAt: Date.now(),
        });
        await updateCallStatus(callId, 'ACCEPTED');
        socket.join(`call:${callId}`);
        const callerId = session?.callerId ?? userId;
        const accepted = { callId, by: userId, timestamp: Date.now() };
        emitToUser(io, callerId, 'call:accepted', accepted);
        io.to(`call:${callId}`).emit('call:state', { callId, status: 'ACCEPTED', by: userId });

        // Receiver is now committed to the call: flip presence IN_CALL so no
        // second incoming call can be accepted (accepted-but-never-connected is
        // reclaimed by the connect timeout below).
        await setCurrentCall(userId, callId).catch(() => {});
        // If WebRTC never establishes, end the call cleanly instead of leaving
        // an ACCEPTED/ONGOING call dangling forever (never bills).
        armConnectTimeout(callId, CONNECT_TIMEOUT_MS, () => void handleConnectTimeout(callId, io));

        ack?.({ ok: true });
      } catch (e: any) {
        // BUSY (already in another call): the receiver may already have been
        // routed to the call page — tell it (and the caller) the call is busy.
        if (e?.code === 'BUSY' || e?.code === 'RECEIVER_BUSY') {
          io.to(`call:${callId ?? ''}`).emit('call:state', { callId, status: 'BUSY', by: userId });
          emitToUser(io, userId, 'call:busy', { callId, by: userId });
          await updateCallStatus(callId, 'BUSY').catch(() => {});
          await cleanupCallSession(callId).catch(() => {});
          return ack?.({ ok: false, error: 'BUSY' });
        }
        ack?.({ ok: false, error: e?.code || 'INTERNAL' });
      }
    });

    socket.on('call:reject', async (payload, ack) => {
      const { callId } = payload || {};
      try {
        await rejectCall(callId, userId);
        clearCallTimers(callId);
        const session = await getCallSession(callId);
        await updateCallStatus(callId, 'REJECTED');
        const callerId = session?.callerId ?? userId;
        emitToUser(io, callerId, 'call:rejected', { callId, by: userId });
        io.to(`call:${callId}`).emit('call:state', { callId, status: 'REJECTED', by: userId });
        await setCurrentCall(callerId, null).catch(() => {});
        await setCurrentCall(userId, null).catch(() => {});
        await cleanupCallSession(callId);
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false });
      }
    });

    socket.on('call:cancel', async (payload, ack) => {
      const { callId } = payload || {};
      try {
        const result = await cancelCall(callId, userId);
        clearCallTimers(callId);
        void result;
        await updateCallStatus(callId, 'CANCELLED');
        const session = await getCallSession(callId);
        const receiverId = session?.receiverId ?? userId;
        emitToUser(io, receiverId, 'call:cancelled', { callId, by: userId });
        io.to(`call:${callId}`).emit('call:state', { callId, status: 'CANCELLED', by: userId });
        await setCurrentCall(userId, null).catch(() => {});
        await setCurrentCall(receiverId, null).catch(() => {});
        await cleanupCallSession(callId);
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false });
      }
    });

    socket.on('call:busy', async (payload, ack) => {
      const { callId } = payload || {};
      try {
        await markBusy(callId);
        clearCallTimers(callId);
        await updateCallStatus(callId, 'BUSY');
        const session = await getCallSession(callId);
        const callerId = session?.callerId ?? userId;
        emitToUser(io, callerId, 'call:busy', { callId, by: userId });
        io.to(`call:${callId}`).emit('call:state', { callId, status: 'BUSY', by: userId });
        await setCurrentCall(callerId, null).catch(() => {});
        await setCurrentCall(userId, null).catch(() => {});
        await cleanupCallSession(callId);
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false });
      }
    });

    socket.on('call:miss', async (payload) => {
      const { callId } = payload || {};
      await missCall(callId).catch(() => {});
      clearCallTimers(callId);
      const session = await getCallSession(callId);
      await updateCallStatus(callId, 'MISSED');
      const callerId = session?.callerId ?? userId;
      emitToUser(io, callerId, 'call:missed', { callId });
      io.to(`call:${callId}`).emit('call:state', { callId, status: 'MISSED' });
      await setCurrentCall(callerId, null).catch(() => {});
      await setCurrentCall(userId, null).catch(() => {});
      realtimeMetrics.calls.missed++;
      await cleanupCallSession(callId);
    });

    // Connection status updates from the client (WebRTC lifecycle)
    socket.on('call:connection', async (payload) => {
      const { callId, status } = payload || {};
      if (!callId || !status) return;
      const session = await getCallSession(callId);
      if (!session || isCallTerminal(session.status)) return;

      // Peer dropped: enter the existing RECONNECTING contract (grace period +
      // hard deadline). If they never return, the reconnect deadline ends the
      // call cleanly — never a permanently half-open connection.
      if (status === CallConnectionStatus.RECONNECTING || status === CallConnectionStatus.DISCONNECTED) {
        const sessionAfter = await setPeerConnection(callId, userId, CallConnectionStatus.RECONNECTING);
        realtimeMetrics.calls.reconnections++;
        io.to(`call:${callId}`).emit('call:state', { callId, status: 'RECONNECTING', by: userId });
        emitToUser(io, otherPeer(session, userId), 'call:peer_reconnecting', { callId, by: userId });
        if (sessionAfter?.reconnectDeadlineMs) {
          armReconnectDeadline(
            callId,
            sessionAfter.reconnectDeadlineMs - Date.now() + RECONNECT_DEADLINE_BUFFER_MS,
            () => void handleReconnectTimeout(callId, io)
          );
        }
        return;
      }

      const sessionAfter = await setPeerConnection(callId, userId, status);

      if (status === CallConnectionStatus.CONNECTED) {
        // Recovered (or connected for the first time): clear every deadline.
        clearCallTimers(callId);
        // Persist the CONNECTED moment exactly once — billing anchors on this.
        await markCallConnected(callId).catch(() => {});
        // Participants are genuinely in the call now: flip IN_CALL presence on
        // both so no new incoming call can be accepted and peers see call state.
        await setCurrentCall(userId, callId).catch(() => {});
        await setCurrentCall(sessionAfter ? otherPeer(sessionAfter, userId) : otherPeer(session, userId), callId).catch(() => {});
        // When both peers connected, the call is CONNECTED (billing starts)
        if (sessionAfter?.status === 'CONNECTED') {
          realtimeMetrics.calls.active++;
          realtimeMetrics.calls.maxConcurrent = Math.max(realtimeMetrics.calls.maxConcurrent, realtimeMetrics.calls.active);
          io.to(`call:${callId}`).emit('call:state', { callId, status: 'CONNECTED', by: userId });
        }
      }
    });

    socket.on('call:end', async (payload, ack) => {
      const { callId, quality } = payload || {};
      try {
        // SECURITY: only a participant may end the call (prevents third parties
        // from force-terminating/triggering billing on a paid call).
        const callRow = await prisma.call.findUnique({ where: { id: callId } });
        if (!callRow) return ack?.({ ok: false, error: 'CALL_NOT_FOUND' });
        if (callRow.callerId !== userId && callRow.receiverId !== userId) {
          return ack?.({ ok: false, error: 'NOT_PARTICIPANT' });
        }

        // Unanswered RINGING call: hanging up is a CANCEL (caller) or MISS
        // (receiver) — never a COMPLETED/billed call.
        if (callRow.status === CallStatus.RINGING) {
          const session = await getCallSession(callId);
          if (callRow.callerId === userId) {
            await cancelCall(callId, userId);
            await updateCallStatus(callId, 'CANCELLED');
            emitToUser(io, callRow.receiverId, 'call:cancelled', { callId, by: userId });
            io.to(`call:${callId}`).emit('call:state', { callId, status: 'CANCELLED', by: userId });
          } else {
            await missCall(callId);
            await updateCallStatus(callId, 'MISSED');
            emitToUser(io, callRow.callerId, 'call:missed', { callId, by: userId });
            io.to(`call:${callId}`).emit('call:state', { callId, status: 'MISSED', by: userId });
            realtimeMetrics.calls.missed++;
          }
          clearCallTimers(callId);
          await setCurrentCall(callRow.callerId, null).catch(() => {});
          await setCurrentCall(callRow.receiverId, null).catch(() => {});
          await cleanupCallSession(callId);
          return ack?.({ ok: true });
        }

        const result = await endCall(callId, { quality, endBy: userId });
        const session = await getCallSession(callId);
        clearCallTimers(callId);
        await updateCallStatus(callId, 'ENDED');
        emitToUser(io, otherPeerSafe(session, userId), 'call:ended', { callId, by: userId, ...result?.call });
        io.to(`call:${callId}`).emit('call:ended', { callId, by: userId, ...result?.call });
        io.to(`call:${callId}`).emit('call:state', { callId, status: 'ENDED', by: userId });
        await cleanupCallSession(callId);
        const p = await getPresence(userId);
        if (p?.state === 'IN_CALL' || p?.currentCall === callId) await setCurrentCall(userId, null);
        if (session) await setCurrentCall(otherPeerSafe(session, userId), null).catch(() => {});
        ack?.({ ok: true, ...result });
      } catch (e: any) {
        ack?.({ ok: false, error: e?.code || 'INTERNAL' });
      }
    });

    // In-call gifts (atomic, server-side)
    socket.on('call:gift', async (payload, ack) => {
      const { callId, to, giftId } = payload || {};
      try {
        if (to === userId) return ack?.({ ok: false, error: 'SELF' });
        const session = await getCallSession(callId);
        if (!session || !isCallActive(session)) return ack?.({ ok: false, error: 'CALL_NOT_ACTIVE' });
        if (session.callerId !== to && session.receiverId !== to) return ack?.({ ok: false, error: 'NOT_PARTICIPANT' });

        const limit = await allow('gift', userId);
        if (!limit.allowed) return ack?.({ ok: false, error: 'RATE_LIMITED' });

        const result = await sendGift({
          senderId: userId,
          receiverId: to,
          giftId,
          contextType: 'call',
          contextId: callId,
        });

        if (result.alreadyProcessed) {
          return ack?.({ ok: true, alreadyProcessed: true });
        }
        const gift = result.gift!;
        const giftPayload = { callId, from: userId, to, gift: { id: gift.id, name: gift.name, priceCoins: gift.priceCoins, imageUrl: gift.imageUrl, animationUrl: gift.animationUrl }, timestamp: Date.now() };
        io.to(`call:${callId}`).emit('call:gift', giftPayload);
        ack?.({ ok: true, gift: giftPayload });
      } catch (e: any) {
        ack?.({ ok: false, error: e?.code || 'INTERNAL' });
      }
    });

    // Report / block during call
    socket.on('call:report', async (payload, ack) => {
      const { callId, category, description } = payload || {};
      try {
        const session = await getCallSession(callId);
        if (!session) return ack?.({ ok: false, error: 'CALL_NOT_ACTIVE' });
        const otherId = otherPeerSafe(session, userId);
        const report = await prisma.report.create({
          data: {
            reporterId: userId,
            reportedUserId: otherId,
            targetType: 'CALL',
            targetId: otherId,
            category: category || 'OTHER',
            description,
          },
        });
        await processReportIntoCase({
          reportId: report.id,
          reportedUserId: otherId,
          category: category || 'OTHER',
        }).catch(() => {});
        await notify({ userId: userId, type: NotificationType.SECURITY, title: 'Report received', body: 'We will review your report shortly.' }).catch(() => {});
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false });
      }
    });

    socket.on('call:block', async (payload, ack) => {
      const { callId } = payload || {};
      try {
        const session = await getCallSession(callId);
        if (!session) return ack?.({ ok: false, error: 'CALL_NOT_ACTIVE' });
        const otherId = otherPeerSafe(session, userId);

        // Deterministic block via shared service (ends any active call too).
        await blockUser({ blockerId: userId, blockedId: otherId, reason: 'blocked_during_call' });

        // Emit call-ended to both peers.
        const result = await endCall(callId, { failReason: 'BLOCKED' }).catch(() => null);
        clearCallTimers(callId);
        io.to(`call:${callId}`).emit('call:ended', { callId, by: userId, reason: 'BLOCKED', ...result?.call });
        io.to(`call:${callId}`).emit('call:state', { callId, status: 'ENDED', by: userId });
        await cleanupCallSession(callId);

        await prisma.report.create({
          data: {
            reporterId: userId,
            reportedUserId: otherId,
            targetType: 'USER',
            targetId: otherId,
            category: 'HARASSMENT',
            description: 'Blocked during call',
          },
        }).catch(() => {});

        await setCurrentCall(userId, null);
        await setCurrentCall(otherId, null);
        await notify({ userId: otherId, type: NotificationType.SECURITY, title: 'Call ended', body: 'This call ended.' }).catch(() => {});
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false });
      }
    });

    // ------------------------------------------------------------------
    // TALK NOW MATCHING
    // ------------------------------------------------------------------
    socket.on('match:start', async (payload, ack) => {
      const { preferredGender, preferredLanguage, interests, mode } = payload || {};
      try {
        const result = await startMatchmaking(userId, {
          preferredGender,
          preferredLanguage,
          interests,
          mode: mode === 'random' ? 'random' : 'matched',
        });
        if (!result.ok) return ack?.({ ok: false, error: result.reason });

        const entry = await getUserMatch(userId);
        if (entry?.state === 'MATCHED') {
          const match = await resolveMatchForUser(userId);
          return ack?.({ ok: true, matched: true, state: 'MATCHED', match });
        }
        ack?.({ ok: true, matched: false, state: entry?.state ?? 'WAITING' });
      } catch {
        ack?.({ ok: false, error: 'INTERNAL' });
      }
    });

    socket.on('match:cancel', async (payload, ack) => {
      await cancelMatchmaking(userId);
      ack?.({ ok: true });
    });

    socket.on('match:poll', async (payload, ack) => {
      try {
        const entry = await getUserMatch(userId);
        if (!entry) return ack?.({ ok: true, state: 'IDLE' });
        if (entry.state === 'MATCHED') {
          const match = await resolveMatchForUser(userId);
          return ack?.({ ok: true, matched: true, state: 'MATCHED', match });
        }
        if (Date.now() > entry.expiryMs && entry.state === 'WAITING') {
          await cancelMatchmaking(userId);
          return ack?.({ ok: true, state: 'EXPIRED' });
        }
        ack?.({ ok: true, state: entry.state });
      } catch {
        ack?.({ ok: false, error: 'INTERNAL' });
      }
    });

    // ------------------------------------------------------------------
    // DISCONNECT
    // ------------------------------------------------------------------
    socket.on('disconnect', async () => {
      unregisterSocket(userId, socketId);
      delete localPresenceSockets[socketId];
      realtimeMetrics.connections.active = io.engine.clientsCount;

      // If the user has no remaining sockets, mark them OFFLINE
      if (getSocketIds(userId).length === 0) {
        const snapshot = await setPresence({ userId, state: 'OFFLINE', sessionId: null, lastActive: Date.now() });
        io.emit('presence:update', { userId, state: snapshot.state, lastActive: snapshot.lastActive, currentCall: null });

        // If they were in an active call, mark it failed/ended and notify the peer
        const activeCalls = await findActiveCallsForUser(userId);
        for (const callId of activeCalls) {
          const session = await getCallSession(callId);
          if (!session) continue;
          try {
            await endCall(callId, { failReason: 'DISCONNECT' });
            clearCallTimers(callId);
            await updateCallStatus(callId, 'FAILED');
            getMetricsInstance().trackCallFailed();
            io.to(`call:${callId}`).emit('call:ended', { callId, by: userId, reason: 'DISCONNECT' });
            io.to(`call:${callId}`).emit('call:state', { callId, status: 'FAILED', by: userId });
            const peer = otherPeerSafe(session, userId);
            emitToUser(io, peer, 'call:peer_disconnected', { callId, by: userId });
            await setCurrentCall(userId, null).catch(() => {});
            await setCurrentCall(peer, null).catch(() => {});
            await cleanupCallSession(callId);
          } catch {
            /* best effort */
          }
        }
      }
    });
  });

  return io;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function otherUser(conv: { userAId: string; userBId: string }, me: string): string {
  return conv.userAId === me ? conv.userBId : conv.userAId;
}

function otherPeerSafe(session: any | null, userId: string): string {
  if (!session) return userId;
  return session.callerId === userId ? session.receiverId : session.callerId;
}

function emitToUser(io: Server, userId: string, event: string, payload: unknown) {
  for (const id of getSocketIds(userId)) io.to(id).emit(event, payload);
}

function emitToRoom(io: Server, room: string, event: string, payload: unknown) {
  io.to(room).emit(event, payload);
}

async function trackActiveUserSafe(userId: string) {
  try {
    const { trackActiveUser } = await import('./metrics');
    await trackActiveUser(userId);
  } catch {
    /* ignore */
  }
}

function getMetricsInstance() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getMetrics } = require('./metrics');
  return getMetrics();
}

async function handleSendMessage(io: Server, socket: Socket, userId: string, payload: any, ack?: any) {
  try {
    const {
      conversationId,
      content,
      type = MessageType.TEXT,
      mediaUrl,
      replyToId,
      giftId,
    } = payload || {};

    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) return ack?.({ ok: false, error: 'CONVERSATION_NOT_FOUND' });

    const otherId = otherUser(conversation, userId);
    if (await isBlockedPair(userId, otherId)) return ack?.({ ok: false, error: 'BLOCKED' });
    if (await isRestricted(userId, RestrictionScope.CHAT)) return ack?.({ ok: false, error: 'CHAT_RESTRICTED' });
    const interact = await canInteract({ actorId: userId, targetId: otherId, kind: 'message' });
    if (!interact.allowed) return ack?.({ ok: false, error: interact.reason });

    // AI-assist content moderation: hard-block near-certain flagged text,
    // otherwise flag/queue deterministically. AI failure simply falls through.
    if (type === MessageType.TEXT && content) {
      try {
        const scan = await scanOutgoingText(content, userId, conversationId);
        if (scan.decision === 'HARD_BLOCK') {
          realtimeMetrics.moderation.flagged++;
          return ack?.({ ok: false, error: 'MOD_FLAGGED' });
        }
      } catch {
        /* AI failure -> fall back to deterministic rules below */
      }
    }

    const limit = await allow('message', userId);
    if (!limit.allowed) {
      realtimeMetrics.moderation.blocked++;
      return ack?.({ ok: false, error: 'RATE_LIMITED', retryAfterMs: limit.retryAfterMs });
    }
    const recipientLimit = await allow('message_recipient', userId, otherId);
    if (!recipientLimit.allowed) {
      realtimeMetrics.moderation.blocked++;
      return ack?.({ ok: false, error: 'RATE_LIMITED' });
    }

    const { sendMessage } = await import('../services/messages');
    const result = await sendMessage({
      conversationId,
      senderId: userId,
      content,
      type,
      mediaUrl,
      replyToId,
      giftId,
      onMessage: (dto) => {
        emitToUser(io, userId, 'message:received', dto);
        emitToUser(io, otherId, 'message:received', { ...dto, isMine: false });
      },
    });

    if (!result.ok) {
      if (result.error === 'MOD_FLAGGED' && (await spamGuard(userId, 'message'))) {
        await notify({ userId, type: NotificationType.SECURITY, title: 'Slow down', body: 'You are sending messages too quickly. Please wait.' }).catch(() => {});
      }
      return ack?.({ ok: false, error: result.error });
    }

    // Push notification if recipient offline
    const recipientOnline = getSocketIds(otherId).length > 0;
    if (!recipientOnline) {
      notify({
        userId: otherId,
        type: NotificationType.MESSAGE,
        title: 'New message',
        body: content?.slice(0, 80) || (mediaUrl ? 'Sent a photo/voice' : 'New message'),
        data: { conversationId, senderId: userId, messageId: result.message!.id },
      }).catch(() => {});
    }

    ack?.({ ok: true, message: result.message, deliveredAt: result.deliveredAt });
  } catch (e) {
    ack?.({ ok: false, error: 'INTERNAL' });
  }
}

function serializeMessage(m: any, me: string) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    receiverId: m.receiverId,
    type: m.type,
    content: m.content,
    mediaUrl: m.mediaUrl,
    replyToId: m.replyToId,
    giftId: m.giftId,
    status: m.status ?? 'SENT',
    reactions: m.reactions ?? {},
    createdAt: m.createdAt,
    readAt: m.readAt,
    deliveredAt: m.deliveredAt,
    isMine: m.senderId === me,
  };
}

const EMOJI_RX = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})$/u;
function fileEmoji(emoji: string): boolean {
  return typeof emoji === 'string' && emoji.length <= 16 && (EMOJI_RX.test(emoji.trim()) || emoji.trim().length > 0);
}

async function getConversation(conversationId: string, userId: string) {
  if (!conversationId) return null;
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conv) return null;
  if (conv.userAId !== userId && conv.userBId !== userId) return null;
  return conv;
}

async function findActiveCallsForUser(userId: string): Promise<string[]> {
  const calls = await prisma.call.findMany({
    where: { OR: [{ callerId: userId }, { receiverId: userId }], status: { in: ['RINGING', 'ONGOING'] } },
    select: { id: true },
    take: 20,
  });
  return calls.map((c) => c.id);
}

// Re-export types for consumers
export type { CallLiveStatus };
