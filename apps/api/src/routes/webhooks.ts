import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@vuzki/database';
import { ApiErrorResponse } from '@vuzki/types';
import { PaymentStatus, WalletTransactionType } from '@vuzki/shared';
import { wrap } from './helpers';
import { verifyPhonePeWebhookSignature } from '../services/phonepe';
import { creditCoins } from '../services/wallet';
import { config } from '../config';

export const webhookRoutes = Router();

// POST /api/v1/webhooks/phonepe
// Public unauthenticated webhook for PhonePe Server-to-Server callbacks
webhookRoutes.post('/phonepe', wrap(async (req, res) => {
  const xVerify = req.headers['x-verify'] as string;
  if (!xVerify) {
    throw new ApiErrorResponse(400, 'MISSING_SIGNATURE', 'Missing X-VERIFY header');
  }

  const { response: base64Response } = z.object({
    response: z.string(),
  }).parse(req.body);

  // 1. Verify cryptographic signature strictly
  const isValid = verifyPhonePeWebhookSignature(base64Response, xVerify);
  if (!isValid) {
    throw new ApiErrorResponse(401, 'INVALID_SIGNATURE', 'Invalid webhook signature');
  }

  // 2. Decode the base64 JSON payload
  let payload: any;
  try {
    const jsonStr = Buffer.from(base64Response, 'base64').toString('utf8');
    payload = JSON.parse(jsonStr);
  } catch (err) {
    throw new ApiErrorResponse(400, 'MALFORMED_PAYLOAD', 'Failed to decode base64 JSON payload');
  }

  // 3. Validate callback data
  const { success, code, data } = payload;
  if (!data || !data.merchantId || !data.transactionId || typeof data.amount !== 'number') {
    throw new ApiErrorResponse(400, 'MALFORMED_DATA', 'Missing required fields in payload data');
  }

  if (data.merchantId !== config.phonepeMerchantId) {
    throw new ApiErrorResponse(400, 'INVALID_MERCHANT', 'Merchant ID mismatch');
  }

  const { transactionId, amount: amountPaise, state, providerReferenceId } = data;

  // Find existing payment safely
  const payment = await prisma.payment.findUnique({
    where: { orderId: transactionId },
  });

  if (!payment) {
    throw new ApiErrorResponse(404, 'ORDER_NOT_FOUND', 'Transaction ID not found');
  }

  // Exact Amount Verification
  const expectedAmountPaise = Math.round(Number(payment.amount) * 100);
  if (expectedAmountPaise !== amountPaise) {
    // Record suspicious mismatch
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        metadata: {
          ...(payment.metadata as object),
          amountMismatch: true,
          expectedPaise: expectedAmountPaise,
          receivedPaise: amountPaise,
        } as any,
      },
    });
    throw new ApiErrorResponse(400, 'AMOUNT_MISMATCH', 'Payment amount mismatch detected');
  }

  // Handle successful state
  if (success && code === 'PAYMENT_SUCCESS' && state === 'COMPLETED') {
    if (payment.status === PaymentStatus.COMPLETED) {
      // Idempotent: already processed
      return res.json({ success: true, message: 'Already processed' });
    }

    // Process atomically
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.payment.updateMany({
        where: { id: payment.id, status: { in: [PaymentStatus.CREATED, PaymentStatus.PENDING, PaymentStatus.AUTHORIZED] } },
        data: {
          status: PaymentStatus.COMPLETED,
          providerPaymentId: providerReferenceId || payment.providerPaymentId,
          webhookReceived: { 
            ...((payment.webhookReceived as any) || {}), 
            at: new Date().toISOString(),
            providerReferenceId,
            paymentState: state,
            code,
            amount: amountPaise,
          } as any,
        },
      });

      if (claimed.count === 0) {
        return; // Raced, already completed
      }

      if (payment.purpose === 'COINS' && payment.relatedId) {
        const pkg = await tx.coinPackage.findUnique({ where: { id: payment.relatedId } });
        if (pkg) {
          const totalCoins = pkg.coins + pkg.bonusCoins;
          await creditCoins(
            payment.userId,
            totalCoins,
            WalletTransactionType.PURCHASE,
            { orderId: payment.orderId, packageId: payment.relatedId, provider: payment.provider, providerReferenceId },
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
    });

    import('../services/notification').then(({ notify }) => {
      notify({
        userId: payment.userId,
        type: payment.purpose === 'SUBSCRIPTION' ? 'SUBSCRIPTION' : 'COIN_PURCHASE',
        title: payment.purpose === 'SUBSCRIPTION' ? 'Subscription Active' : 'Payment Successful',
        body: payment.purpose === 'SUBSCRIPTION' ? 'Your premium subscription is now active.' : 'Your wallet has been successfully recharged.',
        data: { orderId: payment.orderId }
      }).catch(() => {});
    });

    return res.json({ success: true, message: 'Payment verified and credited' });
  }

  // Handle failed/declined/cancelled states
  if (state === 'FAILED' || code === 'PAYMENT_ERROR') {
    await prisma.payment.updateMany({
      where: { id: payment.id, status: { not: PaymentStatus.COMPLETED } },
      data: { status: PaymentStatus.FAILED },
    });
    return res.json({ success: true, message: 'Payment marked as failed' });
  }

  // Acknowledge other states (e.g. PENDING) without crediting
  return res.json({ success: true, message: 'Webhook received' });
}));
