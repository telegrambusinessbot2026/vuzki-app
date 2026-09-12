import Link from 'next/link';
import MarketingHeader from '@/components/marketing/Header';
import MarketingFooter from '@/components/marketing/Footer';
import {
  PhoneIcon,
  VideoIcon,
  GiftIcon,
  CompassIcon,
  ChatIcon,
  ShieldIcon,
  StarIcon,
  ZapIcon,
} from '@/components/ui/Icons';

const FEATURES = [
  {
    icon: CompassIcon,
    title: 'Instant Matching',
    desc: 'Swipe and match with people who share your vibe. Our smart engine connects you in seconds.',
  },
  {
    icon: VideoIcon,
    title: 'Live Video Chat',
    desc: 'Hop on high-quality video calls with friends, creators, and new connections around the world.',
  },
  {
    icon: GiftIcon,
    title: 'Gifts & Coins',
    desc: 'Express yourself with virtual gifts and support your favorite creators with coins.',
  },
  {
    icon: ShieldIcon,
    title: 'Trust & Safety',
    desc: 'Verified profiles, real-time moderation, and robust privacy controls keep you safe.',
  },
];

const STEPS = [
  { n: '01', title: 'Create your profile', desc: 'Sign up, add your interests, and verify your identity in under a minute.' },
  { n: '02', title: 'Meet new people', desc: 'Get matched with like-minded people or join live rooms across 140+ countries.' },
  { n: '03', title: 'Chat, talk & connect', desc: 'Send messages, make calls, send gifts, and build genuine connections.' },
];

const TESTIMONIALS = [
  {
    name: 'Ayesha, Mumbai',
    quote: 'I met some of my closest friends on VUZKI. The live rooms are so welcoming and the video quality is incredible.',
    role: 'Creator',
  },
  {
    name: 'Lucas, São Paulo',
    quote: 'The matching is spot on. Every conversation feels real and meaningful. It’s my favorite app by far.',
    role: 'Verified member',
  },
  {
    name: 'Mia, Toronto',
    quote: 'As an introvert, I love that I can start with voice and ease into video. The safety tools gave me total peace of mind.',
    role: 'Premium member',
  },
];

const APP_CARDS = [
  {
    icon: ChatIcon,
    title: 'Private Chat',
    desc: 'Crystal-clear messaging with reactions, gifts, and rich media.',
    accent: 'from-brand-500 to-brand-700',
    glow: 'shadow-glow',
  },
  {
    icon: VideoIcon,
    title: 'Live Rooms',
    desc: 'Join thousands of live conversations happening right now.',
    accent: 'from-pink-500 to-pink-600',
    glow: 'shadow-glow-pink',
  },
  {
    icon: GiftIcon,
    title: 'Gift Wall',
    desc: 'Send animated gifts that make every moment special.',
    accent: 'from-blue-500 to-brand-600',
    glow: 'shadow-glow',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface">
      <MarketingHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-gradient-soft opacity-60" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-pink-600/10 blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 pt-24 pb-20 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-surface-border text-xs font-medium text-white/80 mb-6">
              <span className="h-2 w-2 rounded-full bg-brand-500 animate-heart-beat" />
              Connecting 140+ countries
            </span>
            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight">
              <span className="bg-gradient-to-r from-brand-400 to-pink-500 bg-clip-text text-transparent">
                Meet. Talk.
              </span>
              <br />
              <span className="bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">
                Connect.
              </span>
            </h1>
            <p className="mt-6 text-lg text-white/60 leading-relaxed max-w-lg">
              VUZKI is the premium destination for real conversations. Match with people who share your interests, chat live, and build friendships that span the globe.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/auth/login"
                className="inline-flex items-center px-6 py-3 rounded-2xl bg-brand-gradient text-white font-semibold shadow-glow hover:opacity-95 transition-opacity"
              >
                Get Started Free
              </Link>
              <Link
                href="/features"
                className="inline-flex items-center px-6 py-3 rounded-2xl glass border border-surface-border text-white font-semibold hover:border-brand-500/50 transition-colors"
              >
                Explore Features
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass border border-surface-border">
                <span className="text-left">
                  <span className="block text-[10px] text-white/50">Download on the</span>
                  <span className="block text-sm font-bold">App Store</span>
                </span>
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass border border-surface-border">
                <span className="text-left">
                  <span className="block text-[10px] text-white/50">Get it on</span>
                  <span className="block text-sm font-bold">Google Play</span>
                </span>
              </span>
            </div>
          </div>

          {/* Hero mockup */}
          <div className="relative hidden lg:flex justify-center">
            <div className="relative w-72 rounded-3xl border border-surface-border bg-surface-raised p-4 shadow-glow overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-white/20" />
                  <div className="h-3 w-3 rounded-full bg-white/20" />
                  <div className="h-3 w-3 rounded-full bg-white/20" />
                </div>
                <span className="text-[10px] text-white/50 font-medium">10:24</span>
              </div>
              <div className="rounded-2xl bg-brand-gradient p-4 mb-3 text-white">
                <span className="inline-flex h-10 w-10 rounded-full bg-white/20 items-center justify-center text-lg">💜</span>
                <p className="mt-3 font-semibold text-sm">Good evening!</p>
                <p className="text-xs text-white/80 mt-1">Let’s talk about music 🎵</p>
              </div>
              <div className="rounded-2xl bg-surface-overlay border border-surface-border p-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-400 to-pink-500" />
                  <div>
                    <p className="text-sm font-semibold">Sofia</p>
                    <p className="text-[10px] text-brand-400">• Live now</p>
                  </div>
                  <span className="ml-auto inline-flex items-center h-8 w-8 rounded-lg bg-brand-600 text-white justify-center"><PhoneIcon size={14} /></span>
                </div>
                <p className="text-xs text-white/50 mt-2">New match! Start a video call 💬</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: VideoIcon, label: 'Video' },
                  { icon: ChatIcon, label: 'Chat' },
                  { icon: GiftIcon, label: 'Gifts' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-surface-overlay border border-surface-border p-3 flex flex-col items-center gap-1">
                    <item.icon size={18} className="text-brand-400" />
                    <span className="text-[10px] text-white/60">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-surface-border bg-surface-raised/50">
        <div className="max-w-6xl mx-auto px-4 py-14 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '5M+', label: 'Active members' },
            { value: '50M+', label: 'Daily chats' },
            { value: '140+', label: 'Countries' },
            { value: '4.8★', label: 'Average rating' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-4xl font-extrabold bg-gradient-to-r from-brand-400 to-pink-500 bg-clip-text text-transparent">{stat.value}</p>
              <p className="mt-2 text-sm text-white/50">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature highlights */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-brand-400 to-pink-500 bg-clip-text text-transparent">Everything you need to connect</span>
          </h2>
          <p className="mt-4 text-white/60">Powerful tools designed to make every conversation genuine, safe, and memorable.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl bg-surface-raised border border-surface-border p-6 hover:border-brand-500/40 hover:shadow-glow transition-all"
            >
              <span className="inline-flex h-12 w-12 rounded-2xl bg-brand-gradient text-white items-center justify-center mb-5 shadow-glow">
                <feature.icon size={22} />
              </span>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-sm text-white/55 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* App preview cards */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          {APP_CARDS.map((card) => (
            <div
              key={card.title}
              className={`relative rounded-3xl ${card.glow} overflow-hidden p-8 bg-gradient-to-br ${card.accent}`}
            >
              <span className="inline-flex h-12 w-12 rounded-2xl bg-white/20 text-white items-center justify-center mb-5">
                <card.icon size={22} />
              </span>
              <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
              <p className="text-white/80 text-sm leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-surface-border bg-surface-raised/30 py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-brand-400 to-pink-500 bg-clip-text text-transparent">How it works</span>
            </h2>
            <p className="mt-4 text-white/60">From first hello to lifelong friendship in three simple steps.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.n} className="relative text-center">
                <span className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-brand-gradient text-white text-lg font-extrabold shadow-glow">
                  {step.n}
                </span>
                <h3 className="mt-5 text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm text-white/55 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-brand-400 to-pink-500 bg-clip-text text-transparent">Loved around the world</span>
          </h2>
          <p className="mt-4 text-white/60">Real stories from the VUZKI community.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-3xl bg-surface-raised border border-surface-border p-6 flex flex-col">
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} size={16} className="text-brand-500" />
                ))}
              </div>
              <p className="text-sm text-white/70 leading-relaxed flex-1">“{t.quote}”</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-400 to-pink-500" />
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-white/50">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Big CTA banner */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <div className="relative rounded-3xl overflow-hidden bg-brand-gradient p-10 md:p-16 text-center shadow-glow">
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
              Ready to meet someone new?
            </h2>
            <p className="mt-4 text-white/85 max-w-xl mx-auto text-lg">
              Join millions of people connecting right now. Your next great conversation is a tap away.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 mt-8 px-8 py-4 rounded-2xl bg-white text-brand-700 font-bold shadow-lg hover:opacity-90 transition-opacity"
            >
              <ZapIcon size={18} />
              Start Connecting Free
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
