'use client';

import React from 'react';
import Link from 'next/link';
import { HeartIcon, CloseIcon, StarIcon } from '@/components/ui/Icons';
import { VerifiedIcon } from '@/components/ui/Avatar';
import type { MockUser } from '@/lib/mock';
import type { FeedUser } from '@/lib/api-users';

type UserProp = MockUser | FeedUser | any;

export function FeedCard({ user }: { user: UserProp }) {
  return (
    <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden group shrink-0" style={{ scrollSnapAlign: 'start' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={user.avatarUrl || `https://i.pravatar.cc/150?u=${user.id}`} alt={user.displayName} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-black/20 to-black/30 opacity-90" />
      
      {/* Top Left Status Pill */}
      <div className="absolute top-4 left-4">
        {user.onlineStatus ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
            <span className="text-[11px] font-medium text-white">Online now</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
            <span className="text-[11px] font-medium text-white/70">Just now</span>
          </div>
        )}
      </div>

      {/* Top right 3-dots */}
      <div className="absolute top-4 right-4">
        <button className="h-8 w-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white border border-white/10">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      </div>
      
      {/* Bottom Content */}
      <div className="absolute bottom-4 inset-x-4 flex justify-between items-end">
        <div className="flex-1 pr-2">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xl font-bold tracking-tight text-white drop-shadow-sm">{user.displayName}, {user.age}</span>
            {user.isVerified && <VerifiedIcon size={16} />}
          </div>
          <p className="text-[13px] text-white/80 font-medium mb-3">
            {user.city || '2 km away'}
          </p>
          
          <div className="flex flex-wrap gap-1.5">
            {(user.interests || ['Music', 'Travel', 'Art']).slice(0, 3).map((interest: string) => (
              <span key={interest} className="px-2.5 py-1 rounded-full bg-black/50 text-[11px] font-medium text-white/90 border border-white/10 backdrop-blur-sm">
                {interest}
              </span>
            ))}
          </div>
        </div>
        
        {/* Actions inside card */}
        <div className="flex flex-col gap-3 shrink-0">
          <button className="h-10 w-10 rounded-full bg-[#1a1a1c] border border-white/10 shadow-lg flex items-center justify-center text-white/70 hover:text-white transition-transform active:scale-95">
             <CloseIcon size={18} className="stroke-[3px]" />
          </button>
          <button className="h-10 w-10 rounded-full bg-[#FF4DBD] border-2 border-surface shadow-[0_0_15px_rgba(255,77,189,0.5)] flex items-center justify-center text-white transition-transform active:scale-95">
             <HeartIcon size={20} className="fill-current" />
          </button>
          <button className="h-10 w-10 rounded-full bg-blue-500/20 border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)] flex items-center justify-center text-blue-400 transition-transform active:scale-95">
             <StarIcon size={18} className="fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}
