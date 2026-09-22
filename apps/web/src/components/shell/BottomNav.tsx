'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, CompassIcon, ChatIcon, MicIcon, UserIcon } from '@/components/ui/Icons';

const tabs = [
  { href: '/app/home', label: 'Home', icon: HomeIcon },
  { href: '/app/discover', label: 'Discover', icon: CompassIcon },
  { href: '/app/home', label: 'Live', icon: MicIcon, center: true },
  { href: '/app/chat', label: 'Chat', icon: ChatIcon },
  { href: '/app/profile', label: 'Profile', icon: UserIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 pb-safe pb-4 px-4 pointer-events-none flex justify-center">
      <div className="w-full max-w-sm pointer-events-auto">
        <div className="grid grid-cols-5 items-center bg-surface-raised/80 backdrop-blur-xl border border-surface-border rounded-full shadow-float px-2 py-1">
          {tabs.map((tab) => {
            const active = tab.href === '/app/home'
              ? pathname === '/app/home'
              : pathname.startsWith(tab.href);
            const Icon = tab.icon;
            
            if (tab.center) {
              return (
                <Link key={tab.label} href="/app/live" className="flex flex-col items-center justify-center py-2 group">
                  <span className="h-12 w-12 rounded-full bg-brand-gradient flex items-center justify-center shadow-glow group-active:scale-95 transition-transform">
                    <Icon size={22} className="text-white" />
                  </span>
                </Link>
              );
            }
            
            return (
              <Link key={tab.label} href={tab.href} className={`flex flex-col items-center justify-center py-3 relative group transition-colors ${active ? 'text-white' : 'text-white/40 hover:text-white/70'}`}>
                <Icon size={24} className="transition-transform group-active:scale-90" />
                {active && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-brand-400 shadow-glow" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
