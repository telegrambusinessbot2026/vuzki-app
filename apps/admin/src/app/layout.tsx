import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AdminProvider } from '@/lib/store';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'VUZKI Admin',
  description: 'VUZKI Admin Dashboard — moderation, finances & operations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen bg-[#0a0a0f] text-white antialiased`}>
        <AdminProvider>{children}</AdminProvider>
      </body>
    </html>
  );
}
