'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api, mediaUrl } from '@/lib/api';
import { mapFeed } from '@/lib/api-users';
import type { FeedUser, PublicUser } from '@/lib/api-users';
import { Avatar, CreatorBadge, PremiumBadge, VerifiedIcon } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Button';
import { CoinIcon, MicIcon, SearchIcon, SparkleIcon, PhoneIcon } from '@/components/ui/Icons';
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

  const featured = useMemo(() => feed.filter((u) => u.isCreator).slice(0, 6), [feed]);
  const online = useMemo(() => feed.filter((u) => u.onlineStatus).slice(0, 10), [feed]);
  const forYou = useMemo(() => feed.slice(6, 16), [feed]);
  const stories = useMemo(
    () =>
      feed
        .filter((u) => u.onlineStatus)
        .slice(0, 5)
        .map((u, i) => ({ user: u, viewed: i > 2 })),
    [feed]
  );

  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-6 w-6 text-white/50" />
      </div>
    );
  }

  const firstName = user.displayName?.split(' ')[0] || 'there';

  return (
    <div className="px-4 pt-4 pb-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-white/50">Hi {firstName} 👋</p>
          <h1 className="text-xl font-bold tracking-tight">
            Let&apos;s <span className="bg-gradient-to-r from-brand-400 to-pink-500 bg-clip-text text-transparent">connect</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/app/search" className="p-2 text-white/70 hover:text-white rounded-full hover:bg-surface-overlay">
            <SearchIcon />
          </Link>
          <Link href="/app/wallet" className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-surface-overlay border border-surface-border text-amber-400">
            <CoinIcon />
            <span className="text-xs font-semibold">{user.wallet?.balance?.toLocaleString() ?? '120'}</span>
          </Link>
          <Link href="/app/notifications">
            <span className="relative inline-flex">
              <Avatar src={user.avatarUrl} name={user.displayName} size="sm" online />
              <span className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-pink-500 rounded-full border-2 border-surface" />
            </span>
          </Link>
        </div>
      </header>

      {/* Curated daily card */}
      <div className="relative rounded-3xl overflow-hidden mb-6 bg-gradient-to-br from-brand-900/40 to-pink-900/20 border border-white/5 shadow-float">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
        <div className="relative p-5 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-bold tracking-wider text-white/90 mb-2">
              <SparkleIcon size={12} className="text-brand-300" /> DAILY CURATED
            </div>
            <h3 className="font-extrabold text-xl leading-tight text-white shadow-sm">Your perfect matches</h3>
            <p className="text-brand-200/80 text-xs mt-1 font-medium">{featured.length} creators matched to you</p>
          </div>
          <div className="flex -space-x-3">
            {featured.slice(0, 3).map((u) => {
              const src = mediaUrl(u.avatarUrl);
              return (
              <div key={u.id} className="h-14 w-14 rounded-full border-2 border-surface bg-surface-overlay overflow-hidden shadow-glass">
                {src ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={src} alt={u.displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-brand-300 text-lg bg-surface-raised">
                    {(u.displayName || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Talk Now CTA */}
      <Link href="/app/talknow" className="group block mb-6 rounded-3xl overflow-hidden relative bg-brand-gradient border border-white/10 shadow-glow hover:shadow-glow-pink transition-all duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.3),transparent_50%)]" />
        <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
           <PhoneIcon size={120} />
        </div>
        <div className="relative p-5 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/20 backdrop-blur-md text-[10px] font-bold tracking-wider text-white mb-2 shadow-sm">
              <PhoneIcon size={12} className="animate-pulse" /> LIVE NOW
            </div>
            <h3 className="font-extrabold text-xl leading-tight text-white drop-shadow-md">Talk to a stranger</h3>
            <p className="text-white/80 text-sm mt-1 font-medium">Audio & video · No matches needed</p>
          </div>
          <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 shadow-glass group-hover:scale-110 transition-transform duration-300">
            <PhoneIcon size={24} className="text-white" />
          </div>
        </div>
      </Link>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      {/* Stories */}
      <StoriesRow stories={stories} />

      {/* Online now */}
      <section className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Online Now</h2>
          <Link href="/app/discover" className="text-xs text-brand-400">Discover</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4">
          {online.map((u) => (
            <OnlinePill key={u.id} user={u} />
          ))}
        </div>
      </section>

      {/* For you feed */}
      <section className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">For You</h2>
          <Link href="/app/discover" className="text-xs text-brand-400">View all</Link>
        </div>
        <div className="space-y-4">
          {forYou.map((u) => (
            <FeedCard key={u.id} user={u} />
          ))}
        </div>
      </section>
    </div>
  );
}

function StoriesRow({ stories }: { stories: { user: FeedUser; viewed: boolean }[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 mb-5">
      <Link href="/app/profile" className="shrink-0 flex flex-col items-center gap-1">
        <div className="relative">
          <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-brand-500 to-pink-500 p-[2px]">
            <div className="h-full w-full rounded-full bg-surface flex items-center justify-center">
              <span className="text-2xl">+</span>
            </div>
          </div>
        </div>
        <span className="text-[10px] text-white/60">Your story</span>
      </Link>
      {stories.map((s) => (
        <Link key={s.user.id} href={`/app/profile/${s.user.id}`} className="shrink-0 flex flex-col items-center gap-1">
          <div className={`h-16 w-16 rounded-full p-[2px] ${s.viewed ? 'bg-surface-border' : 'bg-gradient-to-tr from-brand-500 to-pink-500'}`}>
            <div className="h-full w-full rounded-full bg-surface p-0.5">
                {(() => {
                  const src = mediaUrl(s.user.avatarUrl);
                  return src ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={src} alt={s.user.displayName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full flex items-center justify-center font-bold text-brand-300 text-lg bg-gradient-to-br from-surface-overlay to-surface-raised">
                      {(s.user.displayName || '?').charAt(0).toUpperCase()}
                    </div>
                  );
                })()}
              </div>
          </div>
          <span className="text-[10px] text-white/70">{s.user.displayName.split(' ')[0]}</span>
        </Link>
      ))}
    </div>
  );
}

function OnlinePill({ user }: { user: FeedUser }) {
  return (
    <Link href={`/app/profile/${user.id}`} className="shrink-0 flex flex-col items-center gap-1">
      <span className="relative">
        <Avatar src={user.avatarUrl} name={user.displayName} size="lg" online />
      </span>
      <span className="text-[10px] text-white/70">{user.displayName.split(' ')[0]}</span>
      <span className="flex items-center gap-1 text-[9px] text-white/40">
        {user.isCreator && <MicIcon size={9} className="text-brand-400" />} {user.countryCode}
      </span>
    </Link>
  );
}
