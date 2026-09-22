'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, mediaUrl } from '@/lib/api';
import { mapFeed } from '@/lib/api-users';
import type { FeedUser, PublicUser } from '@/lib/api-users';
import { Spinner } from '@/components/ui/Button';
import { SearchIcon, HeartIcon } from '@/components/ui/Icons';
import { VerifiedIcon } from '@/components/ui/Avatar';

export default function DiscoverPage() {
  const [feed, setFeed] = useState<FeedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api<{ items: (PublicUser & { compatibilityScore?: number; matchLabel?: string })[] }>('/discovery/feed?limit=30', { auth: true })
      .then((data) => {
        if (!cancelled) setFeed((data.items ?? []).map(mapFeed));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="pt-safe pb-[100px] min-h-dvh flex flex-col bg-[#0a0a0c]">
      <header className="px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Discover</h1>
          <p className="text-sm text-white/60">Find your perfect match</p>
        </div>
        <div className="flex gap-3">
          <button className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:text-white">
            <SearchIcon size={20} />
          </button>
          <button className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:text-white">
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 py-2 mb-4 flex gap-3 overflow-x-auto no-scrollbar">
        <button className="shrink-0 px-5 py-2 rounded-full bg-[#FF4DBD] text-white text-sm font-bold shadow-[0_0_15px_rgba(255,77,189,0.3)]">
          For You
        </button>
        <button className="shrink-0 px-5 py-2 rounded-full border border-white/20 text-white/70 text-sm font-medium hover:bg-white/5">
          Nearby
        </button>
        <button className="shrink-0 px-5 py-2 rounded-full border border-white/20 text-white/70 text-sm font-medium hover:bg-white/5">
          New
        </button>
        <button className="shrink-0 px-5 py-2 rounded-full border border-white/20 text-white/70 text-sm font-medium hover:bg-white/5">
          Verified
        </button>
        <button className="shrink-0 px-5 py-2 rounded-full border border-white/20 text-white/70 text-sm font-medium hover:bg-white/5">
          Online
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner className="h-8 w-8 text-[#FF4DBD]" />
        </div>
      ) : (
        <div className="px-4 columns-2 gap-4 space-y-4">
          {feed.map((u) => (
            <DiscoverCard key={u.id} user={u} />
          ))}
        </div>
      )}
    </div>
  );
}

function DiscoverCard({ user }: { user: FeedUser }) {
  const src = mediaUrl(user.avatarUrl) || `https://i.pravatar.cc/300?u=${user.id}`;
  // randomize height for masonry effect
  const isTall = parseInt(user.id, 16) % 2 === 0;

  return (
    <div className={`relative w-full ${isTall ? 'aspect-[3/4]' : 'aspect-square'} rounded-3xl overflow-hidden group mb-4 inline-block`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={user.displayName} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      
      {/* Top Left Status Pill */}
      <div className="absolute top-3 left-3">
        {user.onlineStatus ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
            <span className="text-[9px] font-bold uppercase text-white">Online</span>
          </div>
        ) : null}
      </div>

      {/* Top right 3-dots */}
      <div className="absolute top-3 right-3">
        <button className="h-6 w-6 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white border border-white/10">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/></svg>
        </button>
      </div>

      {/* Bottom Content */}
      <div className="absolute bottom-3 left-3 right-10">
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-[15px] font-bold text-white leading-tight truncate">{user.displayName.split(' ')[0]}, {user.age}</span>
          {user.isVerified && <VerifiedIcon size={12} />}
        </div>
        <p className="text-[11px] text-white/70 mb-2 truncate">
          {user.city || '2 km away'}
        </p>
        <div className="flex gap-1 flex-wrap">
          {(user.interests || ['Music', 'Travel']).slice(0, 2).map((interest: string) => (
            <span key={interest} className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white/10 text-white/90 backdrop-blur-sm">
              {interest}
            </span>
          ))}
        </div>
      </div>

      {/* Overlay Action Button Bottom Right */}
      <button className="absolute bottom-3 right-3 h-10 w-10 rounded-full bg-[#FF4DBD] border-2 border-surface shadow-[0_0_10px_rgba(255,77,189,0.4)] flex items-center justify-center text-white active:scale-95 transition-transform z-10">
        <HeartIcon size={20} className="fill-current" />
      </button>
    </div>
  );
}
