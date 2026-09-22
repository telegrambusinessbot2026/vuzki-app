'use client';

import React from 'react';
import { AuthGuard } from '@/components/shell/AuthGuard';

export default function ChatDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-dvh bg-[#0a0a0c] flex flex-col">{children}</div>
    </AuthGuard>
  );
}
