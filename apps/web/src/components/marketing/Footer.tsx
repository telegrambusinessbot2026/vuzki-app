import React from 'react';
import Link from 'next/link';
import { VuzkiLogo } from '@/components/ui/VuzkiLogo';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Safety', href: '/safety' },
      { label: 'Blog', href: '/blog' },
    ],
  },
  {
    title: 'Platform',
    links: [
      { label: 'Web App', href: '/welcome' },
      { label: 'Safety Guidelines', href: '/safety' },
      { label: 'Talk Now', href: '/welcome' },
      { label: 'Admin Portal', href: '/admin/login' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Community Guidelines', href: '/safety' },
    ],
  },
];

export default function MarketingFooter() {
  return (
    <footer className="border-t border-surface-border bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2">
            <div className="mb-4">
              <VuzkiLogo size={32} showTagline={true} />
            </div>
            <p className="text-sm text-white/50 max-w-xs leading-relaxed">
              Meet • Talk • Connect. A premium social connection platform where real people discover genuine friendships and live conversations worldwide.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-white/50 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40">© {new Date().getFullYear()} VUZKI. All rights reserved.</p>
          <p className="text-xs text-white/40">Designed for authentic, safe connections worldwide. 💜</p>
        </div>
      </div>
    </footer>
  );
}
