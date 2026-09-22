'use client';

import React from 'react';
import Link from 'next/link';
import { CoinIcon, HeartIcon, ChatIcon, SparkleIcon, VideoIcon } from '@/components/ui/Icons';
import { VerifiedIcon } from '@/components/ui/Avatar';
import type { MockUser } from '@/lib/mock';

export function FeedCard({ user }: { user: MockUser }) {
  return (
    <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={user.avatarUrl!} alt={user.displayName} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-black/30 to-transparent opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent opacity-50" />
      
      {/* Top right floating badges */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button className="h-8 w-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      </div>
      
      {/* Bottom Content */}
      <div className="absolute bottom-4 inset-x-4">
        <div className="flex items-center gap-2 mb-1">
          {user.avatarUrl && (
             // eslint-disable-next-line @next/next/no-img-element
             <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full border border-white/20 object-cover shadow-sm" />
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight text-white drop-shadow-sm">{user.displayName}, {user.age}</span>
              {user.isVerified && <VerifiedIcon size={16} />}
            </div>
            <p className="text-[11px] text-white/70 font-medium flex items-center gap-1.5 drop-shadow-sm">
              {user.onlineStatus ? <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shadow-glow"></span> : null}
              {user.onlineStatus ? 'Online now' : 'Just now'}
            </p>
          </div>
        </div>
        
        <p className="text-[13px] text-white/90 mb-4 drop-shadow-sm">{user.bio}</p>
        
        <div className="flex items-center gap-4">
           <button className="flex items-center gap-1.5 group/btn">
             <span className="h-10 w-10 rounded-full bg-brand-gradient flex items-center justify-center text-white shadow-glow transition-transform group-active/btn:scale-95 border-2 border-transparent hover:border-white/20">
               <HeartIcon size={20} className="fill-current" />
             </span>
           </button>
           <Link href={`/app/chat/${user.id}`} className="flex items-center gap-1.5 group/btn">
             <span className="h-10 w-10 rounded-full bg-surface/50 backdrop-blur-md flex items-center justify-center text-white border border-white/20 transition-transform group-active/btn:scale-95 hover:bg-surface/70">
               <ChatIcon size={20} />
             </span>
           </Link>
           <Link href={`/app/call/${user.id}?type=video&name=${encodeURIComponent(user.displayName)}`} className="flex items-center gap-1.5 group/btn ml-auto">
             <span className="h-10 w-10 rounded-full bg-surface/50 backdrop-blur-md flex items-center justify-center text-white border border-white/20 transition-transform group-active/btn:scale-95 hover:bg-surface/70">
               <VideoIcon size={20} />
             </span>
           </Link>
        </div>
      </div>
    </div>
  );
}
