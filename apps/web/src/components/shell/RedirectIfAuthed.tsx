'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace('/app/home');
    }
  }, [loading, isAuthenticated, router]);

  if (!loading && isAuthenticated) return null;
  return <>{children}</>;
}
