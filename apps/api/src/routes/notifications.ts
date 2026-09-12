import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@vuzki/database';
import { wrap } from './helpers';
import { authenticate, AuthedRequest } from '../middleware/auth';
import { markNotificationsRead } from '../services/notification';

export const notificationRoutes = Router();

// GET /notifications
notificationRoutes.get('/', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const { page = 1, limit = 30 } = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(30),
  }).parse(req.query ?? {});

  const skip = (page - 1) * limit;
  const [items, total, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: me }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.notification.count({ where: { userId: me } }),
    prisma.notification.count({ where: { userId: me, isRead: false } }),
  ]);

  res.json({
    success: true,
    data: {
      items: items.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, data: n.data ?? {}, isRead: n.isRead, createdAt: n.createdAt })),
      unreadCount: unread,
      total,
    },
  });
}));

// GET /notifications/unread-count
notificationRoutes.get('/unread-count', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const count = await prisma.notification.count({ where: { userId: req.auth!.userId, isRead: false } });
  res.json({ success: true, data: { count } });
}));

// POST /notifications/read
notificationRoutes.post('/read', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const { ids } = z.object({ ids: z.array(z.string()).optional() }).parse(req.body ?? {});
  await markNotificationsRead(req.auth!.userId, ids);
  res.json({ success: true });
}));

// POST /notifications/read-all
notificationRoutes.post('/read-all', authenticate(), wrap(async (req: AuthedRequest, res) => {
  await markNotificationsRead(req.auth!.userId);
  res.json({ success: true });
}));
