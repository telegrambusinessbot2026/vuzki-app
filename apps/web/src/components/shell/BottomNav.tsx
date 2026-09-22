'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, CompassIcon, ChatIcon, MicIcon, UserIcon, HeartIcon } from '@/components/ui/Icons';

const tabs = [
  { href: '/app/home', label: 'Home', icon: HomeIcon },
  { href: '/app/discover', label: 'Discover', icon: CompassIcon },
  { href: '/app/live', label: 'Talk Now', icon: HeartIcon, center: true },
  { href: '/app/chat', label: 'Chat', icon: ChatIcon },
  { href: '/app/profile', label: 'Profile', icon: UserIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#0a0a0c]/90 backdrop-blur-xl border-t border-surface-border pb-safe">
      <div className="flex items-center justify-around h-[72px] px-2">
        {tabs.map((tab) => {
          const active = tab.href === '/app/home'
            ? pathname === '/app/home'
            : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          
          if (tab.center) {
            return (
              <Link key={tab.label} href={tab.href} className="flex flex-col items-center justify-center -mt-6 relative group">
                <span className="h-16 w-16 rounded-full bg-gradient-to-tr from-brand-500 to-pink-500 flex items-center justify-center shadow-glow group-active:scale-95 transition-transform border-[6px] border-[#0a0a0c]">
                  <Icon size={28} className="text-white fill-current" />
                </span>
                <span className="text-[10px] font-medium mt-0.5 text-white/50">Likes</span>
              </Link>
            );
          }
          
          return (
            <Link key={tab.label} href={tab.href} className={`flex flex-col items-center justify-center w-16 relative group transition-colors ${active ? 'text-brand-500' : 'text-white/40 hover:text-white/70'}`}>
              <Icon size={24} className={`mb-1 transition-transform group-active:scale-90 ${active ? 'fill-current' : ''}`} />
              <span className="text-[10px] font-medium">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
