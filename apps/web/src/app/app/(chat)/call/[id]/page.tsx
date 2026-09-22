'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { api, post, API_URL } from '@/lib/api';
import { useRealtime } from '@/lib/realtime-context';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { CloseIcon, MicIcon, MicOffIcon, VideoIcon, CameraOffIcon, GiftIcon, SpeakerIcon, CoinIcon, FlagIcon } from '@/components/ui/Icons';

const API_ORIGIN = API_URL.replace(/\/api\/v1\/?$/, '');
const STUN = 'stun:stun.l.google.com:19302';
const OFFER_RETRY_MS = 2000;
const MAX_OFFER_ATTEMPTS = 15; // ~30s before surfacing a failed state

type CallType = 'AUDIO' | 'VIDEO';
type CallState =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'ended'
  | 'missed'
  | 'busy'
  | 'rejected'
  | 'cancelled'
  | 'rate_limited'
  | 'offline'
  | 'insufficient'
  | 'failed'
  | 'gift';

interface CallGift {
  id: string;
  name: string;
  imageUrl: string | null;
  animationUrl: string | null;
  priceCoins: number;
}

const fmt = (s: number) => {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
};

export default function CallScreen() {
  const params = useParams();
  const search = useSearchParams();
  const id = String(params.id);
  const rawType = (search.get('type') || 'audio').toLowerCase();
  const type: CallType = rawType === 'video' ? 'VIDEO' : 'AUDIO';
  const ongoing = search.get('ongoing');
  const incoming = search.get('incoming');
  const presetsName = search.get('name');

  const { socket, connected, joinRoom, leaveRoom, emit, on } = useRealtime();

  const [displayName, setDisplayName] = useState(presetsName ? decodeURIComponent(presetsName) : id);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [callState, setCallState] = useState<CallState>(ongoing || incoming ? 'connecting' : 'connecting');
  const [seconds, setSeconds] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [showGifts, setShowGifts] = useState(false);
  const [gifts, setGifts] = useState<CallGift[]>([]);
  const [giftsToast, setGiftsToast] = useState<string | null>(null);
  const [insufficientDetails, setInsufficientDetails] = useState<{ balance?: number; required?: number } | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string | null>(ongoing || incoming || null);
  const otherIdRef = useRef(id);
  otherIdRef.current = id;
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const timerStarted = useRef(false);
  const facingRef = useRef('user');
  const initializedRef = useRef(false);
  const callStateRef = useRef<CallState>(callState);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  // Server-issued TURN credentials (short-lived Twilio NTS ICE servers),
  // fetched once per call screen. Resolves to [] so a failed fetch simply
  // keeps the existing STUN-only path — the call must never crash on this.
  const turnServersRef = useRef<Promise<RTCIceServer[]> | null>(null);
  const remoteAnsweredRef = useRef(false);
  const acceptedRef = useRef<boolean>(!!ongoing || !!incoming);
  const wasConnectedRef = useRef(false);
  const offerAttemptsRef = useRef(0);
  const offerRetryRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setStatus = useCallback((st: CallState) => {
    callStateRef.current = st;
    setCallState(st);
    if (st === 'connected') {
      timerStarted.current = true;
    } else if (st === 'ended' || st === 'missed' || st === 'rejected' || st === 'cancelled' || st === 'busy' || st === 'failed') {
      timerStarted.current = false;
    }
  }, []);

  const pushOffer = useCallback(() => {
    const pc = pcRef.current;
    if (!pc || remoteAnsweredRef.current || pc.connectionState === 'connected') return;
    const desc = pc.localDescription;
    if (!desc || desc.type !== 'offer') return;
    emit('call:signal', { callId: callIdRef.current, to: otherIdRef.current, event: 'offer', data: { sdp: desc } });
  }, [emit]);

  const stopOfferRetry = useCallback(() => {
    if (offerRetryRef.current) {
      clearInterval(offerRetryRef.current);
      offerRetryRef.current = null;
    }
  }, []);

  const startOfferRetry = useCallback(() => {
    if (offerRetryRef.current) return;
    offerRetryRef.current = setInterval(() => {
      const pc = pcRef.current;
      if (!pc) return;
      if (remoteAnsweredRef.current || callStateRef.current !== 'connecting' || pc.connectionState === 'connected') {
        stopOfferRetry();
        return;
      }
      offerAttemptsRef.current += 1;
      if (offerAttemptsRef.current >= MAX_OFFER_ATTEMPTS) {
        setStatus('failed');
        stopOfferRetry();
        return;
      }
      pushOffer();
    }, OFFER_RETRY_MS);
  }, [pushOffer, setStatus, stopOfferRetry]);

  const isEndState = ['ended', 'missed', 'rejected', 'cancelled', 'busy', 'rate_limited', 'offline', 'insufficient', 'failed'].includes(callState);

  // load gifts for in-call gifting
  useEffect(() => {
    api<{ items: CallGift[] }>('/gifts', { auth: true })
      .then((d) => setGifts(d.items ?? []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setupPeer = useCallback((callId: string, turnIceServers: RTCIceServer[]) => {
    // STUN first as the baseline; server-issued TURN (and any NTS STUN) follow.
    const servers: RTCIceServer[] = [{ urls: STUN }, ...(turnIceServers || [])];
    const pc = new RTCPeerConnection({ iceServers: servers });
    pcRef.current = pc;

    const local = localStreamRef.current;
    if (local) {
      local.getTracks().forEach((t) => pc.addTrack(t, local));
    }
    pc.ontrack = (ev) => {
      if (ev.streams && ev.streams[0]) {
        const stream = ev.streams[0];
        const handleAutoplayRejection = (e: unknown) => {
          // Audio/video autoplay is blocked by the browser until the user
          // interacts. Never bypass the restriction — surface a clear action
          // ("Tap to hear audio") that resumes playback from the click handler.
          if ((e as { name?: string })?.name === 'NotAllowedError') setAudioBlocked(true);
        };
        if (type === 'VIDEO') {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
            remoteVideoRef.current.play().catch(handleAutoplayRejection);
          }
        } else if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
          remoteAudioRef.current.play().catch(handleAutoplayRejection);
        }
      }
    };
    pc.onicecandidate = (ev) => {
      if (ev.candidate && callIdRef.current) {
        emit('call:signal', { callId, to: otherIdRef.current, event: 'candidate', data: ev.candidate });
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        wasConnectedRef.current = true;
        emit('call:connection', { callId, status: 'CONNECTED' });
      } else if (pc.connectionState === 'disconnected') {
        // ICE candidates may still recover — enter the existing RECONNECTING
        // contract (grace period + server-enforced deadline), no new architecture.
        if (wasConnectedRef.current && callStateRef.current === 'connected') {
          emit('call:connection', { callId, status: 'RECONNECTING' });
          setStatus('reconnecting');
        }
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        emit('call:connection', { callId, status: 'DISCONNECTED' });
        if (wasConnectedRef.current) {
          // Give the peer the reconnect grace window; the server deadline ends
          // the call if the connection never returns.
          setStatus('reconnecting');
        } else if (callStateRef.current === 'connecting') {
          setStatus('failed');
        }
      }
    };
    return pc;
  }, [emit, setStatus, type]);

  const initVideo = useCallback(async (callId: string, forOffer: boolean) => {
    const turnIceServers = turnServersRef.current ? await turnServersRef.current : [];
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Camera and microphone are not supported in this browser. Please ensure you are using HTTPS.');
      setStatus('failed');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'VIDEO',
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = setupPeer(callId, turnIceServers);
      if (forOffer) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        pushOffer();
        startOfferRetry();
      }
    } catch (e: any) {
      if (e.name === 'NotAllowedError') {
        alert('Permission denied for camera/microphone.');
      } else if (e.name === 'NotFoundError') {
        alert('No camera or microphone found.');
      } else if (e.name === 'NotReadableError') {
        alert('Camera or microphone is already in use by another application.');
      } else {
        alert('Failed to access camera/microphone.');
      }
      setStatus('failed');
      const pc = setupPeer(callId, turnIceServers);
      pc.close();
      if (forOffer) {
        emit('call:cancel', { callId });
      } else {
        emit('call:end', { callId });
      }
    }
  }, [type, setupPeer, pushOffer, startOfferRetry, setStatus, emit]);

  // Main init
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Request short-lived TURN credentials (server-issued Twilio NTS ICE
    // servers, authenticated). On any failure we resolve to [] and keep the
    // existing STUN-only path instead of blocking the call.
    turnServersRef.current = api<{ iceServers?: RTCIceServer[] }>('/calls/turn-credentials', { auth: true })
      .then((d) => d?.iceServers ?? [])
      .catch(() => [] as RTCIceServer[]);

    if (ongoing || incoming) {
      // Receiver side: we already joined via accept overlay; join the call room
      const callId = (ongoing || incoming) as string;
      callIdRef.current = callId;
      joinRoom(`call:${callId}`);
      if (incoming && socket) emit('call:accept', { callId });
      initVideo(callId, false).then(() => {
        // Signal the caller that our peer connection + local media are ready so
        // it can (re)send the offer instead of relying solely on the retry timer.
        emit('call:signal', { callId, to: otherIdRef.current, event: 'ready', data: {} });
      });
    } else {
      // Caller: initiate
      emit(
        'call:initiate',
        { receiverId: id, type },
        (res: any) => {
          if (res?.ok && res.data) {
            const callId: string = res.data.callId;
            callIdRef.current = callId;
            joinRoom(`call:${callId}`);
            initVideo(callId, true);
          } else {
            const err = res?.error || 'RATE_LIMITED';
            if (err === 'USER_OFFLINE') setStatus('offline');
            else if (err === 'RATE_LIMITED') setStatus('rate_limited');
            else if (err === 'INSUFFICIENT_BALANCE') {
              setInsufficientDetails(res?.details ?? null);
              setStatus('insufficient');
            } else setStatus('busy');
          }
        }
      );
    }

    return () => {
      stopOfferRetry();
      if (pcRef.current) pcRef.current.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      const callId = callIdRef.current;
      // Cleanup: never leave the server thinking we are still in a live call.
      // Emit cancel (unanswered) or end (accepted/connected) so the call is
      // torn down even when the user navigates away instead of pressing hang-up.
      const st = callStateRef.current;
      if (callId && (st === 'connecting' || st === 'connected' || st === 'reconnecting')) {
        if (st === 'connecting' && !acceptedRef.current) {
          emit('call:cancel', { callId });
        } else {
          emit('call:end', { callId, quality: 4 });
        }
      }
      if (callId) leaveRoom(`call:${callId}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // realtime listeners
  useEffect(() => {
    if (!on) return;
    const offs: (() => void)[] = [];

    const drainPendingCandidates = (pc: RTCPeerConnection) => {
      const pending = pendingCandidatesRef.current;
      pendingCandidatesRef.current = [];
      for (const c of pending) {
        try {
          pc.addIceCandidate(c);
        } catch {
          /* ignore */
        }
      }
    };

    offs.push(
      on('call:signal', async (p: { from: string; callId: string; event: string; data: any }) => {
        if (p.callId !== callIdRef.current) return;
        const pc = pcRef.current;
        if (!pc) return;
        if (p.event === 'ready') {
          // Callee's peer connection + local media are ready -> (re)send the offer.
          pushOffer();
        } else if (p.event === 'offer') {
          // Ignore retransmitted offers: never renegotiate while an SDP exchange
          // is in flight and never answer more than once.
          if (pc.signalingState !== 'stable' || remoteAnsweredRef.current) return;
          await pc.setRemoteDescription(new RTCSessionDescription(p.data.sdp));
          remoteAnsweredRef.current = true;
          drainPendingCandidates(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          emit('call:signal', { callId: p.callId, to: otherIdRef.current, event: 'answer', data: { sdp: pc.localDescription } });
        } else if (p.event === 'answer') {
          if (remoteAnsweredRef.current) return;
          remoteAnsweredRef.current = true;
          stopOfferRetry();
          await pc.setRemoteDescription(new RTCSessionDescription(p.data.sdp));
          drainPendingCandidates(pc);
        } else if (p.event === 'candidate') {
          // Park candidates until the remote description is set; addIceCandidate
          // fails silently before that, and parked ones are drained above.
          if (!pc.remoteDescription) {
            pendingCandidatesRef.current.push(p.data.candidate);
          } else {
            try {
              await pc.addIceCandidate(p.data.candidate);
            } catch {
              /* ignore */
            }
          }
        }
      })
    );

    offs.push(on('call:accepted', () => {
      acceptedRef.current = true;
      pushOffer();
    }));
    offs.push(
      on('call:peer_reconnecting', () => {
        if (callStateRef.current === 'connected') setStatus('reconnecting');
      })
    );
    offs.push(
      on('call:rejected', () => {
        setStatus('rejected');
      })
    );
    offs.push(
      on('call:cancelled', () => {
        setStatus('cancelled');
      })
    );
    offs.push(
      on('call:missed', () => {
        setStatus('missed');
      })
    );
    offs.push(
      on('call:busy', () => {
        setStatus('busy');
      })
    );
    offs.push(
      on('call:ended', () => {
        setStatus('ended');
      })
    );
    offs.push(
      on('call:state', (p: { callId: string; status: string }) => {
        if (p.callId !== callIdRef.current) return;
        if (p.status === 'CONNECTED') setStatus('connected');
        else if (p.status === 'RECONNECTING') setStatus('reconnecting');
        else if (p.status === 'ENDED') setStatus('ended');
        else if (p.status === 'REJECTED') setStatus('rejected');
        else if (p.status === 'CANCELLED') setStatus('cancelled');
        else if (p.status === 'MISSED') setStatus('missed');
        else if (p.status === 'BUSY') setStatus('busy');
        else if (p.status === 'FAILED') setStatus('failed');
      })
    );
    offs.push(
      on('call:gift', (p: { callId: string; from: string; gift: { name: string } }) => {
        if (p.from !== otherIdRef.current) return;
        setGiftsToast(`${p.gift.name} received! 🎁`);
        setTimeout(() => setGiftsToast(null), 3000);
      })
    );

    return () => offs.forEach((f) => f());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, emit, pushOffer, stopOfferRetry]);

  // timer while connected/idle (show elapsed during call)
  useEffect(() => {
    if (!timerStarted.current) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [callState]);

  // fetch the other user's public profile for the UI
  useEffect(() => {
    if (presetsName && !ongoing && !incoming) return;
    if (ongoing || incoming) {
      api<{ user?: { displayName?: string; avatarUrl?: string | null } }>(`/users/${id}`, { auth: true })
        .then((d) => {
          if (d?.user?.displayName) setDisplayName(d.user.displayName);
          if (d?.user?.avatarUrl) setAvatarUrl(d.user.avatarUrl);
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
  };

  const toggleCam = () => {
    const next = !camOn;
    setCamOn(next);
    if (type === 'VIDEO') localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next));
  };

  const swapCamera = async () => {
    if (type !== 'VIDEO') return;
    facingRef.current = facingRef.current === 'user' ? 'environment' : 'user';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: { ideal: facingRef.current } },
      });
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      if (pcRef.current) {
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
        const videoTrack = stream.getVideoTracks()[0];
        if (sender && videoTrack) sender.replaceTrack(videoTrack);
      }
      setCamOn(true);
    } catch {
      /* ignore */
    }
  };

  const endCall = () => {
    const callId = callIdRef.current;
    if (callId) {
      // Lifecycle correctness: hanging up before the receiver answered is a
      // CANCEL — never recorded or billed as connected usage. After acceptance
      // or during connection/connected it is a normal call:end.
      if (callStateRef.current === 'connecting' && !acceptedRef.current) {
        emit('call:cancel', { callId });
      } else {
        emit('call:end', { callId, quality: 4 });
      }
    }
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    if (callId) leaveRoom(`call:${callId}`);
    setStatus('ended');
  };

  const report = () => {
    const callId = callIdRef.current;
    if (callId) emit('call:report', { callId, category: 'OTHER', description: 'Reported during call' });
    setStatus('ended');
  };

  const block = () => {
    const callId = callIdRef.current;
    if (callId) emit('call:block', { callId });
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    setStatus('ended');
  };

  const sendGift = (g: CallGift) => {
    const callId = callIdRef.current;
    if (!callId) return;
    emit('call:gift', { callId, to: otherIdRef.current, giftId: g.id });
    setShowGifts(false);
  };

  const statusLabel: Record<CallState, string> = {
    connecting: 'Connecting…',
    connected: fmt(seconds),
    reconnecting: 'Reconnecting…',
    ended: 'Call ended',
    missed: 'Missed call',
    busy: 'Busy',
    rejected: 'Call declined',
    cancelled: 'Call cancelled',
    rate_limited: 'Rate limited — try again in a moment',
    offline: 'User is offline',
    insufficient: 'Insufficient balance to start calls',
    failed: 'Call failed',
    gift: '',
  };

  const callActive = callState === 'connecting' || callState === 'connected';

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0c] flex flex-col">
      {/* Remote / background */}
      <div className="flex-1 relative overflow-hidden">
        {type === 'VIDEO' && callActive ? (
          <div className="absolute inset-0 bg-black">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover transition-opacity duration-1000" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.15),transparent_60%)] animate-pulse-glow" />
            <div className="text-center relative z-10">
              <div className="relative inline-block mb-6">
                 <Avatar src={avatarUrl} name={displayName} size="2xl" online />
                 {callState === 'connecting' && <div className="absolute inset-0 rounded-full border-2 border-brand-400 animate-ping opacity-20" />}
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md">{displayName}</h1>
              <p className="text-brand-300 font-medium mt-2 text-sm uppercase tracking-widest">{statusLabel[callState]}</p>
            </div>
          </div>
        )}

        {/* Video top overlay */}
        {type === 'VIDEO' && callActive && (
          <div className="absolute top-0 inset-x-0 pt-safe px-4 py-4 flex items-center justify-between z-20">
            <div className="flex items-center gap-3 bg-black/20 backdrop-blur-md rounded-full pr-4 p-1 border border-white/10 shadow-glass">
              <Avatar src={avatarUrl} name={displayName} size="sm" online />
              <div>
                <p className="font-bold text-sm leading-none">{displayName}</p>
                <p className="text-[10px] text-white/70 mt-1 uppercase tracking-widest font-bold">{callState === 'connected' ? fmt(seconds) : 'Connecting'}</p>
              </div>
            </div>
            <button onClick={swapCamera} className="h-10 w-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-white shadow-glass active:scale-90 transition-transform" aria-label="Swap camera">
              <VideoIcon size={18} />
            </button>
          </div>
        )}

        {/* Self video mini */}
        {type === 'VIDEO' && camOn && callActive && (
          <div className="absolute bottom-40 right-4 h-48 w-32 rounded-[20px] overflow-hidden border border-white/20 shadow-float bg-black z-20">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute bottom-1.5 right-1.5 text-[9px] text-white/90 font-bold bg-black/40 backdrop-blur rounded px-1.5 py-0.5">You</div>
          </div>
        )}

        {/* Gifts toast */}
        {giftsToast && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full bg-brand-600/90 backdrop-blur-md text-white text-sm font-bold shadow-glow border border-brand-400/50 z-50 animate-slide-up">
            {giftsToast}
          </div>
        )}

        {/* Autoplay-blocked fallback */}
        {callActive && audioBlocked && (
          <button
            onClick={() => {
              if (remoteAudioRef.current) {
                remoteAudioRef.current.play().then(() => setAudioBlocked(false)).catch(() => {});
              }
              if (type === 'VIDEO' && remoteVideoRef.current) {
                remoteVideoRef.current.play().then(() => setAudioBlocked(false)).catch(() => {});
              }
            }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            aria-label="Unmute remote audio"
          >
            <span className="px-6 py-3 rounded-full bg-brand-600 text-white font-bold text-sm shadow-glow animate-pulse">
              Tap to hear audio
            </span>
          </button>
        )}
      </div>

      {/* In-call gift picker */}
      {showGifts && !isEndState && (
        <div className="absolute inset-x-0 bottom-[100px] z-20 mx-4 bg-surface-raised/95 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-float animate-slide-up">
          <div className="grid grid-cols-4 gap-3">
            {gifts.slice(0, 8).map((g) => (
              <button key={g.id} onClick={() => sendGift(g)} className="flex flex-col items-center p-2 rounded-2xl bg-white/5 border border-white/5 hover:border-brand-500/50 active:scale-95 transition-all">
                {g.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${API_ORIGIN}${g.imageUrl}`} alt={g.name} className="h-10 w-10 object-contain drop-shadow-md" />
                ) : (
                  <span className="text-3xl drop-shadow-md">🎁</span>
                )}
                <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1 mt-1 bg-amber-400/10 px-1.5 py-0.5 rounded"><CoinIcon size={8} />{g.priceCoins}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setShowGifts(false)} className="mt-3 w-full h-10 rounded-xl bg-white/10 text-white text-xs font-bold active:scale-[0.98]">Close</button>
        </div>
      )}

      {/* Controls */}
      {isEndState ? (
        <div className="absolute bottom-0 inset-x-0 pb-safe px-6 pt-10 bg-gradient-to-t from-[#0a0a0c] to-transparent">
          <div className="flex flex-col items-center pb-6">
            <p className="text-sm font-medium text-white/70 mb-5">{statusLabel[callState]}</p>
            {callState === 'insufficient' && (
              <p className="text-xs font-medium text-amber-400/90 mb-5 text-center bg-amber-400/10 p-3 rounded-xl border border-amber-400/20">
                {insufficientDetails?.required
                  ? `You need at least ${insufficientDetails.required} coins to start this call. `
                  : 'Add coins to your wallet to start calls. '}
                Top up below.
              </p>
            )}
            <div className="flex w-full gap-3">
              {callState === 'insufficient' ? (
                <Link href="/app/wallet" className="flex-1 h-14 rounded-2xl bg-brand-gradient text-white flex items-center justify-center text-sm font-bold shadow-glow active:scale-[0.98] transition-transform">
                  Top up coins
                </Link>
              ) : (
                <Link href={`/app/chat/${id}`} className="flex-1 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-sm font-bold shadow-glow active:scale-[0.98] transition-transform">
                  Message
                </Link>
              )}
              <Link href={`/app/call/${id}?type=${type.toLowerCase()}`} className="flex-1 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-white flex items-center justify-center text-sm font-bold active:scale-[0.98] transition-transform hover:bg-white/15">
                Call again
              </Link>
            </div>
            <button onClick={() => { window.history.length > 1 ? window.history.back() : (window.location.href = '/app/chat'); }} className="mt-5 text-[11px] uppercase tracking-wider font-bold text-white/40 hover:text-white transition-colors">
              Close
            </button>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-0 inset-x-0 pb-safe pt-24 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent">
          <div className="flex flex-col items-center pb-6">
            <div className="flex items-center justify-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 p-2 rounded-full shadow-glass mb-4">
              <button
                onClick={toggleMic}
                className={`h-12 w-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${micOn ? 'bg-transparent text-white hover:bg-white/10' : 'bg-white text-black shadow-glow'}`}
                aria-label="Toggle microphone"
              >
                {micOn ? <MicIcon size={20} /> : <MicOffIcon size={20} />}
              </button>
              {type === 'VIDEO' && (
                <button
                  onClick={toggleCam}
                  className={`h-12 w-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${camOn ? 'bg-transparent text-white hover:bg-white/10' : 'bg-white text-black shadow-glow'}`}
                  aria-label="Toggle camera"
                >
                  {camOn ? <VideoIcon size={20} /> : <CameraOffIcon size={20} />}
                </button>
              )}
              <button
                onClick={() => setSpeakerOn((v) => !v)}
                className={`h-12 w-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${speakerOn ? 'bg-transparent text-white hover:bg-white/10' : 'bg-white text-black'}`}
                aria-label="Toggle speaker"
              >
                {speakerOn ? <SpeakerIcon size={20} /> : <SpeakerMutedIcon />}
              </button>
              {type !== 'VIDEO' && (
                <>
                  <button
                    onClick={() => setShowGifts((s) => !s)}
                    className="h-12 w-12 rounded-full flex items-center justify-center transition-all active:scale-90 bg-transparent text-white hover:bg-white/10"
                    aria-label="Gift"
                  >
                    <GiftIcon size={20} />
                  </button>
                </>
              )}
              <button
                onClick={endCall}
                className="h-14 w-14 rounded-full bg-red-500 text-white flex items-center justify-center shadow-glow active:scale-90 transition-transform ml-2"
                aria-label="End call"
              >
                <CloseIcon size={24} />
              </button>
            </div>
            {type === 'VIDEO' && (
               <div className="flex gap-6 mb-2">
                 <button onClick={() => setShowGifts((s) => !s)} className="text-[10px] uppercase tracking-widest font-bold text-white/60 hover:text-white flex items-center gap-1.5"><GiftIcon size={12} /> Gift</button>
                 <button onClick={report} className="text-[10px] uppercase tracking-widest font-bold text-white/60 hover:text-white flex items-center gap-1.5"><FlagIcon size={12} /> Report</button>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SpeakerMutedIcon() {  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

function ChatDotIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}
