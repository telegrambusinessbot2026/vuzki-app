import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@vuzki/database', () => ({
  prisma: {
    user: { update: vi.fn(async () => ({})) },
  },
}));

import {
  createCallSession,
  getCallSession,
  addPeer,
  setPeerConnection,
  updateCallStatus,
  endCallSession,
  cleanupCallSession,
  otherPeer,
  isCallActive,
} from '../realtime/call-tracker';
import { CallType, CallConnectionStatus } from '@vuzki/shared';
import { computeCallBilling, getCallRate, getCreatorShare } from '../services/calls';

describe('call-tracker state machine', () => {
  beforeEach(async () => {
    await cleanupCallSession('call-a');
  });

  it('starts RINGING with only the caller peer', async () => {
    const s = await createCallSession({ callId: 'call-a', type: CallType.AUDIO, callerId: 'u1', receiverId: 'u2' });
    expect(s.status).toBe('RINGING');
    expect(s.peers['u1'].role).toBe('CALLER');
    expect(s.peers['u2']).toBeUndefined();
  });

  it('accept -> CONNECTED when both peers report connected', async () => {
    await createCallSession({ callId: 'call-a', type: CallType.VIDEO, callerId: 'u1', receiverId: 'u2' });
    await addPeer('call-a', { userId: 'u2', role: 'RECEIVER', connection: CallConnectionStatus.CONNECTING, joinedAt: Date.now(), lastActiveAt: Date.now() });
    await updateCallStatus('call-a', 'ACCEPTED');

    // caller connecting, receiver connecting -> ACEPTED/CONNECTING
    let s = await setPeerConnection('call-a', 'u1', CallConnectionStatus.CONNECTED);
    expect(s?.peers['u1'].connection).toBe(CallConnectionStatus.CONNECTED);
    // not both connected yet
    const mid = await getCallSession('call-a');
    expect(mid?.status === 'CONNECTED' || mid?.status === 'ACCEPTED').toBe(true);

    // receiver connected -> both connected -> CONNECTED
    s = await setPeerConnection('call-a', 'u2', CallConnectionStatus.CONNECTED);
    expect(s?.status).toBe('CONNECTED');
    expect(s?.connectedAt).toBeTruthy();
  });

  it('reconnects: drops to RECONNECTING then returns to CONNECTED', async () => {
    await createCallSession({ callId: 'call-a', type: CallType.AUDIO, callerId: 'u1', receiverId: 'u2' });
    await addPeer('call-a', { userId: 'u2', role: 'RECEIVER', connection: CallConnectionStatus.CONNECTED, joinedAt: Date.now(), lastActiveAt: Date.now() });
    await updateCallStatus('call-a', 'CONNECTED');

    await setPeerConnection('call-a', 'u2', CallConnectionStatus.RECONNECTING);
    let s = await getCallSession('call-a');
    expect(s?.status).toBe('RECONNECTING');
    expect(s?.reconnectDeadlineMs).toBeTruthy();

    await setPeerConnection('call-a', 'u2', CallConnectionStatus.CONNECTED);
    s = await getCallSession('call-a');
    expect(s?.status).toBe('CONNECTED');
    expect(s?.reconnectDeadlineMs).toBeUndefined();
  });

  it('ends the session and is not active afterwards', async () => {
    await createCallSession({ callId: 'call-a', type: CallType.AUDIO, callerId: 'u1', receiverId: 'u2' });
    expect(isCallActive(await getCallSession('call-a'))).toBe(true);
    await updateCallStatus('call-a', 'ACCEPTED');
    const s = await endCallSession('call-a');
    expect(s?.status).toBe('ENDED');
    expect(isCallActive(await getCallSession('call-a'))).toBe(false);
  });

  it('otherPeer resolves caller/receiver correctly', async () => {
    const s = await createCallSession({ callId: 'call-a', type: CallType.AUDIO, callerId: 'u1', receiverId: 'u2' });
    expect(otherPeer(s, 'u1')).toBe('u2');
    expect(otherPeer(s, 'u2')).toBe('u1');
  });
});

describe('call billing', () => {
  it('computeCallBilling bills >1 min at per-minute rate and splits creator share', () => {
    const rate = getCallRate(CallType.VIDEO);
    const billing = computeCallBilling(CallType.VIDEO, 150); // 2.5 min -> 3 min
    expect(billing.durationMinutes).toBe(3);
    expect(billing.costCoins).toBe(3 * rate);
    expect(billing.platformFeeCoins + billing.creatorCoins).toBe(billing.costCoins);
    const share = getCreatorShare(CallType.VIDEO);
    expect(billing.creatorCoins).toBe(billing.costCoins * share);
  });

  it('short call still bills minimum 1 minute', () => {
    const billing = computeCallBilling(CallType.AUDIO, 5);
    expect(billing.durationMinutes).toBe(1);
    expect(billing.costCoins).toBe(getCallRate(CallType.AUDIO));
  });
});
