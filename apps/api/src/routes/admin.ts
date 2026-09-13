import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { prisma } from '@vuzki/database';
import { ApiErrorResponse } from '@vuzki/types';
import { wrap } from './helpers';
import { requireAdmin, requirePermission, requireRole, AdminRequest } from '../guards';
import { config } from '../config';
import { getAllFeatureFlags, setFeatureFlag, resetFeatureFlags, getFeatureFlag, FEATURE_FLAG_KEYS } from '../services/feature-flags';
import { hashPassword, verifyPassword } from '@vuzki/utils';
import { AdminRole, WithdrawalStatus, WalletTransactionStatus, RestrictionType, KycStatus, AppealStatus } from '@vuzki/shared';
import { handlePaymentSuccess } from '../services/payments';
import { applyRestriction } from '../services/restrictions';
import { listModerationCases, decideCase } from '../services/moderation-cases';
import { listFraudFlags, decideFraudFlag, checkPaymentAnomalies } from '../services/fraud';
import { listContentFlags, decideContentFlag } from '../services/content-moderation';
import { listAppeals, reviewAppeal } from '../services/appeals';
import crypto from 'crypto';

export const adminRoutes = Router();

// Verify a provider webhook is authentic before fulfilling any order.
// Supported checks (at least one must pass):
//   1. A signed request where the signature is an HMAC-SHA256 over the raw
//      request body using the provider-specific secret (Stripe pattern).
//   2. A shared WEBHOOK_SECRET API key (simple shared-secret pattern) when no
//      per-provider signature is provided.
// In demo/dev with no secret configured, fulfillment is NOT trusted here —
// it is handled exclusively through the authenticated client /verify flow.
function verifyWebhookAuth(
  provider: string,
  params: { signature?: string; apiKey?: string; body: any }
): boolean {
  const secret =
    provider === 'stripe'
      ? config.stripeWebhookSecret
      : provider === 'razorpay'
        ? config.razorpayKeySecret
        : provider === 'cashfree'
          ? config.cashfreeClientSecret
          : provider === 'demo'
            ? config.webhookSecret
            : config.webhookSecret;

  // 1) HMAC signature verification over the serialized body (Stripe-style).
  if (params.signature && secret) {
    const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(params.body)).digest('hex');
    const received = params.signature;
    const a = Buffer.from(expected);
    const b = Buffer.from(String(received));
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  }

  // 2) Shared secret API key.
  if (params.apiKey && config.webhookSecret && params.apiKey === config.webhookSecret) {
    return true;
  }

  return false;
}

// ============ AUTH ============

// POST /admin/login
adminRoutes.post('/login', wrap(async (req, res) => {
  const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin || !admin.isActive || !(await verifyPassword(password, admin.passwordHash))) {
    throw new ApiErrorResponse(401, 'INVALID_ADMIN_CREDENTIALS', 'Invalid admin credentials');
  }
  await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  const token = jwt.sign({ adminId: admin.id, role: admin.role, email: admin.email }, config.adminJwtSecret, { expiresIn: '12h' });
  res.json({ success: true, data: { token, admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } } });
}));

// POST /admin/create (super admin only)
adminRoutes.post('/create', requireAdmin, requireRole(AdminRole.SUPER_ADMIN), wrap(async (req: AdminRequest, res) => {
  const { name, email, password, role } = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum([AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MODERATOR, AdminRole.FINANCE_ADMIN, AdminRole.SUPPORT_AGENT]),
  }).parse(req.body);

  const admin = await prisma.admin.create({
    data: { name, email, passwordHash: await hashPassword(password), role },
  });
  res.status(201).json({ success: true, data: { admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } } });
}));

// GET /admin/me
adminRoutes.get('/me', requireAdmin, wrap(async (req: AdminRequest, res) => {
  const admin = await prisma.admin.findUnique({ where: { id: req.admin!.adminId } });
  res.json({ success: true, data: { admin: { id: admin!.id, name: admin!.name, email: admin!.email, role: admin!.role } } });
}));

// ============ DASHBOARD ============

// GET /admin/dashboard
adminRoutes.get('/dashboard', requireAdmin, requirePermission('analytics.read'), wrap(async (_req: AdminRequest, res) => {
  const startToday = new Date(new Date().setHours(0, 0, 0, 0));
  const [totalUsers, newUsersToday, premiumUsers, onlineUsers, callsToday, messagesToday, pendingWithdrawals, openReports, bannedUsers] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { createdAt: { gte: startToday } } }),
    prisma.user.count({ where: { premiumTier: { not: 'FREE' } } }),
    prisma.user.count({ where: { onlineStatus: true } }),
    prisma.call.count({ where: { createdAt: { gte: startToday } } }),
    prisma.message.count({ where: { createdAt: { gte: startToday } } }),
    prisma.withdrawal.count({ where: { status: WithdrawalStatus.PENDING } }),
    prisma.report.count({ where: { status: 'PENDING' } }),
    prisma.user.count({ where: { status: 'BANNED' } }),
  ]);

  const revenueAgg = await prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } });

  res.json({
    success: true,
    data: {
      totalUsers,
      newUsersToday,
      premiumUsers,
      onlineUsers,
      callsToday,
      messagesToday,
      pendingWithdrawals,
      openReports,
      bannedUsers,
      revenue: Number(revenueAgg._sum.amount ?? 0),
      activeUsers: onlineUsers,
    },
  });
}));

// GET /admin/analytics?range=7d|30d
adminRoutes.get('/analytics', requireAdmin, requirePermission('analytics.read'), wrap(async (req: AdminRequest, res) => {
  const { range = '30d' } = z.object({ range: z.string().default('30d') }).parse(req.query ?? {});
  const days = range === '7d' ? 7 : 30;
  const from = new Date();
  from.setDate(from.getDate() - days);

  const signups = await prisma.user.groupBy({
    by: ['createdAt'],
    where: { createdAt: { gte: from } },
    _count: true,
  });
  const calls = await prisma.call.groupBy({ by: ['createdAt'], where: { createdAt: { gte: from } }, _count: true });
  const messages = await prisma.message.groupBy({ by: ['createdAt'], where: { createdAt: { gte: from } }, _count: true });
  const payments = await prisma.payment.findMany({ where: { createdAt: { gte: from }, status: 'COMPLETED' }, select: { amount: true, createdAt: true } });

  const series = (data: { createdAt: Date; _count?: number; amount?: number }[], key: 'count' | 'amount') => {
    const out: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      out[d.toISOString().slice(0, 10)] = 0;
    }
    for (const row of data) {
      const day = new Date(row.createdAt).toISOString().slice(0, 10);
      out[day] = (out[day] || 0) + (key === 'count' ? row._count ?? 1 : row.amount ?? 0);
    }
    return Object.entries(out).map(([date, value]) => ({ date, value }));
  };

  res.json({
    success: true,
    data: {
      signups: series(signups as any, 'count'),
      calls: series(calls as any, 'count'),
      messages: series(messages as any, 'count'),
      revenue: series(payments as any, 'amount'),
    },
  });
}));

// ============ USERS ============

// GET /admin/users
adminRoutes.get('/users', requireAdmin, requirePermission('users.read'), wrap(async (req: AdminRequest, res) => {
  const { q, status, isCreator, page = 1, limit = 20 } = z.object({
    q: z.string().optional(),
    status: z.string().optional(),
    isCreator: z.string().optional(),
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(20),
  }).parse(req.query ?? {});

  const where: Record<string, any> = { deletedAt: null };
  if (q) where.OR = [{ username: { contains: q, mode: 'insensitive' } }, { displayName: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }];
  if (status) where.status = status;
  if (isCreator === 'true') where.isCreator = true;

  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit, include: { _count: { select: { reportsReceived: true } } } }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      items: users.map((u) => ({ id: u.id, username: u.username, displayName: u.displayName, email: u.email, phone: u.phone, status: u.status, isVerified: u.isVerified, premiumTier: u.premiumTier, isCreator: u.isCreator, created: u.createdAt, reports: u._count.reportsReceived })),
      total,
      page,
      limit,
    },
  });
}));

// GET /admin/users/:id (full detail incl wallet, reports, moderation)
adminRoutes.get('/users/:id', requireAdmin, requirePermission('users.read'), wrap(async (req: AdminRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { wallet: true, creator: true, preferences: true },
  });
  if (!user) throw new ApiErrorResponse(404, 'USER_NOT_FOUND', 'User not found');

  const [reports, moderation, transactions] = await Promise.all([
    prisma.report.findMany({ where: { reportedUserId: user.id } }),
    prisma.moderationAction.findMany({ where: { userId: user.id } }),
    prisma.walletTransaction.findMany({ where: { userId: user.id }, take: 50, orderBy: { createdAt: 'desc' } }),
  ]);

  res.json({
    success: true,
    data: {
      user: { id: user.id, username: user.username, displayName: user.displayName, email: user.email, phone: user.phone, status: user.status, isVerified: user.isVerified, premiumTier: user.premiumTier, isCreator: user.isCreator, gender: user.gender, bio: user.bio, created: user.createdAt, wallet: user.wallet?.balance ?? 0, creator: user.creator ? { status: user.creator.status, rating: user.creator.rating } : null },
      reports: reports.map((r) => ({ id: r.id, category: r.category, status: r.status, createdAt: r.createdAt })),
      moderation: moderation.map((m) => ({ id: m.id, actionType: m.actionType, severity: m.severity, reason: m.reason, createdAt: m.createdAt })),
      transactions,
    },
  });
}));

// PATCH /admin/users/:id (verify, suspend, ban, unban)
adminRoutes.patch('/users/:id', requireAdmin, requirePermission('users.write'), wrap(async (req: AdminRequest, res) => {
  const { action, reason, days, note } = z.object({
    action: z.enum(['verify', 'unverify', 'suspend', 'ban', 'unban', 'restore']),
    reason: z.string().optional(),
    days: z.number().int().optional(),
    note: z.string().optional(),
  }).parse(req.body);

  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw new ApiErrorResponse(404, 'USER_NOT_FOUND', 'User not found');

  const data: Record<string, any> = {};
  let actionType: string = action;

  switch (action) {
    case 'verify': data.isVerified = true; actionType = 'VERIFY_USER'; break;
    case 'unverify': data.isVerified = false; actionType = 'UNVERIFY_USER'; break;
    case 'unban': data.status = 'ACTIVE'; actionType = 'UNBAN_USER'; break;
    case 'restore': data.status = 'ACTIVE'; data.deletedAt = null; actionType = 'RESTORE_USER'; break;
  }

  // Ban/suspend go through the restriction layer so a real UserRestriction row
  // (with expiry + appeal target) is created, not just a status flip + log.
  if (action === 'ban' || action === 'suspend') {
    await applyRestriction({
      userId: user.id,
      type: action === 'ban' ? RestrictionType.BAN : (days && days > 0 ? RestrictionType.TEMP_SUSPENSION : RestrictionType.SUSPENSION),
      reason: reason || note,
      days,
      adminId: req.admin!.adminId,
    });
    return res.json({ success: true, data: { updated: action } });
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length > 0) {
      await tx.user.update({ where: { id: user.id }, data });
    }
    await tx.moderationAction.create({
      data: {
        userId: user.id,
        actionType,
        severity: 'MEDIUM',
        reason: reason || note,
        adminId: req.admin!.adminId,
        days,
        metadata: { note },
      },
    });
  });

  res.json({ success: true, data: { updated: action } });
}));

// ============ CREATORS ============

// GET /admin/creators
adminRoutes.get('/creators', requireAdmin, requirePermission('creators.read'), wrap(async (req: AdminRequest, res) => {
  const { status, page = 1, limit = 20 } = z.object({ status: z.string().optional(), page: z.coerce.number().default(1), limit: z.coerce.number().default(20) }).parse(req.query ?? {});
  const where: Record<string, any> = { OR: [{ isCreator: true }, { creator: { is: { not: null } } }] };
  if (status) where.creator = { is: { status } };

  const skip = (page - 1) * limit;
  const [creators, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { creator: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      items: creators.map((u) => ({ id: u.id, displayName: u.displayName, username: u.username, isCreator: u.isCreator, verif: u.isVerified, creator: u.creator ? { status: u.creator.status, rating: u.creator.rating, kyciStatus: u.creator.kyciStatus, totalEarnings: u.creator.totalEarnings, totalMinutes: u.creator.totalMinutes } : null })),
      total,
    },
  });
}));

// PATCH /admin/creators/:id (approve/reject/suspend application)
adminRoutes.patch('/creators/:id', requireAdmin, requirePermission('creators.write'), wrap(async (req: AdminRequest, res) => {
  const { action, note } = z.object({ action: z.enum(['approve', 'reject', 'suspend', 'revoke']), note: z.string().optional() }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, include: { creator: true } });
  if (!user || !user.creator) throw new ApiErrorResponse(404, 'NOT_CREATOR', 'Creator not found');

  let status = user.creator.status;
  if (action === 'approve') status = 'APPROVED';
  if (action === 'reject') status = 'REJECTED';
  if (action === 'suspend') status = 'SUSPENDED';
  if (action === 'revoke') status = 'REVOKED';

  await prisma.$transaction(async (tx) => {
    await tx.creatorProfile.update({ where: { id: user.creator!.id }, data: { status, approvedAt: action === 'approve' ? new Date() : undefined } });
    await tx.user.update({ where: { id: user.id }, data: { isCreator: action === 'approve', creatorStatus: action === 'approve' ? 'OFFLINE' : 'OFFLINE' } });
    await tx.moderationAction.create({ data: { userId: user.id, actionType: 'WARN', severity: 'LOW', reason: note || `Creator ${action}`, adminId: req.admin!.adminId, days: null } });
  });

  res.json({ success: true, data: { status } });
}));

// ============ REPORTS & MODERATION ============

// GET /admin/reports
adminRoutes.get('/reports', requireAdmin, requirePermission('reports.read'), wrap(async (req: AdminRequest, res) => {
  const { status, page = 1, limit = 20 } = z.object({ status: z.string().optional(), page: z.coerce.number().default(1), limit: z.coerce.number().default(20) }).parse(req.query ?? {});
  const where: Record<string, any> = {};
  if (status) where.status = status;

  const skip = (page - 1) * limit;
  const [reports, total] = await Promise.all([
    prisma.report.findMany({ where, include: { reporter: { select: { id: true, displayName: true } }, reportedUser: { select: { id: true, displayName: true } } }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.report.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      items: reports.map((r) => ({ id: r.id, reporter: r.reporter.displayName, reported: r.reportedUser.displayName, reportedId: r.reportedUser.id, category: r.category, description: r.description, status: r.status, aiFlagged: !!r.attachments, createdAt: r.createdAt })),
      total,
    },
  });
}));

// PATCH /admin/reports/:id
adminRoutes.patch('/reports/:id', requireAdmin, requirePermission('reports.write'), wrap(async (req: AdminRequest, res) => {
  const { decision, actionType, note, banUser, days } = z.object({
    decision: z.enum(['resolve', 'action', 'dismiss']),
    actionType: z.string().optional(),
    note: z.string().optional(),
    banUser: z.boolean().optional(),
    days: z.number().int().optional(),
  }).parse(req.body);

  const report = await prisma.report.findUnique({ where: { id: req.params.id } });
  if (!report) throw new ApiErrorResponse(404, 'REPORT_NOT_FOUND', 'Report not found');

  const statusMap: Record<string, string> = { resolve: 'RESOLVED', action: 'ACTIONED', dismiss: 'DISMISSED' };

  await prisma.$transaction(async (tx) => {
    await tx.report.update({
      where: { id: report.id },
      data: { status: statusMap[decision], resolution: note, resolvedBy: req.admin!.adminId, resolvedAt: new Date() },
    });
    if (decision === 'action' && actionType) {
      if (actionType === 'BAN' || banUser) {
        await applyRestriction({
          userId: report.reportedUserId,
          type: RestrictionType.BAN,
          reason: note,
          adminId: req.admin!.adminId,
        });
      } else if (actionType === 'SUSPEND') {
        await applyRestriction({
          userId: report.reportedUserId,
          type: days && days > 0 ? RestrictionType.TEMP_SUSPENSION : RestrictionType.SUSPENSION,
          reason: note,
          days,
          adminId: req.admin!.adminId,
        });
      } else {
        await tx.moderationAction.create({
          data: { userId: report.reportedUserId, actionType, severity: 'MEDIUM', reason: note, adminId: req.admin!.adminId, days: days ?? null },
        });
      }
    }
  });

  res.json({ success: true, data: { status: statusMap[decision] } });
}));

// ============ WITHDRAWALS (Finance) ============

// GET /admin/withdrawals
adminRoutes.get('/withdrawals', requireAdmin, requirePermission('withdrawals.read'), wrap(async (req: AdminRequest, res) => {
  const { status, page = 1, limit = 20 } = z.object({ status: z.string().optional(), page: z.coerce.number().default(1), limit: z.coerce.number().default(20) }).parse(req.query ?? {});
  const where: Record<string, any> = {};
  if (status) where.status = status;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.withdrawal.findMany({ where, include: { user: { select: { id: true, displayName: true } } }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.withdrawal.count({ where }),
  ]);

  res.json({ success: true, data: { items: items.map((w) => ({ id: w.id, user: w.user.displayName, amount: w.amount, method: w.method, status: w.status, createdAt: w.createdAt, updatedAt: w.updatedAt })), total } });
}));

// PATCH /admin/withdrawals/:id (approve/process/reject/complete)
adminRoutes.patch('/withdrawals/:id', requireAdmin, requirePermission('withdrawals.write'), wrap(async (req: AdminRequest, res) => {
  const { decision, note } = z.object({ decision: z.enum(['approve', 'process', 'reject', 'complete']), note: z.string().optional() }).parse(req.body);
  const w = await prisma.withdrawal.findUnique({ where: { id: req.params.id } });
  if (!w) throw new ApiErrorResponse(404, 'WITHDRAWAL_NOT_FOUND', 'Withdrawal not found');

  const statusMap: Record<string, string> = { approve: 'PROCESSING', process: 'PROCESSING', reject: 'REJECTED', complete: 'COMPLETED' };

  await prisma.$transaction(async (tx) => {
    // Guarded transition: only pending/processing withdrawals can change state.
    const allowedFrom = ['PENDING', 'PROCESSING'];
    const claim = await tx.withdrawal.updateMany({
      where: { id: w.id, status: { in: allowedFrom } },
      data: { status: statusMap[decision], rejectionReason: decision === 'reject' ? note : undefined, processedBy: req.admin!.adminId, processedAt: new Date() },
    });
    if (claim.count === 0) {
      throw new ApiErrorResponse(409, 'CONFLICT', 'Withdrawal already in a terminal state');
    }

    // On rejection, RESTORE the earnings consumed by this withdrawal so the
    // creator's available balance is not permanently locked away.
    if (decision === 'reject' && w.details) {
      const links = (w.details as any)?.consumedEarningIds as string[] | undefined;
      if (Array.isArray(links) && links.length > 0) {
        await tx.creatorEarning.updateMany({
          where: { id: { in: links } },
          data: { status: 'AVAILABLE', withdrawnAmount: 0 },
        });
      }
    }

    await tx.auditLog.create({ data: { actorId: req.admin!.adminId, actorType: 'ADMIN', action: `withdrawal:${decision}`, entityType: 'Withdrawal', entityId: w.id, metadata: { note } } });
  });

  res.json({ success: true, data: { status: statusMap[decision] } });
}));

// ============ COIN PACKAGES (Finance) ============

adminRoutes.get('/coin-packages', requireAdmin, requirePermission('finance.read'), wrap(async (_req: AdminRequest, res) => {
  const items = await prisma.coinPackage.findMany({ orderBy: { coins: 'asc' } });
  res.json({ success: true, data: { items: items.map((p) => ({ id: p.id, name: p.name, coins: p.coins, bonusCoins: p.bonusCoins, price: Number(p.price), currency: p.currency, isPopular: p.isPopular, status: p.status })) } });
}));

adminRoutes.post('/coin-packages', requireAdmin, requirePermission('finance.write'), wrap(async (req: AdminRequest, res) => {
  const body = z.object({ name: z.string(), coins: z.number().int().positive(), bonusCoins: z.number().int().nonnegative().default(0), price: z.number().positive(), isPopular: z.boolean().default(false), status: z.string().default('ACTIVE') }).parse(req.body);
  const pkg = await prisma.coinPackage.create({ data: { ...body, currency: 'INR' } });
  res.status(201).json({ success: true, data: { id: pkg.id } });
}));

adminRoutes.patch('/coin-packages/:id', requireAdmin, requirePermission('finance.write'), wrap(async (req: AdminRequest, res) => {
  const body = z.object({ name: z.string().optional(), coins: z.number().int().optional(), bonusCoins: z.number().int().optional(), price: z.number().optional(), isPopular: z.boolean().optional(), status: z.string().optional() }).parse(req.body);
  const pkg = await prisma.coinPackage.update({ where: { id: req.params.id }, data: body });
  res.json({ success: true, data: { id: pkg.id } });
}));

adminRoutes.delete('/coin-packages/:id', requireAdmin, requirePermission('finance.write'), wrap(async (req: AdminRequest, res) => {
  await prisma.coinPackage.update({ where: { id: req.params.id }, data: { status: 'INACTIVE' } });
  res.json({ success: true });
}));

// ============ SUBSCRIPTION PLANS (Finance) ============

adminRoutes.get('/subscription-plans', requireAdmin, requirePermission('finance.read'), wrap(async (_req: AdminRequest, res) => {
  const items = await prisma.subscriptionPlan.findMany({ orderBy: { price: 'desc' } });
  res.json({ success: true, data: { items: items.map((p) => ({ id: p.id, tier: p.tier, cycle: p.cycle, name: p.name, price: Number(p.price), isActive: p.isActive, features: p.features })) } });
}));

adminRoutes.patch('/subscription-plans/:id', requireAdmin, requirePermission('finance.write'), wrap(async (req: AdminRequest, res) => {
  const body = z.object({ price: z.number().optional(), isActive: z.boolean().optional(), name: z.string().optional(), features: z.record(z.any()).optional() }).parse(req.body);
  const plan = await prisma.subscriptionPlan.update({ where: { id: req.params.id }, data: body });
  res.json({ success: true, data: { id: plan.id } });
}));

// ============ GIFTS (Finance) ============

adminRoutes.get('/gifts', requireAdmin, requirePermission('finance.read'), wrap(async (_req: AdminRequest, res) => {
  const items = await prisma.gift.findMany({ orderBy: { priceCoins: 'asc' } });
  res.json({ success: true, data: { items } });
}));

adminRoutes.patch('/gifts/:id', requireAdmin, requirePermission('finance.write'), wrap(async (req: AdminRequest, res) => {
  const body = z.object({ name: z.string().optional(), priceCoins: z.number().int().optional(), category: z.string().optional(), status: z.string().optional() }).parse(req.body);
  const gift = await prisma.gift.update({ where: { id: req.params.id }, data: body });
  res.json({ success: true, data: { id: gift.id } });
}));

// ============ FINANCIAL OVERVIEW ============

adminRoutes.get('/finance', requireAdmin, requirePermission('finance.read'), wrap(async (_req: AdminRequest, res) => {
  const [coinRevenue, subRevenue, completedWithdrawals, pendingWithdrawals, giftCount] = await Promise.all([
    prisma.payment.aggregate({ where: { status: 'COMPLETED', purpose: 'COINS' }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { status: 'COMPLETED', purpose: 'SUBSCRIPTION' }, _sum: { amount: true } }),
    prisma.withdrawal.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
    prisma.withdrawal.aggregate({ where: { status: { in: ['PENDING', 'PROCESSING'] } }, _sum: { amount: true } }),
    prisma.giftTransaction.count(),
  ]);

  const creatorEarnings = await prisma.creatorEarning.aggregate({ _sum: { amount: true } });

  res.json({
    success: true,
    data: {
      coinRevenue: Number(coinRevenue._sum.amount ?? 0),
      subscriptionRevenue: Number(subRevenue._sum.amount ?? 0),
      completedWithdrawals: Number(completedWithdrawals._sum.amount ?? 0),
      pendingWithdrawals: Number(pendingWithdrawals._sum.amount ?? 0),
      creatorEarnings: Number(creatorEarnings._sum.amount ?? 0),
      giftsSent: giftCount,
    },
  });
}));

// ============ NOTIFICATIONS BROADCAST ============

// ============ PAYMENT PROVIDERS ============
adminRoutes.get("/payment-providers", requireAdmin, wrap(async (_req: AdminRequest) => {
  const providers = [
    { id: "razorpay", name: "Razorpay", enabled: !!config.razorpayKeyId, configured: true, productionReady: false },
    { id: "phonepe", name: "PhonePe", enabled: !!config.phonepeMerchantId, configured: true, productionReady: false },
    { id: "stripe", name: "Stripe", enabled: !!config.stripeSecretKey, configured: true, productionReady: false },
    { id: "cashfree", name: "Cashfree", configured: !!config.cashfreeClientId, productionReady: false },
    { id: "paypal", name: "PayPal", configured: false, productionReady: false },
  ];
  return { providers };
})

)

adminRoutes.post('/notify', requireAdmin, requirePermission('notifications.write'), wrap(async (req: AdminRequest, res) => {
  const { userId, title, body, type = 'SYSTEM' } = z.object({ userId: z.string(), title: z.string(), body: z.string(), type: z.string().optional() }).parse(req.body);
  await prisma.notification.create({ data: { userId, type, title, body } });
  res.json({ success: true });
}));

// ============ PAYMENTS (provider webhook) ============

// POST /admin/payments/webhook
// Provider server-to-server webhook. NEVER public-trusting: we verify either a
// valid provider signature (HMAC) or a shared webhook secret API key before
// fulfilling any order. In demo mode the client-side /verify endpoint handles
// fulfillment; this route refuses unsigned requests unless WEBHOOK_SECRET is set.
adminRoutes.post('/payments/webhook', async (req, res, next) => {
  try {
    const { orderId, provider, paymentId, signature, status, apiKey } = z.object({
      orderId: z.string(),
      provider: z.string(),
      paymentId: z.string().optional(),
      signature: z.string().optional(),
      status: z.string(),
      apiKey: z.string().optional(),
    }).parse(req.body);

    // 1) Authorize the caller. Either a valid provider signature/HMAC or a
    //    configured shared webhook secret must be present. Without one, the
    //    request is rejected before any fulfillment can run.
    const approved = await verifyWebhookAuth(provider, { signature, apiKey, body: req.body });
    if (!approved) {
      throw new ApiErrorResponse(401, 'UNAUTHORIZED', 'Invalid webhook credentials');
    }

    if (status === 'captured' || status === 'completed' || status === 'authorized') {
      const result = await handlePaymentSuccess({ orderId, provider, providerPaymentId: paymentId, signature });
      return res.json({ success: true, data: result });
    }
    if (status === 'failed' || status === 'cancelled') {
      const updated = await prisma.payment.updateMany({
        where: { orderId, status: { not: 'COMPLETED' } },
        data: { status: status === 'failed' ? 'FAILED' : 'CANCELLED' },
      });
      return res.json({ success: true, data: { updated: updated.count } });
    }
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// GET /admin/realtime - live aggregation of WS/presence/call/message metrics
adminRoutes.get('/realtime', requireAdmin, requirePermission('analytics.read'), wrap(async (_req: AdminRequest, res) => {
  const { snapshotRealtimeMetrics } = await import('../realtime/metrics');
  const metrics = await snapshotRealtimeMetrics();
  res.json({ success: true, data: metrics });
}));

// ============ FEATURE FLAGS ============

// GET /admin/flags - current flag state (runtime overrides + baseline)
adminRoutes.get('/flags', requireAdmin, requirePermission('flags.read'), wrap(async (_req: AdminRequest, res) => {
  res.json({ success: true, data: getAllFeatureFlags() });
}));

// PATCH /admin/flags - toggle one flag for gradual rollout
adminRoutes.patch('/flags/:key', requireAdmin, requirePermission('flags.write'), wrap(async (req: AdminRequest, res) => {
  const { key } = z.object({ key: z.enum(FEATURE_FLAG_KEYS as unknown as [string, ...string[]]) }).parse(req.params);
  const { value } = z.object({ value: z.boolean() }).parse(req.body);
  setFeatureFlag(key as any, value);
  res.json({ success: true, data: { [key]: getFeatureFlag(key as any) } });
}));

// POST /admin/flags/reset - restore env-baseline flags
adminRoutes.post('/flags/reset', requireAdmin, requirePermission('flags.write'), wrap(async (_req: AdminRequest, res) => {
  resetFeatureFlags();
  res.json({ success: true, data: getAllFeatureFlags() });
}));

// GET /admin/moderation-cases - review queue of open moderation cases
adminRoutes.get('/moderation-cases', requireAdmin, requirePermission('moderation.write'), wrap(async (req: AdminRequest, res) => {
  const q = z.object({ status: z.string().optional(), priority: z.string().optional(), riskLevel: z.string().optional(), page: z.coerce.number().optional(), limit: z.coerce.number().optional() }).parse(req.query);
  res.json({ success: true, data: await listModerationCases(q) });
}));

// PATCH /admin/moderation-cases/:id - resolve/dismiss/escalate a case
adminRoutes.patch('/moderation-cases/:id', requireAdmin, requirePermission('moderation.write'), wrap(async (req: AdminRequest, res) => {
  const { decision, note } = z.object({ decision: z.enum(['RESOLVED', 'DISMISSED', 'ESCALATED']), note: z.string().optional() }).parse(req.body);
  const updated = await decideCase({ caseId: req.params.id, decision, note, adminId: req.admin!.adminId });
  res.json({ success: true, data: { caseId: updated.id, status: decision } });
}));

// GET /admin/fraud-flags - fraud investigation queue
adminRoutes.get('/fraud-flags', requireAdmin, requirePermission('flags.read'), wrap(async (req: AdminRequest, res) => {
  const q = z.object({ status: z.string().optional(), entityType: z.string().optional(), page: z.coerce.number().optional(), limit: z.coerce.number().optional() }).parse(req.query);
  res.json({ success: true, data: await listFraudFlags(q) });
}));

// PATCH /admin/fraud-flags/:id - update fraud flag status
adminRoutes.patch('/fraud-flags/:id', requireAdmin, requirePermission('flags.write'), wrap(async (req: AdminRequest, res) => {
  const { decision, note } = z.object({ decision: z.enum(['INVESTIGATING', 'CONFIRMED', 'DISMISSED', 'OPEN']), note: z.string().optional() }).parse(req.body);
  res.json({ success: true, data: await decideFraudFlag({ id: req.params.id, decision, note, adminId: req.admin!.adminId }) });
}));

// GET /admin/content-flags - content moderation review queue
adminRoutes.get('/content-flags', requireAdmin, requirePermission('moderation.write'), wrap(async (req: AdminRequest, res) => {
  const q = z.object({ status: z.string().optional(), page: z.coerce.number().optional(), limit: z.coerce.number().optional() }).parse(req.query);
  res.json({ success: true, data: await listContentFlags(q) });
}));

// PATCH /admin/content-flags/:id - approve/reject/remove reported content
adminRoutes.patch('/content-flags/:id', requireAdmin, requirePermission('moderation.write'), wrap(async (req: AdminRequest, res) => {
  const { decision, note } = z.object({ decision: z.enum(['APPROVED', 'REJECTED', 'REMOVED']), note: z.string().optional() }).parse(req.body);
  res.json({ success: true, data: await decideContentFlag({ id: req.params.id, decision, note, adminId: req.admin!.adminId }) });
}));

// GET /admin/appeals - user appeal review queue
adminRoutes.get('/appeals', requireAdmin, requirePermission('moderation.write'), wrap(async (req: AdminRequest, res) => {
  const q = z.object({ status: z.string().optional(), page: z.coerce.number().optional(), limit: z.coerce.number().optional() }).parse(req.query);
  res.json({ success: true, data: await listAppeals(q) });
}));

// PATCH /admin/appeals/:id - review an appeal (uphold/reduce/remove/reject)
adminRoutes.patch('/appeals/:id', requireAdmin, requirePermission('moderation.write'), wrap(async (req: AdminRequest, res) => {
  const { action, note, restrictionId, daysReducedTo } = z.object({
    action: z.enum(['UPHELD', 'REDUCED', 'REMOVED', 'REDUCE']),
    note: z.string().optional(),
    restrictionId: z.string().optional(),
    daysReducedTo: z.number().int().optional(),
  }).parse(req.body);
  // REDUCE needs a target duration; map the rest to the actual AppealStatus members.
  const decision: AppealStatus | 'REDUCE' =
    action === 'REDUCE' ? 'REDUCE' : AppealStatus[action as keyof typeof AppealStatus];
  res.json({ success: true, data: await reviewAppeal({ appealId: req.params.id, decision, note, adminId: req.admin!.adminId, restrictionId, daysReducedTo }) });
}));

// PATCH /admin/creators/:id/kyc - verify or reject a creator KYC submission
// (KYC can only reach VERIFIED through this deterministic admin action; see /creators/me/kyc)
adminRoutes.patch('/creators/:id/kyc', requireAdmin, requirePermission('creators.write'), wrap(async (req: AdminRequest, res) => {
  const { decision, note } = z.object({ decision: z.enum([KycStatus.VERIFIED, KycStatus.REJECTED]), note: z.string().optional() }).parse(req.body);
  const profile = await prisma.creatorProfile.findUnique({ where: { userId: req.params.id } });
  if (!profile) throw new ApiErrorResponse(404, 'NOT_FOUND', 'Creator profile not found');
  const updated = await prisma.creatorProfile.update({
    where: { id: profile.id },
    data: {
      kyciStatus: decision as any,
      kycDetails: { ...(profile.kycDetails as any || {}), reviewedAt: new Date().toISOString(), reviewNote: note } as any,
    },
  });
  res.json({ success: true, data: { kyciStatus: updated.kyciStatus } });
}));
