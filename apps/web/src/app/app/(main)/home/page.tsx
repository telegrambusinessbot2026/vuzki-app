'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api, mediaUrl } from '@/lib/api';
import { mapFeed } from '@/lib/api-users';
import type { FeedUser, PublicUser } from '@/lib/api-users';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Button';
import { SearchIcon, BellIcon, HeartIcon, ChatIcon, SparkleIcon } from '@/components/ui/Icons';
import { FeedCard } from '@/components/domain/FeedCard';

export default function HomePage() {
  const { user } = useAuth();
  const [feed, setFeed] = useState<FeedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api<{ items: (PublicUser & { compatibilityScore?: number; matchLabel?: string })[] }>('/discovery/feed?limit=20', { auth: true })
      .then((data) => {
        if (!cancelled) setFeed((data.items ?? []).map(mapFeed));
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Could not load feed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stories = useMemo(
    () =>
      feed
        .filter((u) => u.onlineStatus)
        .slice(0, 10)
        .map((u, i) => ({ user: u, viewed: i > 2 })),
    [feed]
  );

  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-6 w-6 text-brand-500" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-safe pb-24 min-h-dvh">
      {/* Header */}
      <header className="flex items-center justify-between py-4 mb-2">
        <div className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 38C20 38 4 28 4 15C4 9.47715 8.47715 5 14 5C17.0678 5 19.8133 6.37923 21.6441 8.5684C23.0805 6.43851 25.5905 5 28.5 5C34.0228 5 38.5 9.47715 38.5 15C38.5 28 20 38 20 38Z" fill="url(#paint0_linear_logo)"/>
            <defs>
              <linearGradient id="paint0_linear_logo" x1="4" y1="5" x2="38.5" y2="38" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FF4DBD"/>
                <stop offset="1" stopColor="#A855F7"/>
              </linearGradient>
            </defs>
          </svg>
          <h1 className="text-xl font-bold tracking-tight text-white">VUZKI</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/app/search" className="p-2 text-white/70 hover:text-white rounded-full bg-surface-raised border border-surface-border">
            <SearchIcon size={20} />
          </Link>
          <Link href="/app/notifications" className="p-2 text-white/70 hover:text-white rounded-full bg-surface-raised border border-surface-border relative">
            <BellIcon size={20} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-brand-500 rounded-full border border-surface" />
          </Link>
        </div>
      </header>

      {/* Stories / Filters Row */}
      <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4 mb-6">
        <button className="shrink-0 flex flex-col items-center gap-2">
          <div className="relative">
            <div className="h-[68px] w-[68px] rounded-full p-[2px] border border-surface-border flex items-center justify-center bg-surface-raised">
              <span className="text-2xl text-white/50">+</span>
            </div>
          </div>
          <span className="text-[11px] font-medium text-white">Add</span>
        </button>
        <button className="shrink-0 flex flex-col items-center gap-2">
          <div className="relative">
            <div className="h-[68px] w-[68px] rounded-full bg-brand-gradient p-[2px] shadow-glow">
              <div className="h-full w-full rounded-full bg-surface p-[2px]">
                 <div className="w-full h-full rounded-full flex items-center justify-center font-bold text-white bg-surface-overlay">
                    <SparkleIcon size={24} className="text-brand-500" />
                 </div>
              </div>
            </div>
          </div>
          <span className="text-[11px] font-medium text-white">New</span>
        </button>
        {stories.map((s, i) => (
          <Link key={s.user.id} href={`/app/profile/${s.user.id}`} className="shrink-0 flex flex-col items-center gap-2">
            <div className={`h-[68px] w-[68px] rounded-full p-[2px] ${s.viewed ? 'border border-surface-border bg-surface-raised' : 'bg-brand-gradient'}`}>
              <div className={`h-full w-full rounded-full p-[2px] ${s.viewed ? '' : 'bg-surface'}`}>
                  {(() => {
                    const src = mediaUrl(s.user.avatarUrl);
                    return src ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={src} alt={s.user.displayName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-full flex items-center justify-center font-bold text-brand-300 text-lg bg-surface-overlay">
                        {(s.user.displayName || '?').charAt(0).toUpperCase()}
                      </div>
                    );
                  })()}
                </div>
            </div>
            <span className="text-[11px] font-medium text-white">{i === 0 ? 'Nearby' : i === 1 ? 'Popular' : s.user.displayName.split(' ')[0]}</span>
          </Link>
        ))}
      </div>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      {/* For you feed */}
      <div className="space-y-6">
        {feed.map((u) => (
          <FeedCard key={u.id} user={u} />
        ))}
      </div>
    </div>
  );
}
