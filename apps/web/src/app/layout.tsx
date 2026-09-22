import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { RealtimeProvider } from '@/lib/realtime-context';
import { APP_NAME, APP_TAGLINE, SITE_URL } from '@/lib/site';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s | ${APP_NAME}`,
  },
  description: `${APP_NAME} is a premium social & stranger-connect platform. Millions of users, live audio & video chat, gifts, and a creator economy.`,
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: APP_NAME },
};

export const viewport: Viewport = {
  themeColor: '#0f0f14',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-dvh bg-[#0a0a0c] text-white antialiased selection:bg-brand-500/30`}>
        <AuthProvider>
          <RealtimeProvider>{children}</RealtimeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
