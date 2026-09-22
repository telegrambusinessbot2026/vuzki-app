'use client';

import React from 'react';
import { AuthGuard } from '@/components/shell/AuthGuard';
import { BottomNav } from '@/components/shell/BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-dvh bg-[#0a0a0c] pb-[100px] relative">
        <main className="mx-auto max-w-md w-full relative z-10">{children}</main>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
