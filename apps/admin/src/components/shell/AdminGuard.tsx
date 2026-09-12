'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/lib/store';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { session } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!session) {
      router.replace('/login');
    }
  }, [session, router]);

  if (!session) return null;

  return <>{children}</>;
}
