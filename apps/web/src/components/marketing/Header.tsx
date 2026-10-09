'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { VuzkiLogo } from '@/components/ui/VuzkiLogo';

const NAV = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Safety', href: '/safety' },
  { label: 'Blog', href: '/blog' },
];

export default function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-surface-border bg-surface/85 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <VuzkiLogo size={32} href="/" />

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-white/70 hover:text-white transition-colors font-medium"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-sm font-semibold text-white/80 hover:text-white transition-colors px-3 py-2"
          >
            Log in
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-brand-gradient text-white text-sm font-semibold shadow-glow hover:opacity-95 transition-opacity"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex sm:hidden items-center gap-2">
          <Link
            href="/auth/login"
            className="text-xs font-semibold text-white/80 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10"
          >
            Log in
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-white/70 hover:text-white rounded-lg focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-surface-border bg-surface-raised px-4 py-5 space-y-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-semibold text-white/80 hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-surface-border flex gap-3">
            <Link
              href="/auth/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-3 rounded-xl bg-brand-gradient text-white text-sm font-bold shadow-glow"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
