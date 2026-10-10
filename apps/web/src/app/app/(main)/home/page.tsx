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
import { VuzkiLogo } from '@/components/ui/VuzkiLogo';

export default function HomePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'for_you' | 'nearby' | 'new' | 'popular'>('for_you');
  const [feed, setFeed] = useState<FeedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ items: (PublicUser & { compatibilityScore?: number; matchLabel?: string })[] }>(`/discovery/feed?limit=20&mode=${tab}`, { auth: true })
      .then((data) => {
        if (!cancelled) setFeed((data.items ?? []).map(mapFeed));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tab]);

  const stories = useMemo(() => feed.filter((u) => u.onlineStatus).slice(0, 10).map((u, i) => ({ user: u, viewed: i > 2 })), [feed]);

  if (!user || (loading && feed.length === 0)) {
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
        <VuzkiLogo size={28} showTagline={false} />
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
          <button onClick={() => setTab('for_you')} className="relative focus:outline-none">
            <span className={`text-lg transition-colors ${tab === 'for_you' ? 'text-white font-bold' : 'text-white/50 font-medium hover:text-white/80'}`}>For You</span>
            {tab === 'for_you' && <div className="absolute -bottom-1 left-0 right-0 h-1 bg-[#FF4DBD] rounded-full" />}
          </button>
          <button onClick={() => setTab('nearby')} className="relative focus:outline-none">
            <span className={`text-lg transition-colors ${tab === 'nearby' ? 'text-white font-bold' : 'text-white/50 font-medium hover:text-white/80'}`}>Nearby</span>
            {tab === 'nearby' && <div className="absolute -bottom-1 left-0 right-0 h-1 bg-[#FF4DBD] rounded-full" />}
          </button>
          <button onClick={() => setTab('new')} className="relative focus:outline-none">
            <span className={`text-lg transition-colors ${tab === 'new' ? 'text-white font-bold' : 'text-white/50 font-medium hover:text-white/80'}`}>New</span>
            {tab === 'new' && <div className="absolute -bottom-1 left-0 right-0 h-1 bg-[#FF4DBD] rounded-full" />}
          </button>
          <button onClick={() => setTab('popular')} className="relative focus:outline-none">
            <span className={`text-lg transition-colors ${tab === 'popular' ? 'text-white font-bold' : 'text-white/50 font-medium hover:text-white/80'}`}>Popular</span>
            {tab === 'popular' && <div className="absolute -bottom-1 left-0 right-0 h-1 bg-[#FF4DBD] rounded-full" />}
          </button>
        </div>
        <Link href="/app/filters" className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/5">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
             <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
           </svg>
        </Link>
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
          <Link href="/app/premium" className="px-4 py-2 rounded-full bg-[#FF4DBD] text-white text-xs font-bold hover:brightness-110 transition-all">
            Upgrade
          </Link>
        </div>
      </div>
    </div>
  );
}
