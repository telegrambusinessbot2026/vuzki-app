import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const otpFindFirst = vi.fn();
  const otpUpdate = vi.fn();
  const otpUpdateMany = vi.fn();
  const otpFindMany = vi.fn();
  const otpCreate = vi.fn();
  const otpCodeHash = vi.fn();
  return { otpFindFirst, otpUpdate, otpUpdateMany, otpFindMany, otpCreate, otpCodeHash };
});

vi.mock('@vuzki/database', () => ({
  prisma: {
    otp: {
      findFirst: mocks.otpFindFirst,
      update: mocks.otpUpdate,
      updateMany: mocks.otpUpdateMany,
      findMany: mocks.otpFindMany,
      create: mocks.otpCreate,
    },
    otpCodeHash: mocks.otpCodeHash,
  },
}));

import { verifyOtp } from '@/services/otp';
import crypto from 'crypto';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('otp: verifyOtp brute-force protection', () => {
  // New OTP records: only codeHash verification, no plaintext fallback.
  // verifyOtp calls findFirst once with codeHash. If not found, incrementAttempts
  // calls findFirst again (without codeHash), then otpUpdate, then otpUpdateMany if at cap.

  it('correct code hash consumes OTP', async () => {
    const correctCode = '123456';
    const correctHash = crypto.createHash('sha256').update(correctCode).digest('hex');
    mocks.otpCodeHash.mockResolvedValueOnce(correctHash);
    // verifyOtp findFirst with codeHash returns the OTP
    mocks.otpFindFirst.mockResolvedValueOnce({
      id: 'o1',
      identifier: 'a',
      purpose: 'login',
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });
    // otpUpdate called once to consume the OTP
    mocks.otpUpdate.mockResolvedValue({ id: 'o1', consumed: true });

    await expect(verifyOtp('a', correctCode, 'login')).resolves.toBe(true);
    expect(mocks.otpUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.otpUpdate).toHaveBeenCalledWith({ where: { id: 'o1' }, data: { consumed: true } });
    expect(mocks.otpUpdateMany).not.toHaveBeenCalled();
  });

  it('wrong code hash rejects OTP', async () => {
    // verifyOtp findFirst with codeHash returns null
    mocks.otpFindFirst
      .mockResolvedValueOnce(null) // verifyOtp: hash lookup returns null
      .mockResolvedValueOnce({ id: 'o1', identifier: 'a', purpose: 'login', attempts: 0 }); // incrementAttempts: finds OTP by identifier+purpose+consumed=false
    // incrementAttempts calls otpUpdate to increment attempts 0->1
    mocks.otpUpdate.mockResolvedValue({ id: 'o1', attempts: 1 });

    await expect(verifyOtp('a', '000000', 'login')).rejects.toThrow('INVALID_OTP');
    expect(mocks.otpUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.otpUpdateMany).not.toHaveBeenCalled();
  });

  it('wrong code hash caps all OTPs when at budget', async () => {
    // verifyOtp findFirst returns null -> incrementAttempts finds OTP with attempts=4, increments to 5 (at cap) -> otpUpdate called once, otpUpdateMany called once to cap all
    mocks.otpFindFirst
      .mockResolvedValueOnce(null) // verifyOtp: hash lookup returns null
      .mockResolvedValueOnce({ id: 'o1', identifier: 'a', purpose: 'login', attempts: 4 }); // incrementAttempts: finds OTP with attempts=4
    mocks.otpUpdate.mockResolvedValue({ id: 'o1', attempts: 5 });

    await expect(verifyOtp('a', '000000', 'login')).rejects.toThrow('INVALID_OTP');
    expect(mocks.otpUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.otpUpdateMany).toHaveBeenCalledTimes(1);
    expect(mocks.otpUpdateMany).toHaveBeenCalledWith({
      where: { identifier: 'a', purpose: 'login', consumed: false },
      data: { attempts: { set: 5 } },
    });
  });

  it('exhausted attempts throws OTP_MAX_ATTEMPTS', async () => {
    // OTP with attempts=5 already exists. verifyOtp: hash lookup finds OTP (hash matches), checks attempts >= OTP_MAX_ATTEMPTS, throws.
    mocks.otpFindFirst.mockResolvedValueOnce({ id: 'o1', identifier: 'a', purpose: 'login', attempts: 5 });

    await expect(verifyOtp('a', '123456', 'login')).rejects.toThrow('OTP_MAX_ATTEMPTS');
    expect(mocks.otpUpdate).not.toHaveBeenCalled();
  });

  it('expired OTP throws OTP_EXPIRED', async () => {
    const pastDate = new Date(Date.now() - 60_000);
    mocks.otpFindFirst.mockResolvedValueOnce({
      id: 'o1',
      identifier: 'a',
      purpose: 'login',
      attempts: 0,
      expiresAt: pastDate,
    });
    await expect(verifyOtp('a', '123456', 'login')).rejects.toThrow('OTP_EXPIRED');
    expect(mocks.otpUpdate).not.toHaveBeenCalled();
  });
});
