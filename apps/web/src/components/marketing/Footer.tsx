import Link from 'next/link';

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
    title: 'Company',
    links: [
      { label: 'About', href: '/features' },
      { label: 'Careers', href: '/blog' },
      { label: 'Press', href: '/blog' },
      { label: 'Contact', href: '/' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/safety' },
      { label: 'Terms of Service', href: '/safety' },
      { label: 'Community Guidelines', href: '/safety' },
      { label: 'Cookie Policy', href: '/safety' },
    ],
  },
];

export default function MarketingFooter() {
  return (
    <footer className="border-t border-surface-border bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-brand-gradient shadow-glow">
                <span className="text-base font-extrabold text-white">V</span>
              </span>
              <span className="text-lg font-extrabold tracking-tight">
                <span className="bg-gradient-to-r from-brand-400 to-pink-500 bg-clip-text text-transparent">VUZKI</span>
              </span>
            </div>
            <p className="text-sm text-white/50 max-w-xs leading-relaxed">
              Meet • Talk • Connect. A premium social platform where millions around the world come together for live audio and video conversations.
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
          <p className="text-xs text-white/40">Made with care for the global community. 💜</p>
        </div>
      </div>
    </footer>
  );
}
