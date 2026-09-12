import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VUZKI — Meet. Talk. Connect.',
  description:
    'VUZKI is a premium platform for real conversations — connect with people who share your interests, chat live, and build friendships around the world.',
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
