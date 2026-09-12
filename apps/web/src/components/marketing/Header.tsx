import Link from 'next/link';

const NAV = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Safety', href: '/safety' },
  { label: 'Blog', href: '/blog' },
];

export default function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-surface-border bg-surface/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-brand-gradient shadow-glow">
            <span className="text-lg font-extrabold text-white">V</span>
          </span>
          <span className="text-xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-brand-400 to-pink-500 bg-clip-text text-transparent">VUZKI</span>
          </span>
        </Link>

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

        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="hidden sm:inline-flex text-sm font-medium text-white/80 hover:text-white transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-brand-gradient text-white text-sm font-semibold shadow-glow hover:opacity-95 transition-opacity"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
