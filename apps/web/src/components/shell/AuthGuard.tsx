'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Spinner } from '@/components/ui/Button';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface">
        <div className="h-16 w-16 rounded-3xl bg-brand-gradient flex items-center justify-center text-2xl font-black shadow-glow animate-pulse-glow">
          V
        </div>
        <div className="mt-6 flex items-center gap-2 text-white/50">
          <Spinner className="h-4 w-4" />
          <span className="text-sm">Loading VUZKI…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  return <>{children}</>;
}
