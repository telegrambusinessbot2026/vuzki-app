import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notify, markNotificationsRead, setIo, registerSocket, unregisterSocket } from '../services/notification';
import { NotificationType } from '@vuzki/shared';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  updateMany: vi.fn(),
  ioTo: vi.fn(),
  ioEmit: vi.fn(),
}));

vi.mock('@vuzki/database', () => ({
  prisma: {
    notification: {
      create: mocks.create,
      updateMany: mocks.updateMany,
    },
  },
}));

describe('Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates notification and emits to socket', async () => {
    mocks.create.mockResolvedValue({
      id: 'notif_1',
      userId: 'usr_1',
      type: NotificationType.COIN_PURCHASE,
      title: 'Payment',
      body: 'Success',
      data: { orderId: 'ord_1' },
      createdAt: new Date(),
    });

    mocks.ioTo.mockReturnValue({ emit: mocks.ioEmit });
    setIo({ to: mocks.ioTo });
    registerSocket('usr_1', 'socket_1');

    await notify({
      userId: 'usr_1',
      type: NotificationType.COIN_PURCHASE,
      title: 'Payment',
      body: 'Success',
      data: { orderId: 'ord_1' },
    });

    expect(mocks.create).toHaveBeenCalled();
    expect(mocks.ioTo).toHaveBeenCalledWith('socket_1');
    expect(mocks.ioEmit).toHaveBeenCalledWith('notification', expect.objectContaining({
      id: 'notif_1',
      type: NotificationType.COIN_PURCHASE,
    }));
    
    unregisterSocket('usr_1', 'socket_1');
  });

  it('marks notifications read for only the authorized user', async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 });
    await markNotificationsRead('usr_1', ['notif_1']);
    
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { userId: 'usr_1', id: { in: ['notif_1'] } },
      data: { isRead: true, readAt: expect.any(Date) },
    });
  });
});
