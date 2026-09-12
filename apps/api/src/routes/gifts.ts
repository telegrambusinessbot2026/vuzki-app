import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@vuzki/database';
import { ApiErrorResponse } from '@vuzki/types';
import { wrap } from './helpers';
import { authenticate, AuthedRequest } from '../middleware/auth';
import { sendGift } from '../services/gifts';
import { allow, isRateLimited } from '../realtime/ratelimit';

export const giftRoutes = Router();

// GET /gifts
giftRoutes.get('/', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const gifts = await prisma.gift.findMany({ where: { status: 'ACTIVE' }, orderBy: { priceCoins: 'asc' } });
  res.json({
    success: true,
    data: { items: gifts.map((g) => ({ id: g.id, name: g.name, imageUrl: g.imageUrl, animationUrl: g.animationUrl, priceCoins: g.priceCoins, category: g.category })) },
  });
}));

// POST /gifts/send
giftRoutes.post('/send', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const { receiverId, giftId, message, contextType, contextId, clientRequestId } = z.object({
    receiverId: z.string(),
    giftId: z.string(),
    message: z.string().max(200).optional(),
    contextType: z.enum(['chat', 'call', 'profile']).optional(),
    contextId: z.string().optional(),
    clientRequestId: z.string().max(64).optional(),
  }).parse(req.body);

  const me = req.auth!.userId;
  if (me === receiverId) throw new ApiErrorResponse(400, 'BAD_REQUEST', 'Cannot send gift to yourself');

  const limit = await allow('gift', me);
  if (isRateLimited(limit)) throw new ApiErrorResponse(429, 'RATE_LIMITED', 'Gift limit reached, try again shortly');

  const result = await sendGift({ senderId: me, receiverId, giftId, message, contextType, contextId, clientRequestId });

  res.status(result.alreadyProcessed ? 200 : 201).json({
    success: true,
    data: {
      sent: true,
      alreadyProcessed: result.alreadyProcessed,
      giftId,
      receiverId,
      priceCoins: result.transaction?.priceCoins,
      transactionId: result.transaction?.id,
    },
  });
}));

// GET /gifts/received
giftRoutes.get('/received', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const gifts = await prisma.giftTransaction.findMany({
    where: { receiverId: req.auth!.userId },
    include: { gift: true, sender: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({
    success: true,
    data: { items: gifts.map((g) => ({ id: g.id, giftId: g.giftId, giftName: g.gift.name, priceCoins: g.priceCoins, sender: { id: g.sender.id, displayName: g.sender.displayName, avatarUrl: g.sender.avatarUrl }, message: g.message, createdAt: g.createdAt })) },
  });
}));
