'use client';

import React from 'react';
import Link from 'next/link';
import { Avatar, CreatorBadge, PremiumBadge, VerifiedIcon } from '@/components/ui/Avatar';
import { CoinIcon, PhoneIcon, VideoIcon } from '@/components/ui/Icons';
import { Badge } from '@/components/ui/Card';
import type { MockUser } from '@/lib/mock';

export function FeedCard({ user }: { user: MockUser }) {
  return (
    <div className="glass-panel rounded-3xl overflow-hidden group">
      <div className="relative h-64 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.avatarUrl!} alt={user.displayName} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-black/20 to-transparent" />
        
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {user.isPremium && <PremiumBadge tier="PREMIUM" />}
          {user.badges.includes('TRENDING') && <Badge color="amber">🔥 Trending</Badge>}
        </div>
        
        <div className="absolute bottom-3 inset-x-4 flex items-end justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white">{user.displayName}</span>
              <span className="text-lg font-light text-white/80">{user.age}</span>
              {user.isVerified && <VerifiedIcon size={16} />}
            </div>
            <p className="text-xs text-white/60 font-medium flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shadow-glow"></span>
              {user.city}{user.distance ? ` · ${user.distance} away` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/app/call/${user.id}?type=audio&name=${encodeURIComponent(user.displayName)}`} aria-label={`Audio call with ${user.displayName}`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full glass backdrop-blur-md text-white transition-all active:scale-90 hover:bg-white/20 hover:text-brand-300" role="presentation">
                <PhoneIcon size={18} />
              </span>
            </Link>
            <Link href={`/app/call/${user.id}?type=video&name=${encodeURIComponent(user.displayName)}`} aria-label={`Video call with ${user.displayName}`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 shadow-glow text-white transition-all active:scale-90 hover:bg-brand-500" role="presentation">
                <VideoIcon size={18} />
              </span>
            </Link>
          </div>
        </div>
      </div>
      
      <div className="p-4 pt-2">
        <p className="text-sm text-white/70 line-clamp-2 leading-relaxed">{user.bio}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-1.5 flex-wrap max-w-[70%]">
            {user.interests.slice(0, 3).map((it) => (
              <span key={it} className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60">{it}</span>
            ))}
          </div>
          <div className="flex items-center gap-2.5">
            {user.isCreator && <CreatorBadge />}
            {user.totalCoins && (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                <CoinIcon size={12} /> {user.totalCoins.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <Link href={`/app/profile/${user.id}`} className="mt-4 block w-full h-11 rounded-2xl glass border border-white/10 text-white/90 text-sm font-semibold flex items-center justify-center hover:bg-white/10 transition-colors">
          View Profile
        </Link>
      </div>
    </div>
  );
}
