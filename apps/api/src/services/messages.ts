import { prisma } from '@vuzki/database';
import { isBlockedPair, moderateText } from './ai-moderation';
import { getSocketIds } from './notification';
import { realtimeMetrics } from '../realtime/metrics';
import { MessageType, NotificationType } from '@vuzki/shared';
import { notify } from './notification';

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  type: string;
  content: string;
  mediaUrl: string | null;
  replyToId: string | null;
  giftId: string | null;
  status: string;
  reactions: Record<string, string[]>;
  createdAt: Date;
  readAt: Date | null;
  deliveredAt: Date | null;
  isMine: boolean;
}

export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  content?: string;
  type?: MessageType;
  mediaUrl?: string;
  replyToId?: string;
  giftId?: string;
  /** called with the DTO after persist so the caller fans out to sockets */
  onMessage?: (dto: MessageDto) => void;
  /** explicit presence override for tests (otherwise uses socket registry) */
  peerOnline?: boolean;
}

export interface SendMessageResult {
  ok: boolean;
  error?: string;
  message?: MessageDto;
  deliveredAt?: string | null;
}

/**
 * Validate + persist a chat message and mark an immediate DELIVERED receipt if
 * the recipient is currently connected. Server-side; accepts an emit hook for
 * the realtime layer to fan out. Returns the created DTO.
 */
export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  const conversation = await prisma.conversation.findUnique({ where: { id: input.conversationId } });
  if (!conversation) return { ok: false, error: 'CONVERSATION_NOT_FOUND' };

  const otherId = conversation.userAId === input.senderId ? conversation.userBId : conversation.userAId;
  if (await isBlockedPair(input.senderId, otherId)) return { ok: false, error: 'BLOCKED' };

  const type = input.type ?? MessageType.TEXT;
  if (type === MessageType.TEXT) {
    const mod = await moderateText(input.content ?? '', { type: 'message', userId: input.senderId });
    if (mod.flagged && mod.score >= 0.95) {
      realtimeMetrics.moderation.flagged++;
      return { ok: false, error: 'MOD_FLAGGED' };
    }
  }

  const record = await prisma.message.create({
    data: {
      conversationId: input.conversationId,
      senderId: input.senderId,
      receiverId: otherId,
      type,
      content: typeof input.content === 'string' ? input.content.slice(0, 4000) : '',
      mediaUrl: input.mediaUrl,
      replyToId: input.replyToId,
      giftId: input.giftId,
      status: 'SENT',
    },
  });

  await prisma.conversation.update({ where: { id: input.conversationId }, data: { updatedAt: new Date() } });

  const peerOnline = input.peerOnline !== undefined ? input.peerOnline : getSocketIds(otherId).length > 0;
  let deliveredAt: string | null = null;
  if (peerOnline) {
    deliveredAt = new Date().toISOString();
    await prisma.message.update({
      where: { id: record.id },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    });
    record.status = 'DELIVERED';
    record.deliveredAt = new Date(deliveredAt);
  }

  realtimeMetrics.messages.total++;
  const dto = toMessageDto(record, input.senderId);
  input.onMessage?.(dto);

  return { ok: true, message: dto, deliveredAt };
}

export function toMessageDto(m: any, me: string): MessageDto {
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

/** Normalize an arbitrary status to the MessageStatus wire value. */
export function normalizeStatus(status: string | undefined): 'SENT' | 'DELIVERED' | 'READ' {
  if (status === 'READ') return 'READ';
  if (status === 'DELIVERED') return 'DELIVERED';
  return 'SENT';
}

export { notify, NotificationType };
