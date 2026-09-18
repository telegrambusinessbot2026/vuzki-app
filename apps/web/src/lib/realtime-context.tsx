'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/lib/api';
import { getAccessToken } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { PhoneIcon, CloseIcon } from '@/components/ui/Icons';

interface IncomingCall {
  callId: string;
  from: { id: string; displayName: string; type: string; avatarUrl?: string | null };
  type: 'AUDIO' | 'VIDEO';
  rate: number;
  timestamp: number;
}

interface RealtimeContextType {
  socket: Socket | null;
  connected: boolean;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  emit: (event: string, payload?: unknown, ack?: (res: any) => void) => void;
  on: (event: string, handler: (...args: any[]) => void) => () => void;
  off: (event: string, handler: (...args: any[]) => void) => void;
  once: (event: string, handler: (...args: any[]) => void) => void;
  presence: Record<string, string>;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [token, setToken] = useState<string | null>(() => getAccessToken());
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [presence, setPresence] = useState<Record<string, string>>({});
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const t = getAccessToken();
      setToken((prev) => (prev === t ? prev : t));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!token) return;

    const s = io(SOCKET_URL || undefined, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });
    socketRef.current = s;
    setSocket(s);

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('connect_error', () => setConnected(false));

    const onPresence = (up: { userId: string; state: string }) => {
      setPresence((p) => ({ ...p, [up.userId]: up.state }));
    };
    const onIncoming = (payload: IncomingCall) => {
      setIncoming(payload);
    };
    // Clear the floating accept/decline banner once the call is resolved by the
    // caller or by the server (cancelled/ended/missed/declined/busy/missed-ring).
    const clearIncoming = (payload: { callId?: string }) => {
      if (!payload?.callId) return;
      setIncoming((cur) => (cur && cur.callId === payload.callId ? null : cur));
    };

    s.on('presence:update', onPresence);
    s.on('call:incoming', onIncoming);
    s.on('call:cancelled', clearIncoming);
    s.on('call:rejected', clearIncoming);
    s.on('call:missed', clearIncoming);
    s.on('call:ended', clearIncoming);
    s.on('call:busy', clearIncoming);
    const onCallState = (p: { callId?: string; status?: string }) => {
      if (p.status && ['ENDED', 'REJECTED', 'CANCELLED', 'MISSED', 'BUSY', 'FAILED'].includes(p.status)) {
        clearIncoming({ callId: p.callId });
      }
    };
    s.on('call:state', onCallState);

    return () => {
      s.off('presence:update', onPresence);
      s.off('call:incoming', onIncoming);
      s.off('call:cancelled', clearIncoming);
      s.off('call:rejected', clearIncoming);
      s.off('call:missed', clearIncoming);
      s.off('call:ended', clearIncoming);
      s.off('call:busy', clearIncoming);
      s.off('call:state', onCallState);
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
      setIncoming(null);
    };
  }, [token]);

  const joinRoom = useCallback((room: string) => {
    socketRef.current?.emit('room:join', room);
    socketRef.current?.emit('conversation:join', room);
  }, []);

  const leaveRoom = useCallback((room: string) => {
    socketRef.current?.emit('room:leave', room);
    socketRef.current?.emit('conversation:leave', room);
  }, []);

  const emit = useCallback((event: string, payload?: unknown, ack?: (res: any) => void) => {
    const s = socketRef.current;
    if (!s) return;
    if (ack) s.emit(event, payload, ack);
    else s.emit(event, payload);
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    const s = socketRef.current;
    if (!s) return () => {};
    s.on(event, handler as (...args: unknown[]) => void);
    return () => {
      s.off(event, handler as (...args: unknown[]) => void);
    };
  }, []);

  const off = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.off(event, handler as (...args: unknown[]) => void);
  }, []);

  const once = useCallback((event: string, handler: (...args: any[]) => void) => {
    const s = socketRef.current;
    if (!s) return;
    s.once(event, handler as (...args: unknown[]) => void);
  }, []);

  const acceptCall = useCallback(() => {
    if (!incoming) return;
    emit('call:accept', { callId: incoming.callId });
    router.push(`/app/call/${incoming.from.id}?ongoing=${incoming.callId}&type=${incoming.type.toLowerCase()}`);
    setIncoming(null);
  }, [incoming, emit, router]);

  const rejectCall = useCallback(() => {
    if (!incoming) return;
    emit('call:reject', { callId: incoming.callId });
    setIncoming(null);
  }, [incoming, emit]);

  return (
    <RealtimeContext.Provider value={{ socket, connected, joinRoom, leaveRoom, emit, on, off, once, presence }}>
      {children}
      {incoming && (
        <div className="fixed inset-x-0 top-0 z-[80] p-4">
          <div className="mx-auto max-w-md rounded-3xl bg-surface-raised border border-surface-border shadow-2xl p-4 flex items-center gap-3 relative animate-slide-down">
            <div className="h-2 w-2 absolute top-3 right-3 rounded-full bg-brand-500 animate-pulse" />
            <Avatar src={incoming.from.avatarUrl as string | undefined} name={incoming.from.displayName} size="lg" online />
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">{incoming.from.displayName}</p>
              <p className="text-xs text-white/60">Incoming {incoming.type === 'VIDEO' ? 'video' : 'audio'} call…</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={rejectCall}
                className="h-12 w-12 rounded-full bg-red-600 text-white flex items-center justify-center active:scale-90 transition-transform"
                aria-label="Decline"
              >
                <CloseIcon />
              </button>
              <button
                onClick={acceptCall}
                className="h-12 w-12 rounded-full bg-green-500 text-white flex items-center justify-center active:scale-90 transition-transform"
                aria-label="Accept"
              >
                <PhoneIcon />
              </button>
            </div>
          </div>
        </div>
      )}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeContextType {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within RealtimeProvider');
  return ctx;
}
