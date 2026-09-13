'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRealtime } from '@/lib/realtime-context';
import { api, post } from '@/lib/api';
import { Avatar, VerifiedIcon } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { CloseIcon, PhoneIcon, ChatIcon, RefreshIcon } from '@/components/ui/Icons';

interface MatchedUser {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  gender: string;
  isCreator: boolean;
  isVerified: boolean;
  premiumTier: string;
}

interface Listener {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  gender: string;
  isCreator: boolean;
  isVerified: boolean;
  premiumTier: string;
  matchScore: number;
  sharedInterests: string[];
}

interface MatchData {
  matchedWith: MatchedUser;
  compatibilityScore: number;
  sharedInterests?: string[];
  shared?: string[];
  mode?: string;
}

type Phase = 'idle' | 'searching' | 'matched' | 'no_match';

export default function TalkNowPage() {
  const { connected, emit, on } = useRealtime();
  const [phase, setPhase] = useState<Phase>('idle');
  const [match, setMatch] = useState<MatchData | null>(null);
  const [listeners, setListeners] = useState<Listener[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  };

  // listen for match:found
  useEffect(() => {
    if (!on) return;
    return on('match:found', (data: MatchData) => {
      if (phase !== 'searching') return;
      stopPolling();
      setMatch(data);
      setPhase('matched');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, phase]);

  const loadListeners = async () => {
    try {
      const d = await api<{ items: Listener[] }>('/calls/talk-now/listeners?limit=20', { auth: true });
      setListeners(d.items ?? []);
    } catch {
      setListeners([]);
    }
  };

  const beginSearch = (btnPhase: 'matched' | 'random') => {
    setPhase('searching');
    setMatch(null);
    startTimeRef.current = Date.now();
    try {
      emit('match:start', { mode: btnPhase === 'matched' ? 'matched' : 'random' }, (res: any) => {
        if (res?.ok && res.matched && res.match) {
          stopPolling();
          setMatch(res.match);
          setPhase('matched');
        }
      });
    } catch {
      /* ignore */
    }

    // fallback polling
    pollRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed > 60000) {
        stopPolling();
        emit('match:cancel');
        setPhase('no_match');
        loadListeners();
        return;
      }
      emit('match:poll', {}, (res: any) => {
        if (res?.ok && res.matched && res.match && phase === 'searching') {
          stopPolling();
          setMatch(res.match);
          setPhase('matched');
        } else if (res?.state === 'EXPIRED') {
          stopPolling();
          setPhase('no_match');
          loadListeners();
        }
      });
    }, 3000);

    timeoutRef.current = setTimeout(() => {
      stopPolling();
      emit('match:cancel');
      setPhase('no_match');
      loadListeners();
    }, 60000);
  };

  const cancel = () => {
    stopPolling();
    emit('match:cancel');
    setPhase('idle');
  };

  const refresh = () => beginSearch('matched');

  useEffect(() => () => {
    stopPolling();
    emit('match:cancel');
  }, [emit]);

  return (
    <div className="px-4 pt-4 pb-4">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Talk Now</h1>
        {phase === 'searching' && (
          <button onClick={cancel} className="px-4 py-2 rounded-full bg-red-500/15 text-red-400 text-xs font-semibold">
            Cancel
          </button>
        )}
      </header>

      {!connected && <p className="text-center text-white/40 text-sm mb-4">Connecting to realtime…</p>}

      {phase === 'idle' && (
        <div className="flex flex-col items-center justify-center text-center py-10">
          <div className="h-24 w-24 rounded-full bg-brand-gradient flex items-center justify-center shadow-glow mb-5">
            <PhoneIcon size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold">Ready to talk?</h2>
          <p className="text-white/50 text-sm mt-2 mb-2 max-w-xs">
            We&apos;ll match you with someone who shares your vibe in seconds.
          </p>
          <Button variant="gradient" size="lg" full className="max-w-xs mt-4" onClick={() => beginSearch('matched')}>
            Talk Now
          </Button>
          <Button variant="secondary" size="md" full className="max-w-xs mt-3" onClick={() => beginSearch('random')}>
            Random match
          </Button>
        </div>
      )}

      {phase === 'searching' && (
        <div className="flex flex-col items-center justify-center text-center py-10">
          <div className="relative mb-6">
            <div className="h-24 w-24 rounded-full bg-surface-overlay border border-surface-border flex items-center justify-center">
              <PhoneIcon className="text-white/40" />
            </div>
            <span className="absolute inset-0 rounded-full border-2 border-brand-500 animate-ping" />
          </div>
          <h2 className="text-xl font-semibold">Looking for a match…</h2>
          <p className="text-white/50 text-sm mt-2">This may take up to 60 seconds</p>
          <div className="flex gap-1 mt-6">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-2 w-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      {phase === 'matched' && match && (
        <div className="flex flex-col items-center text-center py-4">
          <div className="h-28 w-28 rounded-full bg-gradient-to-tr from-brand-500 to-pink-500 p-[3px] shadow-glow mb-4">
            <div className="h-full w-full rounded-full bg-surface p-1">
              <Avatar src={match.matchedWith.avatarUrl} name={match.matchedWith.displayName} size="2xl" online verified={match.matchedWith.isVerified} />
            </div>
          </div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            It&apos;s a match! 🎉
          </h2>
          <p className="text-white/60 mt-1">{match.matchedWith.displayName}</p>
          <div className="mt-4 px-4 py-2 rounded-full bg-brand-600/15 border border-brand-500/30 text-brand-300 text-sm font-bold">
            {match.compatibilityScore}% Interest Match
          </div>
          <div className="flex gap-1.5 mt-3 flex-wrap justify-center">
            {(match.sharedInterests || match.shared || []).map((i) => (
              <span key={i} className="text-[11px] px-3 py-1 rounded-full bg-surface-overlay border border-surface-border text-white/70">{i}</span>
            ))}
          </div>

          <div className="w-full mt-6 space-y-2.5 max-w-xs">
            <Link href={`/app/call/${match.matchedWith.id}?type=audio&name=${encodeURIComponent(match.matchedWith.displayName)}`}>
              <Button variant="gradient" size="lg" full icon={<PhoneIcon size={18} />}>Start Call</Button>
            </Link>
            <Link href={`/app/chat/${match.matchedWith.id}`}>
              <Button variant="secondary" size="lg" full icon={<ChatIcon size={18} />}>Keep chatting</Button>
            </Link>
            <Button variant="ghost" size="md" full onClick={() => beginSearch('matched')}>Find another</Button>
          </div>
        </div>
      )}

      {phase === 'no_match' && (
        <div className="text-center py-6">
          <div className="h-16 w-16 rounded-full bg-surface-overlay flex items-center justify-center mb-4 mx-auto">
            <RefreshIcon className="text-white/40" />
          </div>
          <h2 className="text-xl font-semibold">No one is available right now</h2>
          <p className="text-white/50 text-sm mt-2 mb-5">Try refreshing or browse people who are online now.</p>
          <div className="flex gap-2 justify-center mb-8">
            <Button variant="gradient" size="md" icon={<RefreshIcon size={16} />} onClick={refresh}>Refresh</Button>
            <Link href="/app/filters">
              <Button variant="secondary" size="md">Change Preferences</Button>
            </Link>
          </div>

          <div className="text-left">
            <p className="font-bold mb-3">Browse available listeners</p>
            <div className="space-y-2">
              {listeners.length === 0 && (
                <p className="text-center text-white/40 text-sm py-6">No listeners online right now</p>
              )}
              {listeners.map((l) => (
                <div key={l.id} className="flex items-center gap-3 p-3 bg-surface-raised rounded-2xl border border-surface-border">
                  <Avatar src={l.avatarUrl} name={l.displayName} size="md" online verified={l.isVerified} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate flex items-center gap-1">
                      {l.displayName}
                      {l.isVerified && <VerifiedIcon size={12} />}
                    </p>
                    <p className="text-[11px] text-white/50">{l.matchScore}% match{l.sharedInterests.length ? ` · ${l.sharedInterests.join(', ')}` : ''}</p>
                  </div>
                  <Link href={`/app/call/${l.id}?type=audio&name=${encodeURIComponent(l.displayName)}`}>
                    <Button variant="gradient" size="sm" icon={<PhoneIcon size={14} />}>Call</Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
