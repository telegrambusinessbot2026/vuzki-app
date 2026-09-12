'use client';

import React from 'react';
import Link from 'next/link';
import { CloseIcon, MicIcon } from '@/components/ui/Icons';

export default function LiveRoomPage() {
  return (
    <div className="fixed inset-0 z-50 bg-surface flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-surface to-indigo-900" />

      <div className="relative z-10 flex items-center justify-between px-4 pt-4">
        <Link href="/app/live" className="p-2 bg-black/30 rounded-full text-white/80">
          <CloseIcon />
        </Link>
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/40 text-white text-xs">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          Live
        </span>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="h-16 w-16 rounded-full bg-black/30 flex items-center justify-center mb-4">
          <MicIcon size={26} className="text-white/40" />
        </div>
        <h1 className="text-lg font-bold text-white/90">This live room is no longer available</h1>
        <p className="text-sm text-white/50 mt-2 max-w-xs">
          The host may have ended the broadcast. Browse other live rooms or start your own.
        </p>
        <Link
          href="/app/live"
          className="mt-6 px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-pink-600 text-white text-sm font-semibold shadow-glow"
        >
          Back to Live
        </Link>
      </div>
    </div>
  );
}
