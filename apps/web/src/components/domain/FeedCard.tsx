'use client';

import React from 'react';
import Link from 'next/link';
import { Avatar, CreatorBadge, PremiumBadge, VerifiedIcon } from '@/components/ui/Avatar';
import { CoinIcon, PhoneIcon, VideoIcon } from '@/components/ui/Icons';
import { Badge } from '@/components/ui/Card';
import type { MockUser } from '@/lib/mock';

export function FeedCard({ user }: { user: MockUser }) {
  return (
    <div className="bg-surface-raised rounded-2xl overflow-hidden border border-surface-border">
      <div className="relative h-44">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.avatarUrl!} alt={user.displayName} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {user.isPremium && <PremiumBadge tier="PREMIUM" />}
          {user.badges.includes('TRENDING') && <Badge color="amber">🔥 Trending</Badge>}
        </div>
        <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold">{user.displayName}, {user.age}</span>
              {user.isVerified && <VerifiedIcon size={14} />}
            </div>
            <p className="text-[11px] text-white/80">{user.city}{user.distance ? ` · ${user.distance} away` : ''}</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/app/call/${user.id}?type=audio&name=${encodeURIComponent(user.displayName)}`} aria-label={`Audio call with ${user.displayName}`}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full glass text-white transition-transform active:scale-90" role="presentation">
                <PhoneIcon size={16} />
              </span>
            </Link>
            <Link href={`/app/call/${user.id}?type=video&name=${encodeURIComponent(user.displayName)}`} aria-label={`Video call with ${user.displayName}`}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full glass text-white transition-transform active:scale-90" role="presentation">
                <VideoIcon size={16} />
              </span>
            </Link>
          </div>
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs text-white/70 line-clamp-1">{user.bio}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-1 flex-wrap max-w-[70%]">
            {user.interests.slice(0, 3).map((it) => (
              <span key={it} className="text-[9px] px-2 py-0.5 rounded-full bg-surface-overlay text-white/50">{it}</span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {user.isCreator && <CreatorBadge />}
            {user.totalCoins && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                <CoinIcon size={11} /> {user.totalCoins.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <Link href={`/app/profile/${user.id}`} className="mt-2.5 block w-full h-9 rounded-xl bg-brand-600/15 border border-brand-500/30 text-brand-300 text-xs font-semibold flex items-center justify-center hover:bg-brand-600/25 transition-colors">
          View Profile
        </Link>
      </div>
    </div>
  );
}
