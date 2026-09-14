import { config } from '../config';
import { prisma } from '@vuzki/database';
import crypto from 'crypto';
import { PaymentProvider, PaymentStatus, WalletTransactionType } from '@vuzki/shared';
import { ApiErrorResponse } from '@vuzki/types';
import { creditCoins, debitCoins } from './wallet';
import { checkPaymentAnomalies } from './fraud';
import { generateToken } from '@vuzki/utils';

// Server-side payment orchestration.
// Production must use a real provider (Razorpay/Cashfree/Stripe).
// This layer NEVER trusts client payment success.

// Normalize a provider string to the canonical (uppercase) enum value so that
// comparisons against PaymentProvider.* are robust regardless of whether the
// caller/env supplied the value in lower, upper or mixed case (e.g. config's
// documented default is lowercase 'demo' while the enum constant is 'DEMO').
function normalizeProvider(p?: string | null): string | undefined {
  if (!p) return undefined;
  const up = p.toUpperCase();
  return up === PaymentProvider.DEMO ||
    up === PaymentProvider.RAZORPAY ||
    up === PaymentProvider.PHONEPE ||
    up === PaymentProvider.STRIPE ||
    up === PaymentProvider.CASHFREE ||
    up === PaymentProvider.PAYPAL
    ? up
    : undefined;
}

// True only when the server is explicitly configured for demo fulfillment.
function serverIsDemo(): boolean {
  return config.demoMode || normalizeProvider(config.paymentProvider) === PaymentProvider.DEMO;
}

// Verify webhook signature for the given provider.
// Returns true if valid, false otherwise. Never throws - callers must check
// the return value and reject invalid webhooks.
function verifyWebhookSignature(provider: string, payload: string, signature: string | undefined): boolean {
  const providerUpper = provider.toUpperCase();
  let hmac;
  let digest: string;
  switch (providerUpper) {
    case PaymentProvider.RAZORPAY:
      // Razorpay signature: sha256=<hex_hmac> using app secret
      if (!signature) return false;
      hmac = crypto.createHmac('sha256', config.razorpayKeySecret || '');
      hmac.update(payload);
      digest = hmac.digest('hex');
      return signature === digest;
    case PaymentProvider.PHONEPE:
      // PhonePe callback signature: phonepepay_sha256=<hex_hmac>
      // using salt_key and salt_index from config
      if (!signature || !config.phonepeSaltKey || !config.phonepeSaltIndex) return false;
      const message = payload + config.phonepeSaltKey;
      hmac = crypto.createHmac('sha256', config.phonepeSaltKey);
      hmac.update(message);
      digest = hmac.digest('hex');
      return signature.toLowerCase() === digest.toLowerCase();
    case PaymentProvider.STRIPE:
      // Stripe signature: t={timestamp}, v1=<signature>
      // sig_header format: t={timestamp},v1=<signature>
      if (!signature) return false;
      // Extract signature from the Stripe webhook signature header
      // Format: "t={timestamp},v1={signature}"
      const parts = signature.split(',');
      if (parts.length !== 2) return false;
      const timestamp = parts[0].split('=')[1];
      const v1 = parts[1].split('=')[1];
      if (!timestamp || !v1) return false;
      const stripePayload = `${timestamp}.${payload}`;
      hmac = crypto.createHmac('sha256', config.stripeSecretKey || '');
      digest = hmac.digest('hex');
      return digest === v1;
    case PaymentProvider.CASHFREE:
      // Cashfree webhook signature verification
      // Uses merchant API key as secret
      if (!signature) return false;
      hmac = crypto.createHmac('sha256', config.cashfreeClientSecret || '');
      hmac.update(payload);
      digest = hmac.digest('hex');
      return signature.toLowerCase() === digest.toLowerCase();
    case PaymentProvider.PAYPAL:
      // PayPal webhook verification per PayPal's official server-side integration.
      // Steps:
      // 1. Extract webhook ID from the signature header/context
      // 2. POST to PayPal's validation endpoint with auth_algo/auth_enc/cert_id
      // 3. Decrypt and verify the event
      // For now, we validate the structure and reject obviously invalid webhooks.
      // Real PayPal verification requires the PayPal-API-CERT and the auth_enc
      // parameters which must be decrypted using the merchant's private key.
      if (!signature) return false;
      // Placeholder implementation: the full PayPal webhook verification
      // requires the merchant's PayPal API certificate and the auth_enc token.
      // This is marked as CONFIGURATION REQUIRED - production must integrate
      // with PayPal's official Validate Webhooks API (POST to https://api-m.paypal.com/v1/notifications/validate)
      // with the appropriate certificates and authentication parameters.
      // For now, reject webhooks without a signature, and in production the
      // PayPal webhook validation must be fully implemented using the merchant's
      // API credentials and certificate.
      // TODO: Implement full PayPal webhook verification using PayPal's official API.
      // Returning true here would accept any webhook, which is a security risk.
      // This is deliberately left as a configuration boundary - production must
      // integrate with PayPal's Validate Webhooks API before going live.
      return false; // Reject until full PayPal verification is implemented
    case PaymentProvider.DEMO:
      // Demo has no signature verification - any webhook is "valid"
      return true;
    default:
      return false;
  }
}

export async function createCoinsOrder(userId: string, packageId: string, provider?: PaymentProvider) {
  const pkg = await prisma.coinPackage.findUnique({ where: { id: packageId } });
  if (!pkg || pkg.status !== 'ACTIVE') {
    throw new ApiErrorResponse(404, 'PACKAGE_NOT_FOUND', 'Coin package not found');
  }

  // If the caller omits a provider, default to the configured server provider.
  // Crucially, if the server is NOT in demo mode we will not honor a
  // client-supplied demo provider: the order is created under the active
  // provider so fulfillment can never be client-forced.
  const clientProviderRaw = (provider as string) || config.paymentProvider;
  const clientProviderN = normalizeProvider(clientProviderRaw);
  const serverProviderN = normalizeProvider(config.paymentProvider);

  // Resolve the active provider by its canonical (normalized) form so that
  // comparisons against PaymentProvider.* are case-robust. Store/return it in
  // the established lowercase convention (e.g. 'demo' / 'razorpay') to stay
  // consistent with existing data and the documented env values.
  let activeProviderN: string | undefined = clientProviderN || serverProviderN;
  if (!serverIsDemo() && (activeProviderN === PaymentProvider.DEMO || clientProviderN === undefined)) {
    activeProviderN = serverProviderN;
  }
  if (!activeProviderN) {
    throw new ApiErrorResponse(500, 'PAYMENT_PROVIDER_UNCONFIGURED', 'No payment provider configured');
  }
  const activeProvider = activeProviderN.toLowerCase() as PaymentProvider;
  const orderId = `VZ_${generateToken(6).toUpperCase()}`;
  const amount = Number(pkg.price);

  const payment = await prisma.payment.create({
    data: {
      userId,
      orderId,
      provider: activeProvider,
      amount,
      currency: pkg.currency,
      status: PaymentStatus.CREATED,
      purpose: 'COINS',
      relatedId: packageId,
      metadata: { coins: pkg.coins, bonusCoins: pkg.bonusCoins } as any,
    },
  });

  // Anti-fraud: raise a payment anomaly flag if the payer trips a rule
  // (excessive 24h payments / large first-time purchase). Non-blocking.
  await checkPaymentAnomalies({ userId, orderId, amount }).catch(() => undefined);

  let paymentPayload: Record<string, unknown> = {};

  // Demo provider: generate a mock checkout token
  if (activeProviderN === PaymentProvider.DEMO) {
    paymentPayload = {
      // In demo mode, the client calls /verify with demo:true
      requireVerification: true,
      amount,
      currency: pkg.currency,
      orderId,
    };
  } else if (activeProviderN === PaymentProvider.RAZORPAY && config.razorpayKeyId && config.razorpayKeySecret) {
    // Razorpay order creation
    paymentPayload = { key: config.razorpayKeyId, orderId, amount: Math.round(amount * 100), currency: pkg.currency, name: 'VUZKI Coins' };
  } else if (activeProviderN === PaymentProvider.PHONEPE && config.phonepeMerchantId && config.phonepeClientId && config.phonepeClientSecret) {
    // PhonePe order creation
    paymentPayload = { merchantId: config.phonepeMerchantId, orderId, amount: Math.round(amount * 100), currency: pkg.currency, name: 'VUZKI Coins' };
  } else if (activeProviderN === PaymentProvider.STRIPE && config.stripeSecretKey) {
    paymentPayload = { orderId, amount, currency: pkg.currency, purpose: 'coins' };
  } else if (activeProviderN === PaymentProvider.CASHFREE && config.cashfreeClientId) {
    paymentPayload = { orderId, amount, currency: pkg.currency, name: 'VUZKI Coins' };
  }

  return { orderId, amount, currency: pkg.currency, coins: pkg.coins + pkg.bonusCoins, provider: activeProvider, paymentPayload };
}

// Called by the payment provider webhook (server-to-server) - TRUSTED after signature verification.
export async function handlePaymentSuccess(params: { orderId: string; provider: string; providerPaymentId?: string; signature?: string; rawBody?: string }) {
  const payment = await prisma.payment.findUnique({ where: { orderId: params.orderId } });
  if (!payment) throw new ApiErrorResponse(404, 'ORDER_NOT_FOUND', 'Order not found');

  if (payment.status === PaymentStatus.COMPLETED) {
    // idempotent - already processed
    return { alreadyProcessed: true, orderId: payment.orderId };
  }

  // Verify webhook signature before processing - prevents forged webhooks
  const signatureValid = verifyWebhookSignature(params.provider, params.rawBody || '', params.signature);
  if (!signatureValid) {
    throw new ApiErrorResponse(400, 'INVALID_SIGNATURE', 'Invalid webhook signature');
  }

  return prisma.$transaction(async (tx) => {
    // Atomic claim: only transition a non-terminal payment to COMPLETED.
    // A concurrent/duplicate webhook affecting 0 rows does NOT credit twice.
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: { in: [PaymentStatus.CREATED, PaymentStatus.PENDING, PaymentStatus.AUTHORIZED] } },
      data: {
        status: PaymentStatus.COMPLETED,
        providerPaymentId: params.providerPaymentId || payment.providerPaymentId,
        webhookReceived: { ...((payment.webhookReceived as any) || {}), at: new Date().toISOString() } as any,
      },
    });
    if (claimed.count === 0) {
      return { alreadyProcessed: true, orderId: payment.orderId };
    }

    if (payment.purpose === 'COINS' && payment.relatedId) {
      const pkg = await tx.coinPackage.findUnique({ where: { id: payment.relatedId } });
      if (pkg) {
        const totalCoins = pkg.coins + pkg.bonusCoins;
        // Idempotent credit: keyed on the orderId so a replay can never
        // double-credit, even if the claim guard were raced. Runs in the
        // caller's transaction so the status update + credit commit together.
        await creditCoins(
          payment.userId,
          totalCoins,
          WalletTransactionType.PURCHASE,
          { orderId: payment.orderId, packageId: payment.relatedId, provider: params.provider },
          payment.orderId,
          `PAY:${payment.orderId}`,
          tx
        );
      }
    } else if (payment.purpose === 'SUBSCRIPTION' && payment.relatedId) {
      // Production subscription fulfillment: a successful (webhook-verified)
      // subscription payment MUST activate the user's subscription. Without
      // this the user would pay but never receive premium benefits.
      const { activateSubscription } = await import('../routes/subscriptions');
      const plan = await tx.subscriptionPlan.findUnique({ where: { id: payment.relatedId } });
      if (plan) {
        await activateSubscription(payment.userId, plan, payment.orderId, tx);
      }
    }

    return { success: true, orderId: payment.orderId };
  });
}

// Client-facing verification for demo/trusted flows.
// SECURITY: demo fulfillment is ONLY allowed when the server is configured for
// demo mode AND the stored order was actually created under the demo provider.
// A client can never force fulfillment of a real order by sending demo:true.
export async function verifyPaymentClient(params: { userId: string; orderId: string; provider: string; paymentId?: string; signature?: string; demo?: boolean }) {
  const payment = await prisma.payment.findUnique({ where: { orderId: params.orderId } });
  if (!payment) throw new ApiErrorResponse(404, 'ORDER_NOT_FOUND', 'Order not found');
  // OWNERSHIP: only the user who created the order may verify it. Without this
  // guard any authenticated user who learns an orderId could complete a foreign
  // order (or — in demo mode — have coins credited to a stranger's wallet).
  if (payment.userId !== params.userId) {
    throw new ApiErrorResponse(403, 'FORBIDDEN', 'This order does not belong to you');
  }
  if (payment.status === PaymentStatus.COMPLETED) {
    return { alreadyProcessed: true, orderId: payment.orderId };
  }

  // The order must have been created under the demo provider AND the server
  // must be in demo mode before we fulfill on a client claim.
  const demoEligible =
    normalizeProvider(payment.provider) === PaymentProvider.DEMO && serverIsDemo();

  if (demoEligible) {
    return handlePaymentSuccess({
      orderId: params.orderId,
      provider: payment.provider,
      providerPaymentId: params.paymentId,
      signature: params.signature,
    });
  }
  // In production: do NOT fulfill based on client claim; wait for webhook.
  return { requiresWebhook: true, orderId: params.orderId };
}
