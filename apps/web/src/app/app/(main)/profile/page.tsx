'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Avatar, VerifiedIcon } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Button';
import { SettingsIcon, ChevronRightIcon } from '@/components/ui/Icons';

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c]">
        <Spinner className="h-6 w-6 text-[#FF4DBD]" />
      </div>
    );
  }

  const listLinks = [
    { label: 'Account', href: '/app/settings/account' },
    { label: 'Privacy', href: '/app/settings/privacy' },
    { label: 'Notifications', href: '/app/settings/notifications' },
    { label: 'Safety', href: '/app/safety' },
    { label: 'Help Center', href: '/safety' },
  ];

  return (
    <div className="flex flex-col min-h-dvh bg-[#0a0a0c] text-white overflow-y-auto pb-20">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="text-[#FF4DBD]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </div>
          <span className="text-xl font-bold tracking-tight">VUZKI</span>
        </div>
        <Link href="/app/settings" className="p-2 text-white/80 hover:text-white">
          <SettingsIcon size={24} />
        </Link>
      </header>

      {/* Main Profile Area */}
      <div className="px-4 mt-2">
        <div className="flex gap-4">
          <div className="shrink-0">
            <div className="relative">
              <div className="p-1 rounded-full bg-gradient-to-tr from-[#FF4DBD] to-[#A855F7]">
                <Avatar src={user.avatarUrl} name={user.displayName} size="2xl" className="w-24 h-24 border-[3px] border-[#0a0a0c]" />
              </div>
            </div>
          </div>
          
          <div className="flex-1 min-w-0 py-1">
            <div className="flex items-center gap-1.5 mb-1">
              <h2 className="text-xl font-bold truncate">{user.displayName}, 24</h2>
              {user.isVerified && <VerifiedIcon size={16} />}
            </div>
            
            <p className="text-sm text-white/60 mb-2">@{user.username}</p>
            
            <div className="flex items-center gap-1.5 text-xs text-white/80 mb-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span>Online now</span>
            </div>
            
            <div className="flex items-center gap-1 text-xs text-white/60 mb-3">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>New York • 2.5 km away</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-white/80 mt-2 mb-4 leading-relaxed">
          {user.bio || 'Love traveling, coffee, and good conversations. Swipe right if you want to grab a drink! ☕✨'}
        </p>

        <Link href="/app/settings/profile" className="block w-full">
          <button className="w-full py-2.5 rounded-full bg-white/10 text-white font-semibold text-sm hover:bg-white/15 transition-colors">
            Edit Profile
          </button>
        </Link>

        {/* Stats Row */}
        <div className="flex items-center justify-between mt-6 px-2">
          <div className="text-center">
            <p className="font-bold text-lg">—</p>
            <p className="text-xs text-white/50 mt-0.5">Likes</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="font-bold text-lg">—</p>
            <p className="text-xs text-white/50 mt-0.5">Matches</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="font-bold text-lg">—</p>
            <p className="text-xs text-white/50 mt-0.5">Following</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="font-bold text-lg">—</p>
            <p className="text-xs text-white/50 mt-0.5">Profile Views</p>
          </div>
        </div>
      </div>

      {/* Photos */}
      <div className="mt-8">
        <h3 className="px-4 font-bold mb-3">Photos</h3>
        <div className="flex gap-3 overflow-x-auto px-4 pb-2 custom-scrollbar">
          {[1,2,3,4].map(i => (
            <div key={i} className="w-28 h-36 shrink-0 rounded-2xl bg-white/5 overflow-hidden">
              <img src={user.avatarUrl || `https://i.pravatar.cc/150?img=${i}`} alt="Photo" className="w-full h-full object-cover" />
            </div>
          ))}
          <div className="w-28 h-36 shrink-0 rounded-2xl bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center gap-2 text-white/50">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            <span className="text-xs font-medium">Add Photo</span>
          </div>
        </div>
      </div>

      {/* About Me */}
      <div className="px-4 mt-6">
        <div className="bg-[#141416] rounded-2xl p-4">
          <h3 className="font-bold mb-3">About Me</h3>
          <div className="grid grid-cols-2 gap-y-3 gap-x-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/40">📏</span>
              <span>170 cm (5'7")</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/40">🎓</span>
              <span>Bachelors Degree</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/40">💼</span>
              <span>Designer</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/40">🍷</span>
              <span>Socially</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interests */}
      <div className="px-4 mt-4">
        <div className="bg-[#141416] rounded-2xl p-4">
          <h3 className="font-bold mb-3">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {['Photography', 'Traveling', 'Coffee', 'Art', 'Music', 'Reading'].map(it => (
              <span key={it} className="px-3 py-1.5 rounded-full bg-white/5 text-sm font-medium">
                {it}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Links List */}
      <div className="px-4 mt-6 space-y-1">
        {listLinks.map((link, i) => (
          <Link key={i} href={link.href} className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors">
            <span className="font-medium text-[15px]">{link.label}</span>
            <ChevronRightIcon size={20} className="text-white/30" />
          </Link>
        ))}
      </div>
    </div>
  );
}
