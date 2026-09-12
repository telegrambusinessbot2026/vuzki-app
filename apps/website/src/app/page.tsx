import Link from 'next/link';

function Icon({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow ${className ?? ''}`}>
      {children}
    </span>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-3xl bg-surface-raised border border-surface-border p-6 hover:border-brand-500/40 transition-colors">
      <Icon>{icon}</Icon>
      <h3 className="mt-5 text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm text-white/55 leading-relaxed">{desc}</p>
    </div>
  );
}

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
    ),
    title: 'Real conversations',
    desc: 'Connect with people who share your interests and have conversations that feel genuine.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 7l-7 5 7 5V7z" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
    title: 'Live chat & calls',
    desc: 'Message, voice chat, and connect with the people who matter to you, anytime.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    title: 'Gifts & coins',
    desc: 'Express appreciation with virtual gifts and support the creators you enjoy.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: 'Trust & safety',
    desc: 'Verified profiles and privacy controls help keep the community safe and respectful.',
  },
];

const STEPS = [
  { n: '01', title: 'Set up your profile', desc: 'Add your interests and tell people who you are.' },
  { n: '02', title: 'Discover people', desc: 'Browse profiles and match with people who share your vibe.' },
  { n: '03', title: 'Connect & talk', desc: 'Start chatting and build real, lasting connections.' },
];

export default function SiteLandingPage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-gradient-soft opacity-60" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-pink-600/10 blur-3xl" />

        <nav className="relative max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <span className="font-extrabold text-lg tracking-tight">
            VUZKI<span className="text-brand-400">.</span>
          </span>
          <div className="hidden sm:flex items-center gap-6 text-sm text-white/70">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          </div>
        </nav>

        <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-20 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-surface-border text-xs font-medium text-white/80 mb-6">
            <span className="h-2 w-2 rounded-full bg-brand-500" />
            A platform for real connections
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
            <span className="bg-gradient-to-r from-brand-400 to-pink-500 bg-clip-text text-transparent">Meet. Talk.</span>
            <br />
            <span className="bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">Connect.</span>
          </h1>
          <p className="mt-6 mx-auto max-w-2xl text-lg text-white/60 leading-relaxed">
            VUZKI is a platform for meaningful conversations. Match with people who share your interests, chat and call live, and build friendships that span the globe.
          </p>
          <div className="mt-8">
            <Link
              href="#features"
              className="inline-flex items-center px-6 py-3 rounded-2xl bg-brand-gradient text-white font-semibold shadow-glow hover:opacity-95 transition-opacity"
            >
              Explore VUZKI
            </Link>
          </div>
        </div>
      </header>

      <section id="features" className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-brand-400 to-pink-500 bg-clip-text text-transparent">Everything you need to connect</span>
          </h2>
          <p className="mt-4 text-white/60">Tools built to make every conversation genuine, safe, and worth having.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f) => (
            <Feature key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
          ))}
        </div>
      </section>

      <section id="how-it-works" className="border-t border-surface-border bg-surface-raised/30 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-brand-400 to-pink-500 bg-clip-text text-transparent">How it works</span>
            </h2>
            <p className="mt-4 text-white/60">Getting started takes just a few simple steps.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <span className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-brand-gradient text-white text-lg font-extrabold shadow-glow">
                  {s.n}
                </span>
                <h3 className="mt-5 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-white/55 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="relative rounded-3xl overflow-hidden bg-brand-gradient p-10 md:p-14 text-center shadow-glow">
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative">
            <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white">Ready to have real conversations?</h2>
            <p className="mt-4 text-white/85 max-w-xl mx-auto text-lg">
              Sign up, set up your profile, and start connecting with people who share your interests.
            </p>
            <a
              href="#features"
              className="inline-flex items-center mt-8 px-8 py-4 rounded-2xl bg-white text-brand-700 font-bold shadow-lg hover:opacity-90 transition-opacity"
            >
              Learn more about VUZKI
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-surface-border py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/50">
          <span className="font-bold text-white/80">VUZKI<span className="text-brand-400">.</span></span>
          <span>Meet. Talk. Connect. — A premium platform for real conversations.</span>
        </div>
      </footer>
    </div>
  );
}
