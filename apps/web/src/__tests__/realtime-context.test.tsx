import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const sock = vi.hoisted(() => {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  return {
    handlers,
    clear: () => {
      for (const key of Object.keys(handlers)) delete handlers[key];
    },
    trigger: (event: string, payload: unknown) => {
      if (handlers[event]) handlers[event](payload);
    },
    socket: {
      id: 'test-socket',
      connected: true,
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        handlers[event] = handler;
      }),
      off: vi.fn(),
      once: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
      connect: vi.fn(),
    },
  };
});

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }));

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => sock.socket),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));

vi.mock('@/lib/api', () => ({
  SOCKET_URL: 'http://localhost:4000',
  getAccessToken: () => 'test-token',
}));

import { RealtimeProvider } from '@/lib/realtime-context';

beforeEach(() => {
  vi.clearAllMocks();
  sock.clear();
});

describe('incoming call accept (call type preserved from payload -> caller)', () => {
  it('accepting a VIDEO call navigates with type=video and emits call:accept exactly once', async () => {
    render(
      <RealtimeProvider>
        <div data-testid="child" />
      </RealtimeProvider>
    );

    await act(async () => {
      sock.trigger('call:incoming', {
        callId: 'call-9',
        from: { id: 'u9', displayName: 'Vita', type: 'VIDEO' },
        type: 'VIDEO',
        rate: 20,
        timestamp: Date.now(),
      });
    });

    expect(screen.getByText(/video call/i)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Accept'));

    expect(sock.socket.emit).toHaveBeenCalledTimes(1);
    expect(sock.socket.emit).toHaveBeenCalledWith('call:accept', { callId: 'call-9' });
    expect(router.push).toHaveBeenCalledWith('/app/call/u9?ongoing=call-9&type=video');
  });

  it('accepting an AUDIO call navigates with type=audio and emits call:accept exactly once', async () => {
    render(
      <RealtimeProvider>
        <div data-testid="child" />
      </RealtimeProvider>
    );

    await act(async () => {
      sock.trigger('call:incoming', {
        callId: 'call-11',
        from: { id: 'u11', displayName: 'Ana', type: 'AUDIO' },
        type: 'AUDIO',
        rate: 10,
        timestamp: Date.now(),
      });
    });

    expect(screen.getByText(/audio call/i)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Accept'));

    expect(sock.socket.emit).toHaveBeenCalledTimes(1);
    expect(sock.socket.emit).toHaveBeenCalledWith('call:accept', { callId: 'call-11' });
    expect(router.push).toHaveBeenCalledWith('/app/call/u11?ongoing=call-11&type=audio');
  });
});