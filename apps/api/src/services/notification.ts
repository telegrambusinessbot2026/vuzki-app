import { prisma } from '@vuzki/database';
import { NotificationType } from '@vuzki/shared';

// Creates a notification record and emits to online user via socket.
export async function notify(params: {
  userId: string;
  type: NotificationType | string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data ? (params.data as any) : undefined,
    },
  });

  emitToUser(params.userId, 'notification', {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: notification.data ?? {},
    createdAt: notification.createdAt,
  });

  return notification;
}

// Registry of online users: userId -> socketId(s). Populated by realtime server.
const userSockets = new Map<string, Set<string>>();

export function registerSocket(userId: string, socketId: string) {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId)!.add(socketId);
}

export function unregisterSocket(userId: string, socketId: string) {
  userSockets.get(userId)?.delete(socketId);
  if (userSockets.get(userId)?.size === 0) userSockets.delete(userId);
}

export function getSocketIds(userId: string): string[] {
  return [...(userSockets.get(userId) ?? [])];
}

// Set by realtime server injection
export let io: any = null;
export function setIo(instance: any) {
  io = instance;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  if (!io) return;
  const ids = getSocketIds(userId);
  for (const id of ids) {
    io.to(id).emit(event, payload);
  }
}

export function emitToUsers(userIds: string[], event: string, payload: unknown) {
  for (const uid of userIds) emitToUser(uid, event, payload);
}

export function markNotificationsRead(userId: string, ids?: string[]) {
  return prisma.notification.updateMany({
    where: { userId, ...(ids && ids.length ? { id: { in: ids } } : {}) },
    data: { isRead: true, readAt: new Date() },
  });
}
