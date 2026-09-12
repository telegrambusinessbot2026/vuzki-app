import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@vuzki/database';
import { ApiErrorResponse } from '@vuzki/types';
import { wrap, toPublicUser } from './helpers';
import { authenticate, AuthedRequest } from '../middleware/auth';
import { isBlockedPair } from '../services/ai-moderation';
import { MessageType } from '@vuzki/shared';

export const chatRoutes = Router();

// GET /chat/conversations
chatRoutes.get('/conversations', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const convs = await prisma.conversation.findMany({
    where: { OR: [{ userAId: me }, { userBId: me }] },
    include: {
      userA: { include: { profile: true } },
      userB: { include: { profile: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  // unread counts
  const items = [];
  for (const c of convs) {
    const other = c.userAId === me ? c.userB : c.userA;
    const unread = await prisma.message.count({
      where: { conversationId: c.id, receiverId: me, status: 'SENT' },
    });
    items.push({
      id: c.id,
      otherUser: toPublicUser(other),
      lastMessage: c.messages[0] ? serializeMessage(c.messages[0], me) : null,
      unreadCount: unread,
      updatedAt: c.updatedAt,
    });
  }
  res.json({ success: true, data: { items } });
}));

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
    status: m.status,
    reactions: m.reactions ?? {},
    createdAt: m.createdAt,
    readAt: m.readAt,
    isMine: m.senderId === me,
  };
}

// GET /chat/:conversationId/messages
chatRoutes.get('/:conversationId/messages', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const { page = 1, limit = 50 } = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(50),
  }).parse(req.query ?? {});

  const conv = await prisma.conversation.findUnique({ where: { id: req.params.conversationId } });
  if (!conv) throw new ApiErrorResponse(404, 'CONVERSATION_NOT_FOUND', 'Not found');
  // SECURITY: only a participant of the conversation may read its messages.
  // Prevents IDOR where any authenticated user could read arbitrary
  // conversations by id and mark other users' messages as read.
  if (conv.userAId !== me && conv.userBId !== me) {
    throw new ApiErrorResponse(403, 'FORBIDDEN', 'Not part of this conversation');
  }
  const otherId = conv.userAId === me ? conv.userBId : conv.userAId;
  if (await isBlockedPair(me, otherId)) throw new ApiErrorResponse(403, 'BLOCKED', 'Blocked');

  const skip = (page - 1) * limit;
  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId: req.params.conversationId, unsent: false },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.message.count({ where: { conversationId: req.params.conversationId } }),
  ]);

  // mark delivered/read
  await prisma.message.updateMany({
    where: { conversationId: req.params.conversationId, receiverId: me, status: 'SENT' },
    data: { status: 'READ', readAt: new Date() },
  });

  res.json({
    success: true,
    data: {
      items: messages.reverse().map((m) => serializeMessage(m, me)),
      total,
      conversation: { id: conv.id, otherUser: toPublicUser(await prisma.user.findUnique({ where: { id: otherId }, include: { profile: true } })) },
    },
  });
}));

// GET /chat/:conversationId - get or create conversation with a user
chatRoutes.get('/with/:userId', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const otherId = req.params.userId;
  if (me === otherId) throw new ApiErrorResponse(400, 'BAD_REQUEST', 'Cannot chat with self');
  if (await isBlockedPair(me, otherId)) throw new ApiErrorResponse(403, 'BLOCKED', 'Blocked');

  const [a, b] = [me, otherId].sort();
  const conv = await prisma.conversation.upsert({
    where: { userAId_userBId: { userAId: a, userBId: b } },
    update: {},
    create: { userAId: a, userBId: b },
  });
  res.json({ success: true, data: { conversationId: conv.id } });
}));

// POST /chat/messages/:id/reaction
chatRoutes.post('/messages/:id/reaction', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const { emoji } = z.object({ emoji: z.string().min(1).max(16) }).parse(req.body);
  const me = req.auth!.userId;
  const message = await prisma.message.findUnique({ where: { id: req.params.id } });
  if (!message) throw new ApiErrorResponse(404, 'MESSAGE_NOT_FOUND', 'Message not found');

  // SECURITY: only participants of the message's conversation may react.
  const conv = await prisma.conversation.findUnique({ where: { id: message.conversationId } });
  if (!conv || (conv.userAId !== me && conv.userBId !== me)) {
    throw new ApiErrorResponse(403, 'FORBIDDEN', 'Not part of this conversation');
  }

  const reactions: Record<string, string[]> = (message.reactions as any) ?? {};
  const users = reactions[emoji] ? [...reactions[emoji]] : [];
  if (users.includes(me)) {
    reactions[emoji] = users.filter((u) => u !== me);
  } else {
    reactions[emoji] = [...users, me];
  }

  await prisma.message.update({ where: { id: message.id }, data: { reactions: reactions as any } });
  res.json({ success: true, data: { reactions } });
}));

// DELETE /chat/messages/:id (unsend - only for own messages, within window)
chatRoutes.delete('/messages/:id', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const message = await prisma.message.findUnique({ where: { id: req.params.id } });
  if (!message) throw new ApiErrorResponse(404, 'MESSAGE_NOT_FOUND', 'Message not found');
  if (message.senderId !== me) throw new ApiErrorResponse(403, 'FORBIDDEN', 'Can only unsend own messages');

  await prisma.message.update({ where: { id: message.id }, data: { unsent: true, content: '' } });
  res.json({ success: true });
}));
