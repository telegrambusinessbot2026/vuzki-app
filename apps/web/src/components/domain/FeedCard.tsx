'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { HeartIcon, CloseIcon, StarIcon } from '@/components/ui/Icons';
import { VerifiedIcon } from '@/components/ui/Avatar';
import type { FeedUser } from '@/lib/api-users';
import { post } from '@/lib/api';

export function FeedCard({
  user,
  onPass,
  onLike,
  onSuperLike,
}: {
  user: FeedUser | any;
  onPass?: (user: any) => void;
  onLike?: (user: any) => void;
  onSuperLike?: (user: any) => void;
}) {
  const [liked, setLiked] = useState(false);
  const [superLiked, setSuperLiked] = useState(false);
  const [passed, setPassed] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (liked) return;
    setLiked(true);
    try {
      await post('/discovery/like', { userId: user.id, type: 'like' });
      onLike?.(user);
    } catch {
      // Keep optimistic state
    }
  };

  const handleSuperLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (superLiked) return;
    setSuperLiked(true);
    try {
      await post('/discovery/like', { userId: user.id, type: 'super_like' });
      onSuperLike?.(user);
    } catch {
      // Keep optimistic state
    }
  };

  const handlePass = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPassed(true);
    onPass?.(user);
  };

  if (passed) return null;

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

      {/* Top right link to profile */}
      <div className="absolute top-4 right-4">
        <Link href={`/app/profile/${user.id}`} className="h-8 w-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white border border-white/10">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </Link>
      </div>
      
      {/* Bottom Content */}
      <div className="absolute bottom-4 inset-x-4 flex justify-between items-end">
        <Link href={`/app/profile/${user.id}`} className="flex-1 pr-2 cursor-pointer">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xl font-bold tracking-tight text-white drop-shadow-sm">{user.displayName}{user.age ? `, ${user.age}` : ''}</span>
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
        </Link>
        
        {/* Actions inside card */}
        <div className="flex flex-col gap-3 shrink-0">
          <button onClick={handlePass} title="Pass" className="h-10 w-10 rounded-full bg-[#1a1a1c] border border-white/10 shadow-lg flex items-center justify-center text-white/70 hover:text-white transition-transform active:scale-95">
             <CloseIcon size={18} className="stroke-[3px]" />
          </button>
          <button onClick={handleLike} title="Like" className={`h-10 w-10 rounded-full border-2 border-surface shadow-[0_0_15px_rgba(255,77,189,0.5)] flex items-center justify-center transition-transform active:scale-95 ${liked ? 'bg-[#FF4DBD] text-white scale-105' : 'bg-[#FF4DBD]/90 text-white hover:bg-[#FF4DBD]'}`}>
             <HeartIcon size={20} className="fill-current" />
          </button>
          <button onClick={handleSuperLike} title="Super Like" className={`h-10 w-10 rounded-full border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)] flex items-center justify-center transition-transform active:scale-95 ${superLiked ? 'bg-blue-500 text-white scale-105' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'}`}>
             <StarIcon size={18} className="fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}
