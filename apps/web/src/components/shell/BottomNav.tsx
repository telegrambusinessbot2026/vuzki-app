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
    <nav className="fixed bottom-0 inset-x-0 z-40 pb-safe pb-2 px-4 pointer-events-none flex justify-center">
      <div className="w-full max-w-[400px] pointer-events-auto">
        <div className="grid grid-cols-5 items-center bg-surface-raised/90 backdrop-blur-2xl border border-surface-border rounded-[2rem] shadow-float px-2 py-1">
          {tabs.map((tab) => {
            const active = tab.href === '/app/home'
              ? pathname === '/app/home'
              : pathname.startsWith(tab.href);
            const Icon = tab.icon;
            
            if (tab.center) {
              return (
                <Link key={tab.label} href={tab.href} className="flex flex-col items-center justify-center -mt-8 relative group">
                  <span className="h-14 w-14 rounded-full bg-brand-500 flex items-center justify-center shadow-glow group-active:scale-95 transition-transform border-[4px] border-surface">
                    <Icon size={24} className="text-white fill-current" />
                  </span>
                </Link>
              );
            }
            
            return (
              <Link key={tab.label} href={tab.href} className={`flex flex-col items-center justify-center py-3 relative group transition-colors ${active ? 'text-brand-500' : 'text-white/40 hover:text-white/70'}`}>
                <Icon size={24} className={`transition-transform group-active:scale-90 ${active ? 'fill-current' : ''}`} />
                <span className={`text-[9px] font-medium mt-1 ${active ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
                  {tab.label}
                </span>
                {active && (
                  <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-brand-500 shadow-glow" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
