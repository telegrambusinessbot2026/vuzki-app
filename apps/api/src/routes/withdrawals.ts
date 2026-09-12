import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@vuzki/database';
import { ApiErrorResponse } from '@vuzki/types';
import { wrap } from './helpers';
import { authenticate, AuthedRequest } from '../middleware/auth';
import { WithdrawalStatus, WithdrawalMethod, KycStatus, MIN_WITHDRAWAL_AMOUNT } from '@vuzki/shared';
import { getEarningsSummary, movePendingToAvailable } from '../services/earnings';

export const withdrawalRoutes = Router();

// GET /withdrawals/meta - limits and methods
withdrawalRoutes.get('/meta', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const profile = await prisma.creatorProfile.findUnique({ where: { userId: req.auth!.userId } });
  const available = profile
    ? (await getEarningsSummary(req.auth!.userId))?.availableBalance ?? 0
    : 0;
  const earnings = await getEarningsSummary(req.auth!.userId);
  res.json({
    success: true,
    data: {
      availableBalance: earnings?.availableBalance ?? 0,
      pendingBalance: earnings?.pendingBalance ?? 0,
      methods: [WithdrawalMethod.UPI, WithdrawalMethod.BANK_TRANSFER],
      minimum: MIN_WITHDRAWAL_AMOUNT,
      isCreator: !!profile && (await prisma.user.findUnique({ where: { id: req.auth!.userId } }))?.isCreator,
      kycRequired: profile?.kyciStatus !== KycStatus.VERIFIED,
      kycStatus: profile?.kyciStatus ?? KycStatus.NOT_SUBMITTED,
    },
  });
}));

// POST /withdrawals
withdrawalRoutes.post('/', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const me = req.auth!.userId;
  const profile = await prisma.creatorProfile.findUnique({ where: { userId: me } });
  const user = await prisma.user.findUnique({ where: { id: me } });
  if (!user?.isCreator) throw new ApiErrorResponse(403, 'NOT_CREATOR', 'Only creators can withdraw');
  if (!profile) throw new ApiErrorResponse(403, 'NOT_CREATOR', 'Creator profile not found');

  if (profile.kyciStatus !== KycStatus.VERIFIED) {
    throw new ApiErrorResponse(403, 'KYC_REQUIRED', 'KYC verification is required before withdrawal');
  }

  const { amount, method, details } = z.object({
    amount: z.number().positive(),
    method: z.enum([WithdrawalMethod.UPI, WithdrawalMethod.BANK_TRANSFER]),
    details: z.record(z.string(), z.string()),
  }).parse(req.body);

  if (amount < MIN_WITHDRAWAL_AMOUNT) {
    throw new ApiErrorResponse(400, 'BELOW_MINIMUM', `Minimum withdrawal is ${MIN_WITHDRAWAL_AMOUNT}`, { minimum: MIN_WITHDRAWAL_AMOUNT });
  }

  // Verify method details
  if (method === WithdrawalMethod.UPI && !details.upiId?.includes('@')) {
    throw new ApiErrorResponse(400, 'INVALID_UPI', 'Invalid UPI ID');
  }
  if (method === WithdrawalMethod.BANK_TRANSFER && (!details.accountName || !details.accountNumber)) {
    throw new ApiErrorResponse(400, 'INVALID_BANK', 'Provide account name and number');
  }

  return prisma.$transaction(async (tx) => {
    // Serialize withdrawals per creator: lock the creator profile row so two
    // concurrent requests cannot both pass the duplicate/availability checks
    // and pay out the same earnings twice.
    await tx.$queryRaw`SELECT id FROM "CreatorProfile" WHERE id = ${profile.id} FOR UPDATE`;

    // Re-check for an in-flight withdrawal inside the transaction (atomic).
    const dup = await tx.withdrawal.findFirst({
      where: { userId: me, status: { in: [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING] } },
    });
    if (dup) throw new ApiErrorResponse(409, 'WITHDRAWAL_IN_PROGRESS', 'You already have a withdrawal in progress');

    // Compute available earnings (PENDING + AVAILABLE rows), accounting for any
    // already-consumed (withdrawnAmount) portions.
    const withdrawableRows = await tx.creatorEarning.findMany({
      where: { creatorId: profile.id, status: { in: ['PENDING', 'AVAILABLE'] } },
      orderBy: { createdAt: 'asc' },
    });
    const available = withdrawableRows.reduce((sum, e) => sum + Math.max(0, e.amount - (e.withdrawnAmount || 0)), 0);
    if (available < amount) {
      throw new ApiErrorResponse(400, 'INSUFFICIENT_AVAILABLE', `Available balance is ${available}`, { available });
    }

    // Consume the requested amount across earning rows. Partial consumption is
    // tracked on the row (withdrawnAmount) so the leftover is NEVER lost. Fully
    // consumed rows are marked WITHDRAWN so they leave the available ledger.
    const consumedEarningIds: string[] = [];
    let remaining = amount;
    for (const e of withdrawableRows) {
      if (remaining <= 0) break;
      const rowAvailable = Math.max(0, e.amount - (e.withdrawnAmount || 0));
      if (rowAvailable <= 0) continue;
      const take = Math.min(rowAvailable, remaining);
      const newWithdrawn = (e.withdrawnAmount || 0) + take;
      remaining -= take;
      consumedEarningIds.push(e.id);
      const fullyConsumed = newWithdrawn >= e.amount - 0.0001;
      await tx.creatorEarning.update({
        where: { id: e.id },
        data: {
          withdrawnAmount: newWithdrawn,
          status: fullyConsumed ? 'WITHDRAWN' : 'AVAILABLE',
        },
      });
    }

    const withdrawal = await tx.withdrawal.create({
      data: {
        userId: me,
        amount,
        currency: 'INR',
        method,
        details: { ...(details as any), consumedEarningIds } as any,
        status: WithdrawalStatus.PENDING,
      },
    });

    return withdrawal;
  }).then((withdrawal) => {
    // Fraud detection: flag suspicious withdrawal patterns (large first
    // withdrawal / high-risk method) for finance review. Non-blocking.
    void (async () => {
      const { checkWithdrawalAnomaly } = await import('../services/fraud');
      await checkWithdrawalAnomaly({ userId: me, amount: withdrawal.amount, method: withdrawal.method });
    })().catch(() => {});
    res.status(201).json({ success: true, data: { withdrawal: { id: withdrawal.id, amount: withdrawal.amount, method: withdrawal.method, status: withdrawal.status, createdAt: withdrawal.createdAt } } });
  });
}));

// GET /withdrawals
withdrawalRoutes.get('/', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const items = await prisma.withdrawal.findMany({
    where: { userId: req.auth!.userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({
    success: true,
    data: { items: items.map((w) => ({ id: w.id, amount: w.amount, method: w.method, status: w.status, createdAt: w.createdAt, updatedAt: w.updatedAt, rejectionReason: w.rejectionReason })) },
  });
}));
