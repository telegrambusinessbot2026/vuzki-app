import { Router } from 'express';
import { prisma } from '@vuzki/database';
import { ApiErrorResponse } from '@vuzki/types';
import { PaymentStatus, WalletTransactionType } from '@vuzki/shared';
import { wrap } from './helpers';
import { checkPaymentStatus } from '../services/phonepe';
import { creditCoins } from '../services/wallet';
import { authenticate, AuthedRequest } from '../middleware/auth';

export const paymentRoutes = Router();

paymentRoutes.get('/:orderId/status', authenticate(), wrap(async (req: AuthedRequest, res) => {
  const { orderId } = req.params;
  const userId = req.auth!.userId;

  const payment = await prisma.payment.findUnique({
    where: { orderId }
  });

  if (!payment) {
    throw new ApiErrorResponse(404, 'NOT_FOUND', 'Payment order not found');
  }

  if (payment.userId !== userId) {
    throw new ApiErrorResponse(403, 'FORBIDDEN', 'Access denied to this order');
  }

  if (payment.status === PaymentStatus.COMPLETED || payment.status === PaymentStatus.FAILED || payment.status === PaymentStatus.CANCELLED) {
    return res.json({ success: true, data: { status: payment.status } });
  }

  if (payment.provider.toUpperCase() === 'PHONEPE') {
    try {
      const status = await checkPaymentStatus(orderId);
      if (status.success && status.code === 'PAYMENT_SUCCESS' && status.data && status.data.state === 'COMPLETED') {
        const expectedAmountPaise = Math.round(Number(payment.amount) * 100);
        if (expectedAmountPaise === status.data.amount) {
          await prisma.$transaction(async (tx) => {
            const claimed = await tx.payment.updateMany({
              where: { id: payment.id, status: { in: [PaymentStatus.CREATED, PaymentStatus.PENDING, PaymentStatus.AUTHORIZED] } },
              data: {
                status: PaymentStatus.COMPLETED,
                providerPaymentId: status.data.transactionId || payment.providerPaymentId,
              }
            });

            if (claimed.count > 0) {
              if (payment.purpose === 'COINS' && payment.relatedId) {
                const pkg = await tx.coinPackage.findUnique({ where: { id: payment.relatedId } });
                if (pkg) {
                  const totalCoins = pkg.coins + pkg.bonusCoins;
                  await creditCoins(
                    payment.userId,
                    totalCoins,
                    WalletTransactionType.PURCHASE,
                    { orderId: payment.orderId, packageId: payment.relatedId, provider: payment.provider, providerReferenceId: status.data.transactionId },
                    payment.orderId,
                    `PAY:${payment.orderId}`,
                    tx
                  );
                  
                  // PHASE 21 GAP CLOSURE: Trigger referral eligibility on first successful top-up
                  const { transitionReferralToEligible } = await import('../services/referrals');
                  await transitionReferralToEligible(payment.userId, tx);
                }
              } else if (payment.purpose === 'SUBSCRIPTION' && payment.relatedId) {
                const { activateSubscription } = await import('./subscriptions');
                const plan = await tx.subscriptionPlan.findUnique({ where: { id: payment.relatedId } });
                if (plan) {
                  await activateSubscription(payment.userId, plan, payment.orderId, tx);
                }
              }
            }
          });
          return res.json({ success: true, data: { status: PaymentStatus.COMPLETED } });
        } else {
          await prisma.payment.updateMany({
             where: { id: payment.id, status: { not: PaymentStatus.COMPLETED } },
             data: { status: PaymentStatus.FAILED }
          });
          return res.json({ success: true, data: { status: PaymentStatus.FAILED, reason: 'AMOUNT_MISMATCH' } });
        }
      } else if (status.data && (status.data.state === 'FAILED' || status.code === 'PAYMENT_ERROR')) {
        await prisma.payment.updateMany({
          where: { id: payment.id, status: { not: PaymentStatus.COMPLETED } },
          data: { status: PaymentStatus.FAILED }
        });
        return res.json({ success: true, data: { status: PaymentStatus.FAILED } });
      }
    } catch (e: any) {
      // If PhonePe API throws, we just treat it as pending so it can be retried later
      console.error('PhonePe Status API Check Error:', e.message);
    }
  }

  return res.json({ success: true, data: { status: payment.status } });
}));
