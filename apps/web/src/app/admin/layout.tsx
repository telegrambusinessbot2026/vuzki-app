import type { Metadata } from 'next';
import { AdminProvider } from '@/lib/admin/store';

export const metadata: Metadata = {
  title: 'VUZKI Admin',
  description: 'VUZKI Admin Dashboard — moderation, finances & operations',
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <AdminProvider>{children}</AdminProvider>;
}