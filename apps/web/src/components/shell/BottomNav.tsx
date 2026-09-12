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
    <nav className="fixed bottom-0 inset-x-0 z-40 pb-safe">
      <div className="mx-auto max-w-md">
        <div className="grid grid-cols-5 items-center bg-surface-raised/95 backdrop-blur border-t border-surface-border pb-[env(safe-area-inset-bottom)]">
          {tabs.map((tab) => {
            const active = tab.href === '/app/home'
              ? pathname === '/app/home'
              : pathname.startsWith(tab.href);
            const Icon = tab.icon;
            if (tab.center) {
              return (
                <Link key={tab.label} href="/app/live" className="flex flex-col items-center justify-center py-2.5">
                  <span className="h-12 w-12 -mt-6 rounded-full bg-brand-gradient flex items-center justify-center shadow-glow ring-4 ring-surface-DEFAULT active:scale-95 transition-transform">
                    <Icon size={22} />
                  </span>
                  <span className="text-[10px] mt-1 text-white/60">{tab.label}</span>
                </Link>
              );
            }
            return (
              <Link key={tab.label} href={tab.href} className={`flex flex-col items-center justify-center py-2.5 transition-colors ${active ? 'text-brand-400' : 'text-white/50'}`}>
                <Icon size={24} />
                <span className="text-[10px] mt-0.5">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
