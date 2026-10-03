import crypto from 'crypto';
import { config } from '../config';
import { ApiErrorResponse } from '@vuzki/types';

export interface PhonePeQRInitResult {
  transactionId: string;
  merchantId: string;
  amount: number;
  qrString: string;
  code: string;
  message: string;
}

export async function initDynamicQR(params: {
  transactionId: string;
  amountPaise: number;
  expiresIn?: number;
}): Promise<PhonePeQRInitResult> {
  const {
    phonepeMerchantId,
    phonepeSaltKey,
    phonepeSaltIndex,
    phonepeStoreId,
    phonepeTerminalId,
    baseUrl
  } = config;

  if (!phonepeMerchantId || !phonepeSaltKey || !phonepeSaltIndex) {
    throw new ApiErrorResponse(500, 'PHONEPE_CONFIG_ERROR', 'PhonePe is not properly configured');
  }

  const payload: any = {
    merchantId: phonepeMerchantId,
    transactionId: params.transactionId,
    merchantOrderId: params.transactionId,
    amount: params.amountPaise,
    expiresIn: params.expiresIn || 1800,
  };

  if (phonepeStoreId) payload.storeId = phonepeStoreId;
  if (phonepeTerminalId) payload.terminalId = phonepeTerminalId;
  if (baseUrl) payload['X-CALLBACK-URL'] = `${baseUrl}/api/v1/admin/payments/webhook`;

  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
  const endpoint = '/v3/qr/init';
  
  const checksumString = base64Payload + endpoint + phonepeSaltKey;
  const sha256 = crypto.createHash('sha256').update(checksumString).digest('hex');
  const xVerify = sha256 + '###' + phonepeSaltIndex;

  const url = 'https://mercury-t2.phonepe.com/v3/qr/init';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-VERIFY': xVerify,
    },
    body: JSON.stringify({ request: base64Payload }),
  });

  if (!response.ok) {
    let errText = await response.text().catch(() => 'Unknown Error');
    throw new ApiErrorResponse(502, 'PHONEPE_API_ERROR', `PhonePe API failed: ${response.status} ${errText}`);
  }

  const data = (await response.json()) as any;
  if (!data.success) {
    throw new ApiErrorResponse(502, 'PHONEPE_PAYMENT_FAILED', data.message || 'QR Init Failed');
  }

  return {
    transactionId: data.data.transactionId,
    merchantId: data.data.merchantId,
    amount: data.data.amount,
    qrString: data.data.qrString,
    code: data.code,
    message: data.message,
  };
}

export interface PhonePeStatusResult {
  success: boolean;
  code: string;
  message: string;
  data: {
    merchantId: string;
    transactionId: string;
    amount: number;
    state: string;
    responseCode: string;
  };
}

export function verifyPhonePeWebhookSignature(base64Payload: string, providedXVerify: string): boolean {
  if (!base64Payload || !providedXVerify) return false;
  const { phonepeSaltKey, phonepeSaltIndex } = config;
  if (!phonepeSaltKey || !phonepeSaltIndex) return false;
  const checksumString = base64Payload + phonepeSaltKey;
  const sha256 = crypto.createHash('sha256').update(checksumString).digest('hex');
  const expected = sha256 + '###' + phonepeSaltIndex;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(providedXVerify));
  } catch (e) {
    return expected === providedXVerify;
  }
}

export async function checkPaymentStatus(transactionId: string): Promise<PhonePeStatusResult> {
  const { phonepeMerchantId, phonepeSaltKey, phonepeSaltIndex } = config;
  if (!phonepeMerchantId || !phonepeSaltKey || !phonepeSaltIndex) {
    throw new ApiErrorResponse(500, 'PHONEPE_CONFIG_ERROR', 'PhonePe is not properly configured');
  }
  const endpoint = `/v3/transaction/${phonepeMerchantId}/${transactionId}/status`;
  const checksumString = endpoint + phonepeSaltKey;
  const sha256 = crypto.createHash('sha256').update(checksumString).digest('hex');
  const xVerify = sha256 + '###' + phonepeSaltIndex;
  const url = `https://mercury-t2.phonepe.com${endpoint}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-VERIFY': xVerify,
      'X-MERCHANT-ID': phonepeMerchantId,
    },
  });

  if (!response.ok) {
    let errText = await response.text().catch(() => 'Unknown Error');
    throw new ApiErrorResponse(502, 'PHONEPE_API_ERROR', `PhonePe API failed: ${response.status} ${errText}`);
  }

  const data = (await response.json()) as any;
  return data as PhonePeStatusResult;
}

