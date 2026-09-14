import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import { io as createClient } from 'socket.io-client';

vi.mock('@vuzki/database', () => ({
  prisma: {
    user: {
      update: vi.fn(async () => ({})),
      findUnique: vi.fn(async () => ({ id: 'any', isCreator: false })),
    },
    block: { count: vi.fn(async () => 0) },
    call: {
      findUnique: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
  },
}));

import { createRealtimeServer } from '../realtime';
import { config } from '../config';
import { createCallSession, getCallSession, cleanupCallSession, updateCallStatus } from '../realtime/call-tracker';
import { kv } from '../realtime/store';
import { handleRingTimeout } from '../realtime/call-lifecycle';
import { prisma } from '@vuzki/database';

let server: http.Server;
let port: number;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectClient(userId: string) {
  const token = jwt.sign({ userId }, config.jwtSecret);
  const client = createClient(`http://localhost:${port}`, {
    auth: { token },
    forceNew: true,
    reconnection: false,
    timeout: 5000,
    transports: ['websocket'],
  });
  await new Promise<void>((resolve, reject) => {
    client.on('connect', () => resolve());
    client.on('connect_error', (err) => reject(err));
  });
  return client;
}

beforeAll(async () => {
  server = http.createServer();
  createRealtimeServer(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address();
  port = typeof addr === 'object' && addr ? addr.port : 4001;
});

afterAll(async () => {
  await kv.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('call:signal forwarding', () => {
  it('forwards call:signal to the receiver exactly once (no duplicate signaling)', async () => {
    const caller = await connectClient('sig-caller-1');
    const receiver = await connectClient('sig-receiver-1');
    try {
      await createCallSession({
        callId: 'sig-call-1',
        type: 'AUDIO',
        callerId: 'sig-caller-1',
        receiverId: 'sig-receiver-1',
      });

      let received = 0;
      receiver.on('call:signal', () => {
        received += 1;
      });

      caller.emit('call:signal', {
        callId: 'sig-call-1',
        to: 'sig-receiver-1',
        event: 'offer',
        data: { sdp: { type: 'offer', sdp: 'fake-sdp' } },
      });

      await wait(250);
      expect(received).toBe(1);
      await cleanupCallSession('sig-call-1');
    } finally {
      caller.disconnect();
      receiver.disconnect();
    }
  });

  it('does not forward call:signal between non-participants', async () => {
    const outsider = await connectClient('sig-outsider-1');
    const receiver = await connectClient('sig-receiver-2');
    try {
      await createCallSession({
        callId: 'sig-call-2',
        type: 'AUDIO',
        callerId: 'sig-caller-2',
        receiverId: 'sig-receiver-2',
      });

      let received = 0;
      receiver.on('call:signal', () => {
        received += 1;
      });

      outsider.emit('call:signal', {
        callId: 'sig-call-2',
        to: 'sig-receiver-2',
        event: 'offer',
        data: { sdp: { type: 'offer', sdp: 'fake-sdp' } },
      });

      await wait(250);
      expect(received).toBe(0);
      await cleanupCallSession('sig-call-2');
    } finally {
      outsider.disconnect();
      receiver.disconnect();
    }
  });
});

describe('call:cancel while ringing', () => {
  afterEach(async () => {
    await cleanupCallSession('cancel-call-1').catch(() => {});
  });

  it('caller cancels an unanswered RINGING call: receiver is notified, session is cleaned', async () => {
    const caller = await connectClient('cancel-caller-1');
    const receiver = await connectClient('cancel-receiver-1');
    try {
      await createCallSession({
        callId: 'cancel-call-1',
        type: 'AUDIO',
        callerId: 'cancel-caller-1',
        receiverId: 'cancel-receiver-1',
      });
      (prisma.call.findUnique as any).mockResolvedValue({
        id: 'cancel-call-1',
        callerId: 'cancel-caller-1',
        receiverId: 'cancel-receiver-1',
        type: 'AUDIO',
        status: 'RINGING',
        connectedAt: null,
        created: new Date(),
      });

      let cancelledFor = 0;
      receiver.on('call:cancelled', () => {
        cancelledFor += 1;
      });

      const ack: any = new Promise((resolve) => {
        caller.emit('call:cancel', { callId: 'cancel-call-1' }, (res: unknown) => resolve(res));
      });
      const res = await ack;

      expect(res).toMatchObject({ ok: true });
      await wait(250);
      expect(cancelledFor).toBe(1);
      expect(await getCallSession('cancel-call-1')).toBeNull();
    } finally {
      caller.disconnect();
      receiver.disconnect();
    }
  });
});

describe('missed-call ring timeout (server-side)', () => {
  afterEach(async () => {
    await cleanupCallSession('timeout-call-1').catch(() => {});
  });

  it('marks a still-RINGING call MISSED, notifies BOTH participants and stops the session', async () => {
    await createCallSession({
      callId: 'timeout-call-1',
      type: 'AUDIO',
      callerId: 'timeout-caller-1',
      receiverId: 'timeout-receiver-1',
    });
    (prisma.call.findUnique as any).mockResolvedValue({
      id: 'timeout-call-1',
      callerId: 'timeout-caller-1',
      receiverId: 'timeout-receiver-1',
      type: 'AUDIO',
      status: 'RINGING',
      connectedAt: null,
    });
    (prisma.call.updateMany as any).mockResolvedValue({ count: 1 });

    const emitted: { event: string; payload: unknown }[] = [];
    const ioStub = {
      to: () => ({
        emit: (event: string, payload: unknown) => {
          emitted.push({ event, payload });
        },
      }),
    } as any;

    await handleRingTimeout('timeout-call-1', ioStub);

    expect(prisma.call.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'timeout-call-1', status: 'RINGING' }),
        data: expect.objectContaining({ status: 'MISSED' }),
      })
    );
    const state = emitted.find((e) => e.event === 'call:state') as { payload: { status: string } } | undefined;
    expect(state?.payload.status).toBe('MISSED');
    expect(await getCallSession('timeout-call-1')).toBeNull();
  });

  it('never MISSES a call that was already accepted (idempotent under races)', async () => {
    await createCallSession({
      callId: 'timeout-call-2',
      type: 'AUDIO',
      callerId: 'timeout-caller-2',
      receiverId: 'timeout-receiver-2',
    });
    // The session already moved past RINGING (accepted).
    await updateCallStatus('timeout-call-2', 'ACCEPTED');
    // The DB row is already ONGOING (accepted) — a stale timer must not clobber it.
    (prisma.call.findUnique as any).mockResolvedValue({
      id: 'timeout-call-2',
      callerId: 'timeout-caller-2',
      receiverId: 'timeout-receiver-2',
      type: 'AUDIO',
      status: 'ONGOING',
      connectedAt: null,
    });

    const ioStub = { to: () => ({ emit: () => {} }) } as any;
    await handleRingTimeout('timeout-call-2', ioStub);

    // No MISSED transition attempted against an ONGOING call.
    expect(prisma.call.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'timeout-call-2', status: 'RINGING' }),
      })
    );
    await cleanupCallSession('timeout-call-2').catch(() => {});
  });
});