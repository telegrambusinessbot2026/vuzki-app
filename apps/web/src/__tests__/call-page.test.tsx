import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act, screen, cleanup } from '@testing-library/react';

const apiMocks = vi.hoisted(() => {
  const state = {
    turnIceServers: [] as RTCIceServer[],
    turnFails: false,
  };
  const apiFn = vi.fn(async (path: string) => {
    if (path === '/calls/turn-credentials') {
      if (state.turnFails) throw new Error('turn unavailable');
      return { iceServers: state.turnIceServers };
    }
    return { items: [], user: undefined };
  });
  return { state, apiFn };
});

vi.mock('@/lib/api', () => ({
  api: apiMocks.apiFn,
  post: vi.fn(async () => ({})),
  API_URL: 'http://localhost:4000/api/v1',
}));

const rt = vi.hoisted(() => {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  return {
    handlers,
    clearHandlers: () => {
      for (const key of Object.keys(handlers)) delete handlers[key];
    },
    realtime: {
      socket: null as unknown,
      connected: true,
      joinRoom: vi.fn(),
      leaveRoom: vi.fn(),
      emit: vi.fn(),
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        handlers[event] = handler;
        return () => {
          delete handlers[event];
        };
      }),
      off: vi.fn(),
      once: vi.fn(),
      presence: {} as Record<string, string>,
    },
  };
});

vi.mock('@/lib/realtime-context', () => ({
  useRealtime: () => rt.realtime,
}));

const nav = vi.hoisted(() => {
  let typeParam = 'audio';
  let ongoingParam: string | null = null;
  let incomingParam: string | null = null;
  return {
    setParams: (type: string, opts?: { ongoing?: string | null; incoming?: string | null }) => {
      typeParam = type;
      ongoingParam = opts?.ongoing ?? null;
      incomingParam = opts?.incoming ?? null;
    },
    useParams: () => ({ id: 'receiver-1' }),
    useSearchParams: () => ({
      get: (key: string) => {
        if (key === 'type') return typeParam;
        if (key === 'ongoing') return ongoingParam;
        if (key === 'incoming') return incomingParam;
        return null;
      },
    }),
    useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })),
  };
});

vi.mock('next/navigation', () => ({
  useParams: () => nav.useParams(),
  useSearchParams: () => nav.useSearchParams(),
  useRouter: () => nav.useRouter(),
}));

import CallScreen from '@/app/app/(chat)/call/[id]/page';

type MockTrack = { kind: 'audio' | 'video'; enabled: boolean; stop: () => void };

function fakeStream(tracks: MockTrack[]) {
  return {
    getTracks: () => tracks.slice(),
    getAudioTracks: () => tracks.filter((t) => t.kind === 'audio'),
    getVideoTracks: () => tracks.filter((t) => t.kind === 'video'),
  };
}

const audioTrack = (): MockTrack => ({ kind: 'audio', enabled: true, stop: () => {} });
const videoTrack = (): MockTrack => ({ kind: 'video', enabled: true, stop: () => {} });

class MockRTCPeerConnection {
  static instances: MockRTCPeerConnection[] = [];
  localDescription: { sdp: string; type: string } | null = null;
  remoteDescription: { sdp: string; type: string } | null = null;
  signalingState = 'stable';
  connectionState = 'new';
  ontrack: ((ev: unknown) => void) | null = null;
  onicecandidate: ((ev: unknown) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  iceGatheringState = 'complete';
  constructor(public config?: RTCConfiguration) {
    MockRTCPeerConnection.instances.push(this);
  }
  addTrack = vi.fn();
  createOffer = vi.fn(async () => ({ sdp: 'offer', type: 'offer' }));
  createAnswer = vi.fn(async () => ({ sdp: 'answer', type: 'answer' }));
  setLocalDescription = vi.fn(async (desc: { sdp: string; type: string }) => {
    this.localDescription = desc;
  });
  setRemoteDescription = vi.fn(async (desc: { sdp: string; type: string }) => {
    this.remoteDescription = desc;
  });
  addIceCandidate = vi.fn(async () => {});
  close = vi.fn();
  getSenders = vi.fn(() => [] as { track: { kind: string } | null }[]);
  replaceTrack = vi.fn();
}

class MockRTCSessionDescription {
  type: string;
  sdp: string;
  constructor(init: { type: string; sdp: string }) {
    this.type = init.type;
    this.sdp = init.sdp;
  }
}

const mediaStub = {
  getUserMedia: vi.fn(async (constraints?: { audio?: boolean; video?: boolean | object }) => {
    const tracks: MockTrack[] = [];
    if (constraints && constraints.audio) tracks.push(audioTrack());
    if (constraints && constraints.video) tracks.push(videoTrack());
    return fakeStream(tracks);
  }),
};

beforeEach(() => {
  vi.clearAllMocks();
  MockRTCPeerConnection.instances = [];
  rt.clearHandlers();
  nav.setParams('audio');
  apiMocks.state.turnIceServers = [];
  apiMocks.state.turnFails = false;
  vi.stubGlobal('RTCPeerConnection', MockRTCPeerConnection);
  vi.stubGlobal('RTCSessionDescription', MockRTCSessionDescription);
  Object.defineProperty(window.navigator, 'mediaDevices', { configurable: true, value: mediaStub });
  (rt.realtime.emit as ReturnType<typeof vi.fn>).mockImplementation(
    (_event?: string, _payload?: unknown, ack?: (res: unknown) => void) => {
      if (ack) ack({ ok: true, data: { callId: 'call-test-1' } });
    }
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('call page WebRTC (audio + video share the same flow)', () => {
  it('AUDIO: requests mic only, adds local track, renders + attaches remote <audio>', async () => {
    nav.setParams('audio');
    const { container } = render(<CallScreen />);

    await waitFor(() => expect(mediaStub.getUserMedia).toHaveBeenCalledTimes(1));
    expect(mediaStub.getUserMedia).toHaveBeenCalledWith({ audio: true, video: false });

    const emitMock = rt.realtime.emit as ReturnType<typeof vi.fn>;
    expect(emitMock).toHaveBeenCalledWith(
      'call:initiate',
      { receiverId: 'receiver-1', type: 'AUDIO' },
      expect.any(Function)
    );
    const initiates = emitMock.mock.calls.filter((call: unknown[]) => call[0] === 'call:initiate');
    expect(initiates).toHaveLength(1);

    const pc = MockRTCPeerConnection.instances[0];
    expect(pc).toBeTruthy();
    expect(pc.addTrack).toHaveBeenCalledTimes(1);
    expect(container.querySelector('video')).toBeNull();

    const audioEl = container.querySelector('audio.hidden') as HTMLAudioElement | null;
    expect(audioEl).not.toBeNull();

    const remoteStream = fakeStream([audioTrack()]);
    await act(async () => {
      if (pc.ontrack) pc.ontrack({ streams: [remoteStream] });
    });

    expect(audioEl!.srcObject).toBe(remoteStream);
    expect(audioEl!.play).toHaveBeenCalled();
  });

  it('VIDEO: requests camera + mic, renders remote <video>, never an audio-only element', async () => {
    nav.setParams('video');
    const { container } = render(<CallScreen />);

    await waitFor(() => expect(mediaStub.getUserMedia).toHaveBeenCalledTimes(1));
    expect(mediaStub.getUserMedia).toHaveBeenCalledWith({ audio: true, video: true });

    const pc = MockRTCPeerConnection.instances[0];
    expect(pc).toBeTruthy();
    expect(container.querySelector('audio')).toBeNull();

    const remoteStream = fakeStream([videoTrack(), audioTrack()]);
    await act(async () => {
      if (pc.ontrack) pc.ontrack({ streams: [remoteStream] });
    });

    const remoteVideos = Array.from(container.querySelectorAll('video')).filter(
      (v) => v.srcObject === remoteStream
    );
    expect(remoteVideos).toHaveLength(1);
  });

  it('signals the offer exactly once on the caller side (no duplicate signaling)', async () => {
    nav.setParams('audio');
    render(<CallScreen />);

    await waitFor(() => expect(mediaStub.getUserMedia).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      const emitMock = rt.realtime.emit as ReturnType<typeof vi.fn>;
      const offers = emitMock.mock.calls.filter(
        (call: unknown[]) => call[0] === 'call:signal' && (call[1] as { event?: string }).event === 'offer'
      );
      expect(offers).toHaveLength(1);
    });
  });

  it('fetches short-lived TURN ICE servers from the authenticated endpoint and uses them', async () => {
    apiMocks.state.turnIceServers = [
      { urls: ['stun:global.stun.twilio.com:3478'], username: 'tmp-user', credential: 'tmp-pass' },
      { urls: ['turn:global.turn.twilio.com:3478?transport=udp'], username: 'tmp-user', credential: 'tmp-pass' },
    ];
    nav.setParams('audio');
    render(<CallScreen />);
    await waitFor(() => expect(mediaStub.getUserMedia).toHaveBeenCalledTimes(1));

    // Credentials were requested from the authenticated backend endpoint.
    expect(apiMocks.apiFn).toHaveBeenCalledWith('/calls/turn-credentials', { auth: true });

    const pc = MockRTCPeerConnection.instances[0];
    expect(pc).toBeTruthy();
    // STUN baseline first, dynamic Twilio NTS servers follow; no static secrets.
    expect(pc.config?.iceServers).toEqual([
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: ['stun:global.stun.twilio.com:3478'], username: 'tmp-user', credential: 'tmp-pass' },
      { urls: ['turn:global.turn.twilio.com:3478?transport=udp'], username: 'tmp-user', credential: 'tmp-pass' },
    ]);
  });

  it('falls back to STUN-only when the TURN credentials endpoint fails (no crash)', async () => {
    apiMocks.state.turnFails = true;
    nav.setParams('audio');
    render(<CallScreen />);
    await waitFor(() => expect(mediaStub.getUserMedia).toHaveBeenCalledTimes(1));

    const pc = MockRTCPeerConnection.instances[0];
    expect(pc).toBeTruthy();
    expect(pc.config?.iceServers).toEqual([{ urls: 'stun:stun.l.google.com:19302' }]);
  });
});

describe('call page: ICE candidate parking + draining (ICE before remote SDP)', () => {
  it('parks candidates received before the remote description and drains them after', async () => {
    nav.setParams('audio');
    render(<CallScreen />);
    await waitFor(() => expect(mediaStub.getUserMedia).toHaveBeenCalledTimes(1));

    const callerPc = MockRTCPeerConnection.instances[0];
    const candidate = { candidate: 'candidate:1 1 udp 111 127.0.0.1 5000 typ host', sdpMLineIndex: 0 };

    // ICE trickle races the SDP exchange: the candidate arrives first.
    await act(async () => {
      rt.handlers['call:signal']({ from: 'receiver-1', callId: 'call-test-1', event: 'candidate', data: { candidate } });
    });
    expect(callerPc.addIceCandidate).not.toHaveBeenCalled();

    // Later the answer lands -> setRemoteDescription, then parked candidates drain.
    await act(async () => {
      rt.handlers['call:signal']({
        from: 'receiver-1',
        callId: 'call-test-1',
        event: 'answer',
        data: { sdp: { type: 'answer', sdp: 'fake-answer' } },
      });
    });
    await waitFor(() => expect(callerPc.addIceCandidate).toHaveBeenCalledWith(candidate));
  });

  it('forwards candidates arriving after the remote description immediately', async () => {
    nav.setParams('audio');
    render(<CallScreen />);
    await waitFor(() => expect(mediaStub.getUserMedia).toHaveBeenCalledTimes(1));

    const callerPc = MockRTCPeerConnection.instances[0];
    await act(async () => {
      rt.handlers['call:signal']({
        from: 'receiver-1',
        callId: 'call-test-1',
        event: 'answer',
        data: { sdp: { type: 'answer', sdp: 'fake-answer' } },
      });
    });
    const candidate = { candidate: 'candidate:2 1 udp 222 127.0.0.1 5001 typ host', sdpMLineIndex: 0 };
    await act(async () => {
      rt.handlers['call:signal']({ from: 'receiver-1', callId: 'call-test-1', event: 'candidate', data: { candidate } });
    });
    expect(callerPc.addIceCandidate).toHaveBeenCalledWith(candidate);
  });
});

describe('call page: cancel vs end lifecycle (never bill the unanswered)', () => {
  it('hanging up before the receiver accepts emits call:cancel, never call:end', async () => {
    nav.setParams('audio');
    const { container } = render(<CallScreen />);
    await waitFor(() => expect(mediaStub.getUserMedia).toHaveBeenCalledTimes(1));

    await act(async () => {
      container.querySelector('[aria-label="End call"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const emitMock = rt.realtime.emit as ReturnType<typeof vi.fn>;
    const cancels = emitMock.mock.calls.filter((c: unknown[]) => c[0] === 'call:cancel');
    const ends = emitMock.mock.calls.filter((c: unknown[]) => c[0] === 'call:end');
    expect(cancels.length).toBeGreaterThanOrEqual(1);
    expect(ends).toHaveLength(0);
  });

  it('hanging up after the receiver accepted emits call:end, not cancel', async () => {
    nav.setParams('audio');
    const { container } = render(<CallScreen />);
    await waitFor(() => expect(mediaStub.getUserMedia).toHaveBeenCalledTimes(1));

    await act(async () => {
      rt.handlers['call:accepted']({});
    });

    await act(async () => {
      container.querySelector('[aria-label="End call"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const emitMock = rt.realtime.emit as ReturnType<typeof vi.fn>;
    const ends = emitMock.mock.calls.filter((c: unknown[]) => c[0] === 'call:end');
    const cancels = emitMock.mock.calls.filter((c: unknown[]) => c[0] === 'call:cancel');
    expect(ends.length).toBeGreaterThanOrEqual(1);
    expect(cancels).toHaveLength(0);
  });
});

describe('call page: reconnect contract (RECONNECTING grace period)', () => {
  it('emits RECONNECTING on ICE disconnect after being connected and shows "Reconnecting…"', async () => {
    nav.setParams('audio');
    const { container } = render(<CallScreen />);
    await waitFor(() => expect(mediaStub.getUserMedia).toHaveBeenCalledTimes(1));

    const pc = MockRTCPeerConnection.instances[0];
    await act(async () => {
      pc.connectionState = 'connected';
      if (pc.onconnectionstatechange) pc.onconnectionstatechange();
    });
    // Server echoes CONNECTED (as the realtime layer does).
    await act(async () => {
      rt.handlers['call:state']({ callId: 'call-test-1', status: 'CONNECTED' });
    });
    await waitFor(() => expect(container.textContent).toContain('0:00'));

    await act(async () => {
      pc.connectionState = 'disconnected';
      if (pc.onconnectionstatechange) pc.onconnectionstatechange();
    });

    const emitMock = rt.realtime.emit as ReturnType<typeof vi.fn>;
    const reconn = emitMock.mock.calls.find(
      (c: unknown[]) => c[0] === 'call:connection' && (c[1] as { status?: string }).status === 'RECONNECTING'
    );
    expect(reconn).toBeTruthy();
    await waitFor(() => expect(container.textContent).toContain('Reconnecting…'));
  });

  it('reflects a server-driven RECONNECTING via call:state', async () => {
    nav.setParams('audio');
    const { container } = render(<CallScreen />);
    await waitFor(() => expect(mediaStub.getUserMedia).toHaveBeenCalledTimes(1));

    await act(async () => {
      rt.handlers['call:state']({ callId: 'call-test-1', status: 'RECONNECTING' });
    });
    await waitFor(() => expect(container.textContent).toContain('Reconnecting…'));
  });
});

describe('call page: autoplay-blocked fallback', () => {
  it('surfaces the "Tap to hear audio" overlay when the browser blocks remote audio, and clears it on tap', async () => {
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue({ name: 'NotAllowedError' });
    nav.setParams('audio');
    render(<CallScreen />);
    await waitFor(() => expect(mediaStub.getUserMedia).toHaveBeenCalledTimes(1));

    const pc = MockRTCPeerConnection.instances[0];
    await act(async () => {
      if (pc.ontrack) pc.ontrack({ streams: [fakeStream([audioTrack()])] });
    });

    const btn = await screen.findByText('Tap to hear audio');
    expect(btn).toBeTruthy();
    expect(screen.getByLabelText('Unmute remote audio')).toBeTruthy();

    playSpy.mockResolvedValue(undefined);
    await act(async () => {
      btn.click();
    });
    await waitFor(() => expect(screen.queryByLabelText('Unmute remote audio')).toBeNull());
  });

  it('never shows the fallback overlay when remote audio autoplays freely', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    nav.setParams('audio');
    render(<CallScreen />);
    await waitFor(() => expect(mediaStub.getUserMedia).toHaveBeenCalledTimes(1));

    const pc = MockRTCPeerConnection.instances[0];
    await act(async () => {
      if (pc.ontrack) pc.ontrack({ streams: [fakeStream([audioTrack()])] });
    });

    expect(screen.queryByLabelText('Unmute remote audio')).toBeNull();
  });
});