import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@vuzki/database';
import { ApiErrorResponse } from '@vuzki/types';
import { wrap } from './helpers';
import { authenticate, AuthedRequest } from '../middleware/auth';
import { getWallet, getBalance, getTransactionHistory } from '../services/wallet';
import { createCoinsOrder, verifyPaymentClient } from '../services/payments';

export const walletRoutes = Router();

// GET /wallet
walletRoutes.get('/', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const wallet = await getWallet(req.auth!.userId);
  res.json({ success: true, data: { balance: wallet.balance, currency: wallet.currency } });
}));

// GET /wallet/packages
walletRoutes.get('/packages', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const packages = await prisma.coinPackage.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { coins: 'asc' },
  });
  res.json({
    success: true,
    data: { items: packages.map((p) => ({ id: p.id, name: p.name, coins: p.coins, bonusCoins: p.bonusCoins, price: Number(p.price), currency: p.currency, isPopular: p.isPopular })) },
  });
}));

// POST /wallet/purchase
walletRoutes.post('/purchase', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const { packageId, provider } = z.object({
    packageId: z.string(),
    provider: z.string().optional(),
  }).parse(req.body);

  const order = await createCoinsOrder(req.auth!.userId, packageId, provider as any);
  res.status(201).json({ success: true, data: order });
}));

// POST /wallet/verify
walletRoutes.post('/verify', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const { orderId, provider, paymentId, signature, demo } = z.object({
    orderId: z.string(),
    provider: z.string(),
    paymentId: z.string().optional(),
    signature: z.string().optional(),
    demo: z.boolean().optional(),
  }).parse(req.body);

  const result = await verifyPaymentClient({ orderId, provider, paymentId, signature, demo });
  res.json({ success: true, data: result });
}));

// GET /wallet/history
walletRoutes.get('/history', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const { page = 1, limit = 20 } = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
  }).parse(req.query ?? {});

  const data = await getTransactionHistory(req.auth!.userId, page, limit);
  res.json({ success: true, data });
}));
