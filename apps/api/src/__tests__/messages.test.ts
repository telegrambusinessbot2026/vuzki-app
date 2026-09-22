import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const convFindUnique = vi.fn();
  const msgCreate = vi.fn();
  const msgUpdate = vi.fn();
  const msgFindUnique = vi.fn();
  const convUpdate = vi.fn();
  const isBlockedPair = vi.fn();
  const moderateText = vi.fn();
  const getSocketIds = vi.fn();
  const notify = vi.fn();
  return {
    convFindUnique,
    msgCreate,
    msgUpdate,
    msgFindUnique,
    convUpdate,
    isBlockedPair,
    moderateText,
    getSocketIds,
    notify,
  };
});

vi.mock('@vuzki/database', () => ({
  prisma: {
    conversation: {
      findUnique: mocks.convFindUnique,
      update: mocks.convUpdate,
    },
    message: {
      findUnique: mocks.msgFindUnique,
      create: mocks.msgCreate,
      update: mocks.msgUpdate,
    },
  },
}));

vi.mock('../services/ai-moderation', () => ({
  isBlockedPair: mocks.isBlockedPair,
  moderateText: mocks.moderateText,
}));

vi.mock('../services/notification', () => ({
  getSocketIds: mocks.getSocketIds,
  notify: mocks.notify,
}));

vi.mock('../realtime/metrics', () => ({
  realtimeMetrics: {
    messages: { total: 0 },
    moderation: { flagged: 0, blocked: 0 },
  },
}));

import { sendMessage, toMessageDto, normalizeStatus } from '../services/messages';
import { MessageType } from '@vuzki/shared';

describe('sendMessage pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.convFindUnique.mockResolvedValue({ id: 'c1', userAId: 'u1', userBId: 'u2' });
    mocks.isBlockedPair.mockResolvedValue(false);
    mocks.moderateText.mockResolvedValue({ flagged: false, score: 0.1 });
    mocks.msgCreate.mockImplementation(async (args: any) => ({
      id: 'm1',
      conversationId: args.data.conversationId,
      senderId: args.data.senderId,
      receiverId: args.data.receiverId,
      type: args.data.type,
      content: args.data.content,
      mediaUrl: args.data.mediaUrl ?? null,
      replyToId: args.data.replyToId ?? null,
      giftId: args.data.giftId ?? null,
      status: args.data.status,
      reactions: {},
      createdAt: new Date('2025-01-01T00:00:00Z'),
      readAt: null,
      deliveredAt: null,
    }));
    mocks.msgUpdate.mockResolvedValue({});
    mocks.convUpdate.mockResolvedValue({});
  });

  it('delivers SENT when recipient is offline', async () => {
    mocks.getSocketIds.mockReturnValue([]);
    const result = await sendMessage({ conversationId: 'c1', senderId: 'u1', content: 'hi' });
    expect(result.ok).toBe(true);
    expect(result.message?.status).toBe('SENT');
    expect(result.deliveredAt).toBeNull();
  });

  it('marks DELIVERED with timestamp when recipient is online', async () => {
    mocks.getSocketIds.mockReturnValue(['sk-u2']);
    const result = await sendMessage({ conversationId: 'c1', senderId: 'u1', content: 'hi' });
    expect(result.ok).toBe(true);
    expect(result.message?.status).toBe('DELIVERED');
    expect(result.deliveredAt).toBeTruthy();
    // status updated to DELIVERED server-side
    expect(mocks.msgUpdate).toHaveBeenCalled();
  });

  it('allows peerOnline override for tests without socket registry', async () => {
    const result = await sendMessage({ conversationId: 'c1', senderId: 'u1', content: 'hi', peerOnline: true });
    expect(result.message?.status).toBe('DELIVERED');
  });

  it('rejects when the pair is blocked', async () => {
    mocks.isBlockedPair.mockResolvedValue(true);
    const result = await sendMessage({ conversationId: 'c1', senderId: 'u1', content: 'hi' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('BLOCKED');
    expect(mocks.msgCreate).not.toHaveBeenCalled();
  });

  it('flags heavily-moderated text and does not persist', async () => {
    mocks.moderateText.mockResolvedValue({ flagged: true, score: 0.99 });
    const result = await sendMessage({ conversationId: 'c1', senderId: 'u1', content: 'bad' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('MOD_FLAGGED');
    expect(mocks.msgCreate).not.toHaveBeenCalled();
  });

  it('invokes onMessage hook with the created DTO', async () => {
    const onMessage = vi.fn();
    const result = await sendMessage({ conversationId: 'c1', senderId: 'u1', content: 'hi', onMessage });
    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage.mock.calls[0][0].id).toBe('m1');
    expect(result.message?.isMine).toBe(true);
  });

  it('handles clientMessageId deduplication (read before write)', async () => {
    mocks.msgFindUnique.mockResolvedValueOnce({ id: 'existing1', clientMessageId: 'req1', status: 'SENT' });
    const result = await sendMessage({ conversationId: 'c1', senderId: 'u1', content: 'hi', clientMessageId: 'req1' });
    expect(result.alreadyProcessed).toBe(true);
    expect(result.message?.id).toBe('existing1');
    expect(mocks.msgCreate).not.toHaveBeenCalled();
  });

  it('handles concurrent P2002 collision gracefully', async () => {
    mocks.msgFindUnique.mockResolvedValueOnce(null);
    mocks.msgCreate.mockRejectedValueOnce({ code: 'P2002' });
    mocks.msgFindUnique.mockResolvedValueOnce({ id: 'existing2', clientMessageId: 'req2', status: 'SENT' });
    const result = await sendMessage({ conversationId: 'c1', senderId: 'u1', content: 'hi', clientMessageId: 'req2' });
    expect(result.alreadyProcessed).toBe(true);
    expect(result.message?.id).toBe('existing2');
  });
});

describe('message helpers', () => {
  it('toMessageDto shapes the wire model', () => {
    const dto = toMessageDto(
      { id: 'm', conversationId: 'c', senderId: 'u1', receiverId: 'u2', type: 'TEXT', content: 'x', mediaUrl: null, replyToId: null, giftId: null, status: 'READ', reactions: {}, createdAt: new Date(), readAt: new Date(), deliveredAt: null },
      'u1'
    );
    expect(dto.isMine).toBe(true);
    expect(dto.status).toBe('READ');
  });

  it('normalizeStatus maps arbitrary values', () => {
    expect(normalizeStatus('READ')).toBe('READ');
    expect(normalizeStatus('DELIVERED')).toBe('DELIVERED');
    expect(normalizeStatus('SENT')).toBe('SENT');
    expect(normalizeStatus(undefined)).toBe('SENT');
  });
});
