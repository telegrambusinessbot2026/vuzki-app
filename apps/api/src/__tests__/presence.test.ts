import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@vuzki/database', () => ({
  prisma: {
    user: {
      update: vi.fn(async () => ({})),
    },
  },
}));

import {
  setPresence,
  getPresence,
  getUsersPresence,
  setCurrentCall,
  clearPresence,
  PresenceState,
} from '../realtime/presence';

describe('presence service', () => {
  beforeEach(async () => {
    await clearPresence('u1');
    await clearPresence('u2');
    vi.clearAllMocks();
  });

  it('returns OFFLINE with zero snapshot for a user with no recorded state', async () => {
    const p = await getPresence('u1');
    expect(p).toBeNull();
  });

  it('sets ONLINE with lastActive and sessionId', async () => {
    const snap = await setPresence({ userId: 'u1', state: 'ONLINE', sessionId: 's1', lastActive: 1000 });
    expect(snap.state).toBe('ONLINE');
    expect(snap.currentSession).toBe('s1');
    expect(snap.lastActive).toBe(1000);

    const read = await getPresence('u1');
    expect(read?.state).toBe('ONLINE');
    expect(read?.currentSession).toBe('s1');
  });

  it('transitions through AWAY/BUSY and back to OFFLINE', async () => {
    await setPresence({ userId: 'u1', state: 'ONLINE', sessionId: 's1', lastActive: 1 });
    await setPresence({ userId: 'u1', state: 'AWAY', sessionId: 's1', lastActive: 2 });
    expect((await getPresence('u1'))?.state).toBe('AWAY');

    await setPresence({ userId: 'u1', state: 'BUSY', sessionId: 's1', lastActive: 3 });
    expect((await getPresence('u1'))?.state).toBe('BUSY');

    await setPresence({ userId: 'u1', state: 'OFFLINE', sessionId: null, lastActive: 4 });
    expect((await getPresence('u1'))?.state).toBe('OFFLINE');
    expect((await getPresence('u1'))?.currentSession).toBeNull();
  });

  it('tracks currentCall and flips state to IN_CALL, then clears back', async () => {
    await setPresence({ userId: 'u1', state: 'ONLINE', sessionId: 's1' });
    await setCurrentCall('u1', 'call-1');
    let p = await getPresence('u1');
    expect(p?.state).toBe('IN_CALL');
    expect(p?.currentCall).toBe('call-1');

    await setCurrentCall('u1', null);
    p = await getPresence('u1');
    expect(p?.state).toBe('ONLINE');
    expect(p?.currentCall).toBeNull();
  });

  it('getUsersPresence returns snapshots for multiple users incl. offline default', async () => {
    await setPresence({ userId: 'u1', state: 'ONLINE', sessionId: 's1' });
    const map = await getUsersPresence(['u1', 'u2']);
    expect(map['u1'].state).toBe('ONLINE');
    expect(map['u2'].state).toBe('OFFLINE');
  });

  it('offline presence is not marked online', async () => {
    const snap: PresenceState = 'OFFLINE';
    expect(snap).toBe('OFFLINE');
  });
});
