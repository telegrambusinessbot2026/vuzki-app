'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Avatar, VerifiedIcon } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Button';
import { SettingsIcon, ChevronRightIcon } from '@/components/ui/Icons';
import { BoostProfile } from './BoostProfile';

import { VuzkiLogo } from '@/components/ui/VuzkiLogo';

export default function ProfilePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    likesReceived: 0,
    matches: 0,
    following: 0,
    profileViews: 0,
  });

  useEffect(() => {
    let cancelled = false;
    api<{ user: { following?: number; profileViews?: number; stats?: { likesReceived?: number; matches?: number } } }>('/users/me/profile', { auth: true })
      .then((res) => {
        if (!cancelled && res.user) {
          setStats({
            likesReceived: res.user.stats?.likesReceived ?? 0,
            matches: res.user.stats?.matches ?? 0,
            following: res.user.following ?? 0,
            profileViews: res.user.profileViews ?? 0,
          });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c]">
        <Spinner className="h-6 w-6 text-[#FF4DBD]" />
      </div>
    );
  }

  const listLinks = [
    { label: 'Account & Security', href: '/app/settings/password' },
    { label: 'Profile Information', href: '/app/settings/profile' },
    { label: 'Safety & Blocking', href: '/app/safety' },
    { label: 'Help Center & Support', href: '/app/support' },
    { label: 'Terms & Privacy', href: '/privacy' },
  ];

  const userInterests = user.interests && user.interests.length > 0
    ? user.interests
    : ['Social', 'Conversations', 'Music'];

  return (
    <div className="flex flex-col min-h-dvh bg-[#0a0a0c] text-white overflow-y-auto pb-20">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-6 pb-4">
        <VuzkiLogo size={28} showTagline={false} />
        <Link href="/app/settings" className="p-2 text-white/80 hover:text-white" aria-label="Settings">
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
              <h2 className="text-xl font-bold truncate">{user.displayName}{user.age ? `, ${user.age}` : ''}</h2>
              {user.isVerified && <VerifiedIcon size={16} />}
            </div>
            
            <p className="text-sm text-white/60 mb-2">@{user.username}</p>
            
            <div className="flex items-center gap-1.5 text-xs text-white/80 mb-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span>Online now</span>
            </div>
            
            <div className="flex items-center gap-1 text-xs text-white/60 mb-3">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>{user.region || user.countryCode || 'Earth'}</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-white/80 mt-2 mb-4 leading-relaxed">
          {user.bio || 'Welcome to my VUZKI profile! Feel free to connect and chat.'}
        </p>

        <Link href="/app/settings/profile" className="block w-full">
          <button className="w-full py-2.5 rounded-full bg-white/10 text-white font-semibold text-sm hover:bg-white/15 transition-colors">
            Edit Profile
          </button>
        </Link>
        
        <BoostProfile />

        {/* Stats Row */}
        <div className="flex items-center justify-between mt-6 px-2">
          <div className="text-center">
            <p className="font-bold text-lg">{stats.likesReceived}</p>
            <p className="text-xs text-white/50 mt-0.5">Likes</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="font-bold text-lg">{stats.matches}</p>
            <p className="text-xs text-white/50 mt-0.5">Matches</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="font-bold text-lg">{stats.following}</p>
            <p className="text-xs text-white/50 mt-0.5">Following</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="font-bold text-lg">{stats.profileViews}</p>
            <p className="text-xs text-white/50 mt-0.5">Profile Views</p>
          </div>
        </div>
      </div>

      {/* Photos */}
      <div className="mt-8">
        <h3 className="px-4 font-bold mb-3">Photos</h3>
        <div className="flex gap-3 overflow-x-auto px-4 pb-2 custom-scrollbar">
          {user.avatarUrl ? (
            <div className="w-28 h-36 shrink-0 rounded-2xl bg-white/5 overflow-hidden">
              <img src={user.avatarUrl} alt="Photo" className="w-full h-full object-cover" />
            </div>
          ) : null}
          <Link href="/app/settings/profile" className="w-28 h-36 shrink-0 rounded-2xl bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center gap-2 text-white/50 hover:bg-white/10 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            <span className="text-xs font-medium">Add Photo</span>
          </Link>
        </div>
      </div>

      {/* Interests */}
      <div className="px-4 mt-6">
        <div className="bg-[#141416] rounded-2xl p-4">
          <h3 className="font-bold mb-3">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {userInterests.map(it => (
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
