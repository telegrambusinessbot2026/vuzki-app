import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks must be created with vi.hoisted (vi.mock factory is hoisted) ---
const mocks = vi.hoisted(() => {
  const callFindUnique = vi.fn();
  const callUpdateMany = vi.fn();
  const callCount = vi.fn();
  const blockCount = vi.fn();
  const callParticipantUpsert = vi.fn();
  const userFindUnique = vi.fn();
  const userUpdate = vi.fn();
  const userFindUniqueTop = vi.fn();
  const userUpdateTop = vi.fn();
  const walletFindUnique = vi.fn();
  const walletUpdateMany = vi.fn();
  const walletTxCreate = vi.fn();
  const walletTxFindUnique = vi.fn();
  const creatorEarningCreate = vi.fn();
  const tx = {
    call: { updateMany: callUpdateMany, count: callCount },
    callParticipant: { upsert: callParticipantUpsert },
    user: { findUnique: userFindUnique, update: userUpdate },
    wallet: { findUnique: walletFindUnique, updateMany: walletUpdateMany },
    walletTransaction: { create: walletTxCreate, findUnique: walletTxFindUnique },
    creatorEarning: { create: creatorEarningCreate },
  };
  return {
    callFindUnique,
    callUpdateMany,
    callCount,
    blockCount,
    callParticipantUpsert,
    userFindUnique,
    userUpdate,
    userFindUniqueTop,
    userUpdateTop,
    walletFindUnique,
    walletUpdateMany,
    walletTxCreate,
    walletTxFindUnique,
    creatorEarningCreate,
    tx,
  };
});

vi.mock('@vuzki/database', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (t: any) => Promise<unknown>) => fn(mocks.tx)),
    call: {
      findUnique: mocks.callFindUnique,
      updateMany: mocks.callUpdateMany,
      count: mocks.callCount,
    },
    callParticipant: { upsert: mocks.callParticipantUpsert },
    block: { count: mocks.blockCount },
    user: { findUnique: mocks.userFindUniqueTop, update: mocks.userUpdateTop },
    wallet: { findUnique: mocks.walletFindUnique },
    walletTransaction: { findUnique: mocks.walletTxFindUnique },
  },
}));

import { endCall, cancelCall, missCall, acceptCall, initiateCall, markCallConnected } from '@/services/calls';
import { CallType, CallStatus } from '@vuzki/shared';

const connectedCall = {
  id: 'call1',
  callerId: 'caller1',
  receiverId: 'receiver1',
  type: CallType.VIDEO,
  status: 'ONGOING',
  startedAt: new Date(Date.now() - 120000), // accepted 2 min ago
  answeredAt: new Date(Date.now() - 120000),
  connectedAt: new Date(Date.now() - 120000), // actually connected 2 min ago
  createdAt: new Date(Date.now() - 130000),
  costCoins: 10,
  creatorEarnings: 0,
  quality: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.callFindUnique.mockResolvedValue(connectedCall);
  mocks.callUpdateMany.mockResolvedValue({ count: 1 });
  mocks.callCount.mockResolvedValue(0);
  mocks.blockCount.mockResolvedValue(0);
  mocks.callParticipantUpsert.mockResolvedValue({ id: 'cp1' });
  mocks.walletFindUnique.mockResolvedValue({ id: 'w1', userId: 'caller1', balance: 1000 });
  mocks.walletUpdateMany.mockResolvedValue({ count: 1 });
  mocks.walletTxFindUnique.mockResolvedValue(null);
  mocks.walletTxCreate.mockResolvedValue({ id: 'wtx1', amount: -120 });
  // receiver is NOT a creator, so no creator earning is recorded
  mocks.userFindUnique.mockResolvedValue({ id: 'receiver1', isCreator: false });
  mocks.userFindUniqueTop.mockResolvedValue({ id: 'receiver1', isCreator: false });
  mocks.userUpdate.mockResolvedValue({});
  mocks.userUpdateTop.mockResolvedValue({});
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

  it('NO BILLING before CONNECTED: never charges an accepted-but-not-connected call', async () => {
    // A call that was accepted (ONGOING) but whose peers never connected:
    // connectedAt stays null, so billable duration is 0 regardless of how long
    // it spent ACCEPTED/RINGING.
    mocks.callFindUnique.mockResolvedValue({ ...connectedCall, connectedAt: null });

    const res = await endCall('call1');

    expect(res.call.status).toBe('COMPLETED');
    expect(res.call.durationSeconds).toBe(0);
    expect(mocks.walletUpdateMany).not.toHaveBeenCalled();
    expect(mocks.walletTxCreate).not.toHaveBeenCalled();
  });

  it('NO BILLING before CONNECTED: an unanswered/cancelled-while-ringing call never bills', async () => {
    // Even if the ringing phase lasted many minutes, a call that was never
    // connected must not be charged as connected usage.
    mocks.callFindUnique.mockResolvedValue({
      ...connectedCall,
      status: 'RINGING',
      startedAt: null,
      answeredAt: null,
      connectedAt: null,
      createdAt: new Date(Date.now() - 600000), // ringing for 10 min
    });

    const res = await endCall('call1');

    expect(res.call.status).toBe('COMPLETED');
    expect(res.call.durationSeconds).toBe(0);
    expect(mocks.walletUpdateMany).not.toHaveBeenCalled();
    expect(mocks.walletTxCreate).not.toHaveBeenCalled();
  });

  it('billing anchors on CONNECTED time, not ACCEPT/time', async () => {
    // Accepted 10 minutes ago but only connected 30s ago -> bills ~30s,
    // never 10 minutes. (Still floors to the 1-minute minimum price.)
    mocks.callFindUnique.mockResolvedValue({
      ...connectedCall,
      startedAt: new Date(Date.now() - 600000),
      answeredAt: new Date(Date.now() - 600000),
      connectedAt: new Date(Date.now() - 30000),
      createdAt: new Date(Date.now() - 610000),
    });

    const res = await endCall('call1');

    expect(res.call.durationSeconds).toBeGreaterThanOrEqual(30);
    expect(res.call.durationSeconds).toBeLessThan(40);
    // exactly one debit, metadata carries the CONNECTED-anchored duration
    expect(mocks.walletTxCreate).toHaveBeenCalledTimes(1);
    expect(mocks.walletTxCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({ durationSeconds: expect.any(Number) }),
        }),
      })
    );
  });

  it('skips debiting when the call lasted 0 billable seconds', async () => {
    mocks.callFindUnique.mockResolvedValue({
      ...connectedCall,
      connectedAt: new Date(), // connected literally now
    });

    const res = await endCall('call1');

    expect(res.call.status).toBe('COMPLETED');
    expect(mocks.walletUpdateMany).not.toHaveBeenCalled();
    expect(mocks.walletTxCreate).not.toHaveBeenCalled();
  });
});

describe('calls: cancel while ringing (lifecycle safety)', () => {
  it('cancelCall only transitions an unanswered RINGING call to CANCELLED', async () => {
    mocks.callFindUnique.mockResolvedValue({
      ...connectedCall,
      status: 'RINGING',
      startedAt: null,
      answeredAt: null,
      connectedAt: null,
    });

    const res = await cancelCall('call1', 'caller1');

    expect(res.status).toBe('CANCELLED');
    expect(res.endedAt).toBeInstanceOf(Date);
    expect(mocks.callUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'call1', status: 'RINGING' }) })
    );
  });

  it('cancelCall is idempotent: duplicate cancels are safe no-ops', async () => {
    mocks.callFindUnique.mockResolvedValue({ ...connectedCall, status: 'CANCELLED', connectedAt: null });
    // race lost -> the call already left RINGING
    mocks.callUpdateMany.mockResolvedValue({ count: 0 });

    const res = await cancelCall('call1', 'caller1');

    expect(res.alreadyCompleted).toBe(true);
    expect(mocks.callUpdateMany).toHaveBeenCalledTimes(1);
  });

  it('cancelCall refuses non-owners', async () => {
    mocks.callFindUnique.mockResolvedValue({ ...connectedCall, status: 'RINGING', connectedAt: null });
    await expect(cancelCall('call1', 'receiver1')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mocks.callUpdateMany).not.toHaveBeenCalled();
  });
});

describe('calls: missed-call idempotency', () => {
  it('missCall only transitions a RINGING call to MISSED', async () => {
    mocks.callFindUnique.mockResolvedValue({
      ...connectedCall,
      status: 'RINGING',
      startedAt: null,
      answeredAt: null,
      connectedAt: null,
    });

    const res = await missCall('call1');

    expect(res?.status).toBe('MISSED');
    expect(mocks.callUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'call1', status: 'RINGING' }) })
    );
  });

  it('missCall does not clobber a call that was meanwhile accepted', async () => {
    mocks.callFindUnique.mockResolvedValue({ ...connectedCall, status: 'ONGOING' });
    mocks.callUpdateMany.mockResolvedValue({ count: 0 });

    const res = await missCall('call1');

    expect(res?.alreadyCompleted).toBe(true);
  });
});

describe('calls: BUSY / in-call protection', () => {
  it('acceptCall rejects when receiver is already inside another active call', async () => {
    mocks.callFindUnique.mockResolvedValue({ ...connectedCall, status: 'RINGING' });
    mocks.callCount.mockResolvedValue(1); // receiver already in another call

    await expect(acceptCall('call1', 'receiver1')).rejects.toMatchObject({ code: 'BUSY' });
    // the claim never happened
    expect(mocks.callUpdateMany).not.toHaveBeenCalled();
  });

  it('acceptCall advances RINGING -> ONGOING and marks receiver busy', async () => {
    mocks.callFindUnique.mockResolvedValue({ ...connectedCall, status: 'RINGING' });
    mocks.callCount.mockResolvedValue(0);

    const res = await acceptCall('call1', 'receiver1');

    expect(res.status).toBe('ONGOING');
    expect(mocks.callUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'call1', status: 'RINGING' }) })
    );
    expect(mocks.callParticipantUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ callId_userId: { callId: 'call1', userId: 'receiver1' } }),
      })
    );
    expect(mocks.userUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { creatorStatus: 'BUSY' } }));
  });

  it('acceptCall is idempotent under double-accept (race lost = no-op)', async () => {
    mocks.callFindUnique.mockResolvedValue({ ...connectedCall, status: 'RINGING' });
    mocks.callCount.mockResolvedValue(0);
    mocks.callUpdateMany.mockResolvedValue({ count: 0 });

    const res = await acceptCall('call1', 'receiver1');

    expect(res.alreadyCompleted).toBe(true);
  });

  it('initiateCall refuses to ring a receiver already in a live call', async () => {
    mocks.userFindUniqueTop.mockResolvedValue({
      id: 'receiver1',
      status: 'ACTIVE',
      isCreator: true,
      creatorStatus: 'AVAILABLE',
      blocksReceived: [],
    });
    mocks.callCount.mockResolvedValue(1); // receiver has a live call in the DB

    await expect(
      initiateCall({ callerId: 'caller1', receiverId: 'receiver1', type: CallType.AUDIO })
    ).rejects.toMatchObject({ code: 'RECEIVER_BUSY' });
  });
});

describe('calls: markCallConnected persists the CONNECTED anchor exactly once', () => {
  it('writes connectedAt only when the call is ONGOING and not yet connected', async () => {
    await markCallConnected('call1');
    expect(mocks.callUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'call1', status: 'ONGOING', connectedAt: null }) })
    );
  });

  it('leaves the anchor untouched for a RINGING call (nothing to bill yet)', async () => {
    mocks.callFindUnique.mockResolvedValue({ ...connectedCall, status: 'RINGING' });
    await markCallConnected('call1');
    expect(mocks.callUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'call1', status: 'ONGOING' }) })
    );
  });
});

describe('calls: status enum sanity', () => {
  it('exposes all lifecycle statuses used by the realtime layer', () => {
    expect(CallStatus.RINGING).toBe('RINGING');
    expect(CallStatus.ONGOING).toBe('ONGOING');
    expect(CallStatus.COMPLETED).toBe('COMPLETED');
    expect(CallStatus.CANCELLED).toBe('CANCELLED');
    expect(CallStatus.MISSED).toBe('MISSED');
    expect(CallStatus.BUSY).toBe('BUSY');
  });
});