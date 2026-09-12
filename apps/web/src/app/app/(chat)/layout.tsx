'use client';

import React from 'react';
import { AuthGuard } from '@/components/shell/AuthGuard';

export default function ChatDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-surface flex flex-col">{children}</div>
    </AuthGuard>
  );
}
