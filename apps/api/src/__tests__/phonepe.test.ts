import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initDynamicQR } from '../services/phonepe';
import { config } from '../config';

// Mock config
vi.mock('../config', () => ({
  config: {
    phonepeMerchantId: 'MERCHANT123',
    phonepeSaltKey: 'SALT_KEY',
    phonepeSaltIndex: '1',
    phonepeEnv: 'PROD',
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('PhonePe Dynamic QR Init', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates correct payload and checksum for PhonePe', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        code: 'SUCCESS',
        message: 'QR generated',
        data: {
          transactionId: 'TXN123',
          merchantId: 'MERCHANT123',
          amount: 1000,
          qrString: 'upi://pay?pa=MERCHANT123',
        },
      }),
    });

    const result = await initDynamicQR({
      transactionId: 'TXN123',
      amountPaise: 1000,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    
    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[0]).toBe('https://mercury-t2.phonepe.com/v3/qr/init');
    expect(fetchCall[1].method).toBe('POST');
    
    // Check headers
    const headers = fetchCall[1].headers;
    expect(headers['X-VERIFY']).toBeDefined();
    expect(headers['Content-Type']).toBe('application/json');

    // Verify response
    expect(result.transactionId).toBe('TXN123');
    expect(result.qrString).toBe('upi://pay?pa=MERCHANT123');
  });

  it('throws when PhonePe API returns non-2xx', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    await expect(initDynamicQR({
      transactionId: 'TXN123',
      amountPaise: 1000,
    })).rejects.toThrow('PhonePe API failed: 500 Internal Server Error');
  });

  it('throws when PhonePe API returns success: false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        code: 'BAD_REQUEST',
        message: 'Invalid amount',
      }),
    });

    await expect(initDynamicQR({
      transactionId: 'TXN123',
      amountPaise: 1000,
    })).rejects.toThrow('Invalid amount');
  });

  it('handles missing config safely', async () => {
    // Temporarily unset config
    const originalMerchant = config.phonepeMerchantId;
    // @ts-ignore
    config.phonepeMerchantId = '';

    await expect(initDynamicQR({
      transactionId: 'TXN123',
      amountPaise: 1000,
    })).rejects.toThrow('PhonePe is not properly configured');

    // @ts-ignore
    config.phonepeMerchantId = originalMerchant;
  });
});


  describe('checkPaymentStatus', () => {
    it('checks status correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          code: 'PAYMENT_SUCCESS',
          message: 'Success',
          data: { merchantId: 'MERCHANT123', transactionId: 'TXN1', amount: 1000, state: 'COMPLETED' },
        }),
      });
      const res = await (await import('../services/phonepe')).checkPaymentStatus('TXN1');
      expect(res.success).toBe(true);
      expect(res.data.state).toBe('COMPLETED');
    });
  });
