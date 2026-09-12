'use client';

import React from 'react';
import Link from 'next/link';
import { MicIcon } from '@/components/ui/Icons';

export default function LiveListPage() {
  return (
    <div className="px-4 pt-4 pb-4">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            Live <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          </h1>
          <p className="text-xs text-white/50">Live rooms</p>
        </div>
        <Link href="/app/live/start" className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-pink-600 text-white text-xs font-semibold shadow-glow">
          Start a room
        </Link>
      </header>

      <div className="flex flex-col items-center justify-center text-center py-20">
        <div className="h-16 w-16 rounded-full bg-surface-overlay flex items-center justify-center mb-4">
          <MicIcon size={28} className="text-white/40" />
        </div>
        <h2 className="font-semibold text-white/80">No live rooms right now</h2>
        <p className="text-sm text-white/40 mt-1 max-w-xs">
          There are no live rooms currently broadcasting. Check back soon or be the first to start one.
        </p>
        <Link
          href="/app/live/start"
          className="mt-5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-pink-600 text-white text-sm font-semibold shadow-glow"
        >
          Start a room
        </Link>
      </div>
    </div>
  );
}
