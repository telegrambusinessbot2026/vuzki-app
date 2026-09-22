'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api, mediaUrl } from '@/lib/api';
import { mapFeed } from '@/lib/api-users';
import type { FeedUser, PublicUser } from '@/lib/api-users';
import { Spinner } from '@/components/ui/Button';
import { SearchIcon, BellIcon } from '@/components/ui/Icons';
import { FeedCard } from '@/components/domain/FeedCard';

export default function HomePage() {
  const { user } = useAuth();
  const [feed, setFeed] = useState<FeedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api<{ items: (PublicUser & { compatibilityScore?: number; matchLabel?: string })[] }>('/discovery/feed?limit=20', { auth: true })
      .then((data) => {
        if (!cancelled) setFeed((data.items ?? []).map(mapFeed));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const stories = useMemo(() => feed.filter((u) => u.onlineStatus).slice(0, 10).map((u, i) => ({ user: u, viewed: i > 2 })), [feed]);

  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-6 w-6 text-brand-500" />
      </div>
    );
  }

  return (
    <div className="pt-safe pb-24 min-h-dvh flex flex-col bg-[#0a0a0c]">
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#FF4DBD] to-[#A855F7]">VUZKI</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/app/search" className="text-white/80 hover:text-white">
            <SearchIcon size={24} />
          </Link>
          <Link href="/app/notifications" className="text-white/80 hover:text-white relative">
            <BellIcon size={24} />
            <span className="absolute top-0.5 right-1 h-2 w-2 bg-[#FF4DBD] rounded-full" />
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 py-2 flex items-center justify-between mb-2">
        <div className="flex items-center gap-6">
          <div className="relative">
            <span className="text-white font-bold text-lg pb-1">For You</span>
            <div className="absolute -bottom-1 left-0 right-0 h-1 bg-[#FF4DBD] rounded-full" />
          </div>
          <span className="text-white/50 font-medium text-lg hover:text-white/80 cursor-pointer">Nearby</span>
          <span className="text-white/50 font-medium text-lg hover:text-white/80 cursor-pointer">New</span>
          <span className="text-white/50 font-medium text-lg hover:text-white/80 cursor-pointer">Popular</span>
        </div>
        <button className="text-white/70">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
             <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
           </svg>
        </button>
      </div>

      {/* Stories */}
      <div className="flex gap-4 overflow-x-auto no-scrollbar px-4 py-4 mb-4">
        <div className="shrink-0 flex flex-col items-center gap-2">
          <div className="h-[72px] w-[72px] rounded-full border-2 border-dashed border-white/20 flex items-center justify-center bg-white/5">
            <span className="text-2xl text-white">+</span>
          </div>
          <span className="text-[12px] font-medium text-white/80">Add Story</span>
        </div>
        <div className="shrink-0 flex flex-col items-center gap-2">
          <div className="h-[72px] w-[72px] rounded-full border-2 border-transparent bg-white/10 p-[2px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(user.avatarUrl) || `https://ui-avatars.com/api/?name=${user.displayName}`} alt="You" className="w-full h-full rounded-full object-cover" />
          </div>
          <span className="text-[12px] font-medium text-white/80">Your Story</span>
        </div>
        {stories.map((s, i) => (
          <Link key={s.user.id} href={`/app/profile/${s.user.id}`} className="shrink-0 flex flex-col items-center gap-2">
            <div className={`h-[72px] w-[72px] rounded-full p-[3px] ${s.viewed ? 'bg-white/20' : 'bg-gradient-to-tr from-[#FF4DBD] to-[#A855F7]'}`}>
              <div className="h-full w-full rounded-full border-[3px] border-[#0a0a0c] bg-surface overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(s.user.avatarUrl) || `https://i.pravatar.cc/150?u=${s.user.id}`} alt={s.user.displayName} className="w-full h-full object-cover" />
              </div>
            </div>
            <span className="text-[12px] font-medium text-white/80">{s.user.displayName.split(' ')[0]}</span>
          </Link>
        ))}
      </div>

      {/* Main Carousel */}
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-4 pb-8 no-scrollbar">
        {feed.slice(0, 5).map((u) => (
          <div key={u.id} className="w-[85vw] max-w-[320px] shrink-0 snap-center">
            <FeedCard user={u} />
          </div>
        ))}
      </div>

      {/* People Near You */}
      <div className="px-4 mb-4">
        <h2 className="text-lg font-bold text-white mb-4">People Near You</h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {feed.slice(5, 12).map((u) => (
            <Link key={u.id} href={`/app/profile/${u.id}`} className="shrink-0 w-[100px] flex flex-col">
              <div className="relative aspect-square rounded-2xl overflow-hidden mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(u.avatarUrl) || `https://i.pravatar.cc/150?u=${u.id}`} alt={u.displayName} className="w-full h-full object-cover" />
                {u.onlineStatus && <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#0a0a0c]" />}
              </div>
              <span className="text-[13px] font-bold text-white truncate">{u.displayName.split(' ')[0]}</span>
              <span className="text-[11px] text-white/50">{u.city || '2 km away'}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Banner */}
      <div className="px-4 mt-2">
        <div className="rounded-2xl bg-gradient-to-r from-[#2c1338] to-[#1a0b22] p-4 flex items-center justify-between border border-[#FF4DBD]/20">
          <div>
            <h3 className="font-bold text-white mb-1">Go Premium! 🌟</h3>
            <p className="text-xs text-white/70">See who liked you & more</p>
          </div>
          <button className="px-4 py-2 rounded-full bg-[#FF4DBD] text-white text-xs font-bold">
            Upgrade
          </button>
        </div>
      </div>
    </div>
  );
}
