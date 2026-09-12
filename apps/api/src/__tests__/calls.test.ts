import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks must be created with vi.hoisted (vi.mock factory is hoisted) ---
const mocks = vi.hoisted(() => {
  const callFindUnique = vi.fn();
  const callUpdateMany = vi.fn();
  const userFindUnique = vi.fn();
  const userUpdate = vi.fn();
  const walletFindUnique = vi.fn();
  const walletUpdateMany = vi.fn();
  const walletTxCreate = vi.fn();
  const walletTxFindUnique = vi.fn();
  const creatorEarningCreate = vi.fn();
  const tx = {
    call: { updateMany: callUpdateMany },
    user: { findUnique: userFindUnique, update: userUpdate },
    wallet: { findUnique: walletFindUnique, updateMany: walletUpdateMany },
    walletTransaction: { create: walletTxCreate, findUnique: walletTxFindUnique },
    creatorEarning: { create: creatorEarningCreate },
  };
  return { callFindUnique, callUpdateMany, userFindUnique, userUpdate, walletFindUnique, walletUpdateMany, walletTxCreate, walletTxFindUnique, creatorEarningCreate, tx };
});

vi.mock('@vuzki/database', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (t: any) => Promise<unknown>) => fn(mocks.tx)),
    call: { findUnique: mocks.callFindUnique },
    user: { findUnique: vi.fn(), update: vi.fn() },
    wallet: { findUnique: vi.fn() },
    walletTransaction: { findUnique: vi.fn() },
  },
}));

import { endCall } from '@/services/calls';
import { CallType } from '@vuzki/shared';

const ongoingCall = {
  id: 'call1',
  callerId: 'caller1',
  receiverId: 'receiver1',
  type: CallType.VIDEO,
  status: 'ONGOING',
  startedAt: new Date(Date.now() - 120000), // 2 min ago
  answeredAt: new Date(Date.now() - 120000),
  createdAt: new Date(Date.now() - 130000),
  costCoins: 10,
  creatorEarnings: 0,
  quality: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.callFindUnique.mockResolvedValue(ongoingCall);
  mocks.callUpdateMany.mockResolvedValue({ count: 1 });
  mocks.walletFindUnique.mockResolvedValue({ id: 'w1', userId: 'caller1', balance: 1000 });
  mocks.walletUpdateMany.mockResolvedValue({ count: 1 });
  mocks.walletTxFindUnique.mockResolvedValue(null);
  mocks.walletTxCreate.mockResolvedValue({ id: 'wtx1', amount: -120 });
  // receiver is NOT a creator, so no creator earning is recorded
  mocks.userFindUnique.mockResolvedValue({ id: 'receiver1', isCreator: false });
});

describe('calls: endCall atomic single-billing', () => {
  it('bills the caller once and records the wallet debit on a successful end', async () => {
    const res = await endCall('call1');

    expect(res.call.status).toBe('COMPLETED');
    // The atomic claim guard is used
    expect(mocks.callUpdateMany).toHaveBeenCalledTimes(1);
    expect(mocks.callUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'call1' }),
      })
    );
    // caller wallet debited exactly once
    expect(mocks.walletUpdateMany).toHaveBeenCalledTimes(1);
    expect(mocks.walletTxCreate).toHaveBeenCalledTimes(1);
    expect(mocks.walletTxCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ idempotencyKey: 'CALL:call1' }),
      })
    );
  });

  it('does NOT bill again when a duplicate/concurrent end loses the claim (0 rows updated)', async () => {
    // Simulate a concurrent delivery that already ended + billed the call.
    mocks.callUpdateMany.mockResolvedValue({ count: 0 });

    const res = await endCall('call1');

    expect(res.alreadyCompleted).toBe(true);
    // No second debit: wallet and ledger were untouched.
    expect(mocks.walletUpdateMany).not.toHaveBeenCalled();
    expect(mocks.walletTxCreate).not.toHaveBeenCalled();
  });

  it('skips debiting when the call lasted 0 billable seconds', async () => {
    mocks.callFindUnique.mockResolvedValue({
      ...ongoingCall,
      startedAt: new Date(), // no elapsed time
      answeredAt: new Date(),
      createdAt: new Date(),
    });

    const res = await endCall('call1');

    expect(res.call.status).toBe('COMPLETED');
    expect(mocks.walletUpdateMany).not.toHaveBeenCalled();
    expect(mocks.walletTxCreate).not.toHaveBeenCalled();
  });
});
