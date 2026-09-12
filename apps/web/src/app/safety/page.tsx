import Link from 'next/link';
import MarketingHeader from '@/components/marketing/Header';
import MarketingFooter from '@/components/marketing/Footer';
import { ShieldIcon, FlagIcon, LockIcon, DocumentIcon } from '@/components/ui/Icons';

const PILLARS = [
  {
    icon: ShieldIcon,
    title: 'Real-time Moderation',
    desc: 'Our AI and human moderation team monitor live rooms, calls, and chats around the clock to keep the community welcoming and free of abuse.',
  },
  {
    icon: FlagIcon,
    title: 'Simple Reporting',
    desc: 'One tap to report or block anyone. Reports are reviewed quickly by our trust & safety specialists, and repeat offenders are removed.',
  },
  {
    icon: LockIcon,
    title: 'Privacy & Encryption',
    desc: 'Your messages, calls, and personal data are protected with end-to-end encryption and strict data policies. What you share stays private.',
  },
  {
    icon: DocumentIcon,
    title: 'Community Guidelines',
    desc: 'Clear, fair rules everyone agrees to. We take action on harassment, hate speech, explicit content, and any unsafe behavior.',
  },
];

const TIPS = [
  {
    title: 'Keep personal info private',
    desc: 'Avoid sharing your full name, address, bank details, or other sensitive information with people you’ve just met online.',
  },
  {
    title: 'Stay on the platform',
    desc: 'Keep conversations on VUZKI, where our safety tools and moderation can protect you. Be cautious about moving to unmoderated apps.',
  },
  {
    title: 'Trust your instincts',
    desc: 'If a conversation feels uncomfortable or a request feels off, you can always end it, block, and report. Never feel pressured to continue.',
  },
  {
    title: 'Verify before meeting',
    desc: 'If you decide to meet someone in person, choose a public place, tell a friend where you’re going, and video chat first to confirm.',
  },
  {
    title: 'Watch for red flags',
    desc: 'Be wary of people asking for money, gifts, or explicit content. Report anyone who makes you feel unsafe.',
  },
  {
    title: 'Use the safety features',
    desc: 'Take advantage of verified badges, anonymous one-tap reporting, block lists, and in-call controls designed to keep you in charge.',
  },
];

const HELP = [
  {
    title: 'I feel unsafe in a conversation',
    action: 'End the call or chat immediately, block the user, and tap the report button. Our team reviews every report within hours.',
  },
  {
    title: 'Someone is asking for money',
    desc: 'Never send money. Report the user and block them. VUZKI will never ask you for your password or banking details.',
    action: 'Report the account and block.',
  },
  {
    title: 'I shared something I regret',
    action: 'You can delete messages, block the conversation, and contact our privacy team to help remove content and secure your account.',
  },
  {
    title: 'I’m in immediate danger',
    action: 'If you believe you are in immediate physical danger, contact your local emergency services right away. We are here to support you too.',
  },
];

export default function SafetyPage() {
  return (
    <div className="min-h-screen bg-surface">
      <MarketingHeader />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-gradient-soft opacity-60" />
        <div className="relative max-w-6xl mx-auto px-4 pt-24 pb-16 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-surface-border text-xs font-medium text-white/80 mb-6">
            <ShieldIcon size={14} className="text-brand-400" />
            Trust & Safety First
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-brand-400 to-pink-500 bg-clip-text text-transparent">
              Your safety is our priority
            </span>
          </h1>
          <p className="mt-6 text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
            VUZKI combines advanced technology, human moderation, and clear community standards so you can connect with confidence.
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-3xl bg-surface-raised border border-surface-border p-6 hover:border-brand-500/40 hover:shadow-glow transition-all"
            >
              <span className="inline-flex h-12 w-12 rounded-2xl bg-brand-gradient text-white items-center justify-center mb-5 shadow-glow">
                <pillar.icon size={22} />
              </span>
              <h3 className="text-lg font-bold mb-2">{pillar.title}</h3>
              <p className="text-sm text-white/55 leading-relaxed">{pillar.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Guidelines banner */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="relative rounded-3xl overflow-hidden bg-brand-gradient p-10 md:p-12 shadow-glow">
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">Be kind, be respectful, be you</h2>
              <p className="mt-2 text-white/85 max-w-xl">
                Our community thrives on mutual respect. Review the full guidelines to understand what’s welcome and what isn’t.
              </p>
            </div>
            <Link
              href="/blog"
              className="shrink-0 inline-flex items-center px-6 py-3 rounded-2xl bg-white text-brand-700 font-bold shadow-lg hover:opacity-90 transition-opacity"
            >
              Read Guidelines
            </Link>
          </div>
        </div>
      </section>

      {/* Safe chatting tips */}
      <section className="border-t border-surface-border bg-surface-raised/30 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-brand-400 to-pink-500 bg-clip-text text-transparent">
                Tips for safe chatting
              </span>
            </h2>
            <p className="mt-4 text-white/60">Small habits that keep you protected while you connect.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TIPS.map((tip, i) => (
              <div key={tip.title} className="rounded-3xl bg-surface-raised border border-surface-border p-6">
                <span className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-surface-overlay border border-surface-border text-brand-400 font-bold mb-4">
                  {i + 1}
                </span>
                <h3 className="font-bold mb-2">{tip.title}</h3>
                <p className="text-sm text-white/55 leading-relaxed">{tip.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Emergency help */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-brand-400 to-pink-500 bg-clip-text text-transparent">
              Need immediate help?
            </span>
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {HELP.map((item) => (
            <div key={item.title} className="rounded-3xl bg-surface-raised border border-surface-border p-6">
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <FlagIcon size={18} className="text-brand-400" />
                {item.title}
              </h3>
              <p className="text-sm text-white/55 leading-relaxed">{item.action}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-2xl glass border border-surface-border px-6 py-3 text-white/80">
            <LockIcon size={18} className="text-brand-400" />
            Contact our 24/7 trust & safety team
          </span>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
