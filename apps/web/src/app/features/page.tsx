import Link from 'next/link';
import MarketingHeader from '@/components/marketing/Header';
import MarketingFooter from '@/components/marketing/Footer';
import {
  VideoIcon,
  GiftIcon,
  CrownIcon,
  ShieldIcon,
  CompassIcon,
  CoinIcon,
  StarIcon,
} from '@/components/ui/Icons';

const FEATURES = [
  {
    icon: VideoIcon,
    title: 'Live Audio & Video Chat',
    desc: 'Crystal-clear audio and HD video calls with adjustable quality. Start a private chat or hop into live rooms with thousands of listeners.',
    accent: 'from-brand-500 to-brand-700',
  },
  {
    icon: CompassIcon,
    title: 'Instant Matching',
    desc: 'Our smart matching engine surfaces people who share your interests, languages, and vibe — so every first hello feels natural.',
    accent: 'from-pink-500 to-brand-600',
  },
  {
    icon: GiftIcon,
    title: 'Gifts & Coins',
    desc: 'Send animated gifts, emojis, and tokens to brighten someone’s day. Coins power a vibrant culture of generosity and fun.',
    accent: 'from-blue-500 to-brand-600',
  },
  {
    icon: CoinIcon,
    title: 'Creator Economy',
    desc: 'Verified creators earn coins from calls, gifts, and subscriptions. Turn your charisma into a sustainable income stream.',
    accent: 'from-brand-600 to-pink-500',
  },
  {
    icon: CrownIcon,
    title: 'Premium Subscriptions',
    desc: 'Unlock unlimited likes, boost visibility, advanced filters, and exclusive badges with PLUS, PREMIUM, and VIP plans.',
    accent: 'from-pink-500 to-pink-600',
  },
  {
    icon: ShieldIcon,
    title: 'Trust & Safety',
    desc: 'Real-time moderation, automated content filters, and a dedicated safety team keep our community welcoming and secure.',
    accent: 'from-brand-600 to-blue-500',
  },
  {
    icon: UserVerifiedIcon,
    title: 'Verified Profiles',
    desc: 'Photo verification and badges build trust. Know you’re talking to a real, safe person every single time.',
    accent: 'from-blue-500 to-pink-500',
  },
  {
    icon: StarIcon,
    title: 'Global Community',
    desc: 'Join over 5 million members across 140+ countries. Languages, cultures, and personalities — all in one place.',
    accent: 'from-brand-500 to-pink-500',
  },
];

function UserVerifiedIcon({ size, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size || 20}
      height={size || 20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-surface">
      <MarketingHeader />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-gradient-soft opacity-60" />
        <div className="relative max-w-6xl mx-auto px-4 pt-24 pb-16 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-brand-400 to-pink-500 bg-clip-text text-transparent">
              Built for real connection
            </span>
          </h1>
          <p className="mt-6 text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
            From first match to lasting friendship, VUZKI gives you powerful, safe, and delightful tools to make every interaction feel special.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl bg-surface-raised border border-surface-border p-6 hover:border-brand-500/40 hover:shadow-glow transition-all"
            >
              <span className={`inline-flex h-12 w-12 rounded-2xl bg-gradient-to-br ${feature.accent} text-white items-center justify-center mb-5`}>
                <feature.icon size={22} />
              </span>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-sm text-white/55 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-24">
        <div className="relative rounded-3xl overflow-hidden bg-brand-gradient p-10 md:p-14 text-center shadow-glow">
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">Experience it for yourself</h2>
            <p className="mt-3 text-white/85 max-w-xl mx-auto">Create your free profile and start meeting people today.</p>
            <Link
              href="/auth/login"
              className="inline-flex items-center mt-8 px-8 py-4 rounded-2xl bg-white text-brand-700 font-bold shadow-lg hover:opacity-90 transition-opacity"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
