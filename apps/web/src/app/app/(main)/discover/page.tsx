'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { api, post, mediaUrl } from '@/lib/api';
import { mapFeed } from '@/lib/api-users';
import type { FeedUser, PublicUser } from '@/lib/api-users';
import { VerifiedIcon } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Button';
import { CloseIcon, HeartIcon, RefreshIcon, SparkleIcon, StarIcon, ZapIcon, PhoneIcon } from '@/components/ui/Icons';

export default function DiscoverPage() {
  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex flex-col overflow-hidden">
      <header className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Discover</h1>
          <p className="text-xs text-white/50">Swipe right to connect</p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/talknow" className="flex items-center gap-1 px-3 py-2 rounded-full bg-gradient-to-r from-brand-600 to-pink-600 text-white text-xs font-bold shadow-glow">
            <PhoneIcon size={12} /> Talk Now
          </Link>
          <Link href="/app/filters" className="p-2 rounded-full bg-surface-overlay border border-surface-border text-white/70 hover:text-white">
            <FilterIcon />
          </Link>
          <Link href="/app/premium" className="flex items-center gap-1 px-3 py-2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-black text-xs font-bold">
            <StarIcon size={12} /> Get Plus
          </Link>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <SwipeStack />
      </div>
    </div>
  );
}

function SwipeStack() {
  const [queue, setQueue] = useState<FeedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const dragging = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api<{ items: (PublicUser & { compatibilityScore?: number; matchLabel?: string })[] }>('/discovery/feed?limit=20', { auth: true })
      .then((data) => {
        if (!cancelled) setQueue((data.items ?? []).map(mapFeed));
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Could not load anyone');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const current = queue[0];
  const next = queue[1];

  const onSwipe = (dir: 'left' | 'right', type: 'like' | 'super_like' = 'like') => {
    if (!current) return;
    setDirection(dir);
    if (dir === 'right') {
      setLikeCount((c) => c + 1);
      setError('');
      post<{ liked: boolean; isMatch: boolean }>('/discovery/like', { userId: current.id, type }).catch((e) =>
        setError(e?.message || 'Could not like')
      );
    } else {
      post('/discovery/pass', { userId: current.id }).catch(() => {});
    }
    setTimeout(() => {
      setQueue((q) => q.slice(1));
      setDirection(null);
    }, 250);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <Spinner className="h-8 w-8 text-white/40" />
        <p className="text-sm text-white/50 mt-4">Finding people for you…</p>
      </div>
    );
  }

  if (!current && error) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="h-16 w-16 rounded-full bg-surface-overlay flex items-center justify-center mb-4">
          <RefreshIcon className="text-white/40" />
        </div>
        <p className="font-semibold">Couldn&apos;t load your feed</p>
        <p className="text-sm text-white/50 mt-1 mb-4">{error}</p>
        <Link href="/app/discover" onClick={() => setReloadKey((k) => k + 1)}>
          <span className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold">Try again</span>
        </Link>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="h-16 w-16 rounded-full bg-surface-overlay flex items-center justify-center mb-4">
          <RefreshIcon className="text-white/40" />
        </div>
        <p className="font-semibold">You&apos;ve seen everyone near you</p>
        <p className="text-sm text-white/50 mt-1 mb-4">Check back later or expand your filters</p>
        <Link href="/app/discover">
          <span className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold">Browse filters</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm" style={{ height: 480 }}>
      <AnimatePresence>
        {next && !direction && (
          <motion.div
            key={next.id}
            className="absolute inset-0"
            style={{ scale: 0.96, opacity: 0.7 }}
            initial={false}
          >
            <SwipeCard user={next} />
          </motion.div>
        )}
        {current && (
          <motion.div
            key={current.id}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ x: direction === 'left' ? -400 : direction === 'right' ? 400 : 0, opacity: 0, rotate: direction === 'left' ? -20 : direction === 'right' ? 20 : 0 }}
            transition={{ duration: 0.25 }}
          >
            <SwipeCard user={current} overlay={direction === 'left' ? 'Nope' : direction === 'right' ? 'Like' : ''} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="absolute -bottom-4 inset-x-0 flex items-center justify-center gap-5">
        <button onClick={() => onSwipe('left')} className="h-14 w-14 rounded-full bg-surface-raised border border-surface-border text-white/80 flex items-center justify-center shadow active:scale-90 transition-transform" aria-label="Pass">
          <CloseIcon />
        </button>
        <button onClick={() => onSwipe('left')} className="h-11 w-11 rounded-full bg-surface-raised border border-surface-border text-blue-400 flex items-center justify-center active:scale-90 transition-transform" aria-label="Rewind">
          <RefreshIcon size={18} />
        </button>
        <button onClick={() => onSwipe('right')} className="h-14 w-14 rounded-full bg-surface-raised border border-surface-border text-brand-500 flex items-center justify-center shadow active:scale-90 transition-transform" aria-label="Like">
          <SparkleIcon />
        </button>
        <button onClick={() => onSwipe('right', 'super_like')} className="h-11 w-11 rounded-full bg-surface-raised border border-surface-border text-amber-400 flex items-center justify-center active:scale-90 transition-transform" aria-label="Super like">
          <ZapIcon size={18} />
        </button>
        <button onClick={() => onSwipe('right', 'super_like')} className="h-14 w-14 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 border border-pink-400/40 flex items-center justify-center shadow active:scale-90 transition-transform" aria-label="Super like with heart">
          <HeartIcon />
        </button>
      </div>
      <p className="text-center text-xs text-white/40 mt-16">{likeCount} liked</p>
      {error && <p className="text-center text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

function SwipeCard({ user, overlay = '' }: { user: FeedUser; overlay?: string }) {
  const likes = useMemo(() => {
    const arr = new Set([...user.interests, 'Music', 'Travel']);
    return [...arr].slice(0, 4);
  }, [user]);

  const src = mediaUrl(user.avatarUrl);

  return (
    <div className="absolute inset-0 rounded-3xl overflow-hidden border border-surface-border bg-surface-overlay">
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt={user.displayName} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center font-bold text-brand-300 text-6xl bg-gradient-to-br from-surface-overlay to-surface-raised">
          {(user.displayName || '?').charAt(0).toUpperCase()}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

      {overlay && (
        <div className={`absolute top-8 left-3 px-3 py-1 rounded-lg border-2 font-extrabold text-2xl rotate-[-12deg] ${overlay === 'Like' ? 'border-green-400 text-green-400' : 'border-red-400 text-red-400'}`}>
          {overlay.toUpperCase()}
        </div>
      )}

      <div className="absolute top-3 left-3 flex gap-1.5">
        {user.isCreator && <Badge color="amber">🎙️ Listener</Badge>}
        {user.badges.includes('TRENDING') && <Badge color="brand">🔥 Hot</Badge>}
      </div>

      <div className="absolute bottom-0 inset-x-0 p-4">
        <div className="flex items-center gap-1.5">
          <span className="text-2xl font-bold">{user.displayName}{user.age ? `, ${user.age}` : ''}</span>
          {user.isVerified && <VerifiedIcon size={16} />}
        </div>
        <p className="text-white/90 text-sm mt-0.5">{user.city} · {user.matchLabel || (user.compatibilityScore != null ? `${user.compatibilityScore}% match` : '')} · Speaks {user.languages[0] || ''}</p>
        <p className="text-white/80 text-sm mt-2 line-clamp-2">{user.bio}</p>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {likes.map((l) => (
            <span key={l} className="text-[10px] px-2.5 py-1 rounded-full glass text-white/90">{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}
