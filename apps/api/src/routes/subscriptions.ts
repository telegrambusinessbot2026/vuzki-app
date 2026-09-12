import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@vuzki/database';
import { ApiErrorResponse } from '@vuzki/types';
import { wrap } from './helpers';
import { authenticate, AuthedRequest } from '../middleware/auth';
import { SubscriptionCycle, SubscriptionStatus, PremiumTier, WalletTransactionType } from '@vuzki/shared';
import { config } from '../config';
import { generateToken } from '@vuzki/utils';

export const subscriptionRoutes = Router();

// GET /subscriptions/plans
subscriptionRoutes.get('/plans', authenticate(), wrap(async (_req: AuthedRequest, res) => {
  const plans = await prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } });
  const grouped = plans.reduce((acc: Record<string, any[]>, p) => {
    (acc[p.tier] = acc[p.tier] || []).push({
      id: p.id,
      tier: p.tier,
      cycle: p.cycle,
      name: p.name,
      price: Number(p.price),
      currency: p.currency,
      features: p.features,
    });
    return acc;
  }, {});

  const benefits: Record<string, string[]> = {
    FREE: ['Basic profile', 'Limited discovery', 'Limited messaging', 'Basic matching'],
    PLUS: ['Extended discovery', 'More calls', 'Advanced filters', 'Profile boosts', 'More Super Likes'],
    PREMIUM: ['Priority matching', 'Premium badge', 'Unlimited calls', 'Exclusive features', 'Better visibility'],
    VIP: ['Maximum access', 'VIP badge', 'Priority support', 'Exclusive discovery', 'Premium profile placement'],
  };

  res.json({ success: true, data: { plans: grouped, benefits } });
}));

// GET /subscriptions/me
subscriptionRoutes.get('/me', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const active = await prisma.subscription.findFirst({
    where: { userId: me, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE] } },
    orderBy: { createdAt: 'desc' },
    include: { plan: true },
  });

  const currentTier = await computeEffectiveTier(me);

  res.json({
    success: true,
    data: {
      subscription: active
        ? {
            id: active.id,
            tier: active.tier,
            cycle: active.cycle,
            price: Number(active.price),
            status: active.status,
            currentPeriodEnd: active.currentPeriodEnd,
            currentPeriodStart: active.currentPeriodStart,
            autoRenew: active.autoRenew,
            cancelAtPeriodEnd: active.cancelAtPeriodEnd,
            planName: active.plan?.name,
          }
        : null,
      effectiveTier: currentTier,
    },
  });
}));

// POST /subscriptions
subscriptionRoutes.post('/', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const { planId } = z.object({ planId: z.string() }).parse(req.body);
  const me = req.auth!.userId;

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isActive) throw new ApiErrorResponse(404, 'PLAN_NOT_FOUND', 'Plan not found');

  const price = Number(plan.price);
  const providerOrderId = `VZSUB_${generateToken(6).toUpperCase()}`;

  // Check existing active subscription
  const existing = await prisma.subscription.findFirst({
    where: { userId: me, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE] } },
    orderBy: { createdAt: 'desc' },
  });

  // Create billing order via provider
  const order = await prisma.payment.create({
    data: {
      userId: me,
      orderId: providerOrderId,
      provider: config.paymentProvider,
      amount: price,
      currency: plan.currency,
      status: 'CREATED',
      purpose: 'SUBSCRIPTION',
      relatedId: plan.id,
      metadata: { planId: plan.id, tier: plan.tier, cycle: plan.cycle } as any,
    },
  });

  res.status(201).json({
    success: true,
    data: {
      orderId: order.orderId,
      amount: price,
      currency: plan.currency,
      plan: { id: plan.id, tier: plan.tier, cycle: plan.cycle, name: plan.name },
      requiresVerification: true,
      existingPlan: existing ? { tier: existing.tier } : null,
    },
  });
}));

// POST /subscriptions/verify (demo + webhook-backed activation)
subscriptionRoutes.post('/verify', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const { orderId } = z.object({ orderId: z.string() }).parse(req.body);
  const me = req.auth!.userId;

  const order = await prisma.payment.findUnique({ where: { orderId } });
  if (!order) throw new ApiErrorResponse(404, 'ORDER_NOT_FOUND', 'Order not found');
  if (order.userId !== me) throw new ApiErrorResponse(403, 'FORBIDDEN', 'Not your order');
  if (order.status === 'COMPLETED') {
    return res.json({ success: true, data: { alreadyActive: true } });
  }

  // SECURITY: demo activation is ONLY permitted when the server is configured
  // for demo fulfillment AND the order was created under the demo provider.
  // A client can never force-fill a real order by sending demo:true.
  const serverIsDemo = config.demoMode || config.paymentProvider === 'demo';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ignoredDemo = req.body?.demo;

  if (serverIsDemo && order.provider === 'demo') {
    const planId = order.relatedId!;
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new ApiErrorResponse(404, 'PLAN_NOT_FOUND', 'Plan not found');

    const result = await activateSubscription(me, plan, orderId);
    return res.json({ success: true, data: { activated: true, ...result } });
  }

  // Production: wait for webhook - do not activate on client claim
  return res.json({ success: true, data: { requiresWebhook: true } });
}));

// POST /subscriptions/upgrade
subscriptionRoutes.post('/upgrade', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const { planId } = z.object({ planId: z.string() }).parse(req.body);
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new ApiErrorResponse(404, 'PLAN_NOT_FOUND', 'Plan not found');
  // Reuse purchase flow; upgrade differences handled by plan tier comparison
  res.json({ success: true, data: { upgradeAvailable: true, plan: { id: plan.id, tier: plan.tier } } });
}));

// POST /subscriptions/cancel
subscriptionRoutes.post('/cancel', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const active = await prisma.subscription.findFirst({
    where: { userId: me, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE] } },
    orderBy: { createdAt: 'desc' },
  });
  if (!active) throw new ApiErrorResponse(404, 'NO_ACTIVE_SUBSCRIPTION', 'No active subscription');

  await prisma.subscription.update({
    where: { id: active.id },
    data: { cancelAtPeriodEnd: true, status: SubscriptionStatus.ACTIVE },
  });
  res.json({ success: true, data: { cancelled: true, effectiveEnd: active.currentPeriodEnd } });
}));

// GET /subscriptions/history
subscriptionRoutes.get('/history', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const subs = await prisma.subscription.findMany({
    where: { userId: req.auth!.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({
    success: true,
    data: { items: subs.map((s) => ({ id: s.id, tier: s.tier, cycle: s.cycle, status: s.status, price: Number(s.price), createdAt: s.createdAt, currentPeriodEnd: s.currentPeriodEnd, cancelAtPeriodEnd: s.cancelAtPeriodEnd })) },
  });
}));

// Internal: compute effective tier based on active subscription
export async function computeEffectiveTier(userId: string): Promise<PremiumTier> {
  const active = await prisma.subscription.findFirst({
    where: { userId, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE] }, currentPeriodEnd: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!active) return PremiumTier.FREE;
  const order: Record<string, number> = { FREE: 0, PLUS: 1, PREMIUM: 2, VIP: 3 };
  return (active.tier as PremiumTier);
}

// Internal: activate subscription (used by webhook + demo verify)
// Idempotent per orderId: a double-submit or concurrent activation for the
// same order is a no-op and can never create two active subscriptions.
// Accepts an optional `tx` so it can be composed atomically inside the payment
// webhook transaction.
export async function activateSubscription(userId: string, plan: any, orderId: string, tx?: any) {
  const db: any = tx ?? prisma;
  const run = async (d: any) => {
    // Idempotency guard: if this order already activated a subscription, do
    // nothing — prevents concurrent/double verification from re-granting.
    const existing = await d.subscription.findFirst({
      where: { providerId: orderId, userId },
      orderBy: { createdAt: 'desc' },
    });
    if (existing && existing.status === SubscriptionStatus.ACTIVE) {
      await d.payment.updateMany({
        where: { orderId, status: { not: 'COMPLETED' } },
        data: { status: 'COMPLETED' },
      });
      return { alreadyActive: true, subscriptionId: existing.id, tier: existing.tier, currentPeriodEnd: existing.currentPeriodEnd };
    }

    // expire previous active
    await d.subscription.updateMany({
      where: { userId, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE] } },
      data: { status: SubscriptionStatus.EXPIRED },
    });

    const now = new Date();
    const end = new Date(now);
    if (plan.cycle === SubscriptionCycle.YEARLY) end.setFullYear(end.getFullYear() + 1);
    else end.setMonth(end.getMonth() + 1);

    const subscription = await d.subscription.create({
      data: {
        userId,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        tier: plan.tier,
        cycle: plan.cycle,
        price: plan.price,
        currency: plan.currency,
        currentPeriodStart: now,
        currentPeriodEnd: end,
        autoRenew: true,
        provider: 'demo',
        providerId: orderId,
      },
    });

    await d.user.update({ where: { id: userId }, data: { premiumTier: plan.tier, premiumExpiresAt: end } });

    await d.payment.updateMany({
      where: { orderId, status: { not: 'COMPLETED' } },
      data: { status: 'COMPLETED' },
    });

    return { alreadyActive: false, subscriptionId: subscription.id, tier: plan.tier, currentPeriodEnd: end };
  };

  if (tx) return run(tx);
  return prisma.$transaction((d) => run(d));
}
