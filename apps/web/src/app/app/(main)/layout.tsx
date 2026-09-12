'use client';

import React from 'react';
import { AuthGuard } from '@/components/shell/AuthGuard';
import { BottomNav } from '@/components/shell/BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-surface pb-20">
        <main className="mx-auto max-w-md w-full">{children}</main>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
