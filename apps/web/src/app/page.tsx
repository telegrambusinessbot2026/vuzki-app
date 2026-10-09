import React from 'react';
import Link from 'next/link';
import { VuzkiLogo } from '@/components/ui/VuzkiLogo';

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#0a0a0c] flex flex-col relative overflow-x-hidden selection:bg-[#FF4DBD] selection:text-white">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] md:w-[80%] aspect-[1/1] md:aspect-[2/1] bg-gradient-radial from-[#FF4DBD]/15 to-transparent blur-[120px] pointer-events-none mix-blend-screen" />

      {/* Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between relative z-20">
        <VuzkiLogo size={34} href="/" />

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
          <Link href="#how-it-works" className="hover:text-white transition-colors">How it Works</Link>
          <Link href="/features" className="hover:text-white transition-colors">Features</Link>
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/safety" className="hover:text-white transition-colors">Trust & Safety</Link>
          <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="hidden md:block text-sm font-medium text-white/80 hover:text-white transition-colors">
            Log In
          </Link>
          <Link href="/welcome" className="h-10 px-6 rounded-full bg-gradient-to-r from-[#FF2D8F] to-[#855CF6] text-white text-sm font-semibold flex items-center justify-center shadow-glow hover:opacity-95 transition-all">
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 relative z-10">
        {/* Hero Section */}
        <section className="pt-20 pb-32 md:pt-28 md:pb-36 text-center max-w-4xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-white/80 tracking-wide">Live Connections Available Now</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-6 leading-[1.1]">
            More than an App.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF2D8F] via-[#FF4DBD] to-[#855CF6]">
              A Better Way to Connect.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/60 font-medium max-w-2xl mb-10 leading-relaxed">
            VUZKI is the premium social connection platform designed for real people. Discover authentic connections, talk instantly via crystal-clear WebRTC audio & video, and find where you belong.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link
              href="/welcome"
              className="w-full sm:w-auto h-14 px-8 rounded-full bg-gradient-to-r from-[#FF2D8F] to-[#855CF6] text-white text-lg font-bold shadow-[0_0_32px_rgba(255,45,143,0.35)] hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,45,143,0.45)] transition-all flex items-center justify-center gap-2"
            >
              Join VUZKI Today
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto h-14 px-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-lg font-semibold transition-all flex items-center justify-center"
            >
              Explore Plans
            </Link>
          </div>
        </section>

        {/* How it Works / Features */}
        <section id="how-it-works" className="py-24 border-t border-white/5">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How VUZKI Works</h2>
            <p className="text-white/60 max-w-xl mx-auto">
              We’ve rebuilt the social connection experience from the ground up to be faster, safer, and authentic.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/[0.07] transition-colors">
              <div className="h-14 w-14 rounded-2xl bg-[#FF2D8F]/20 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-[#FF2D8F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Smart Discovery</h3>
              <p className="text-white/60 leading-relaxed">
                Our matching engine surfaces active, available, and compatible members based on strict safety rules, verified criteria, and shared interests.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/[0.07] transition-colors">
              <div className="h-14 w-14 rounded-2xl bg-[#855CF6]/20 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-[#855CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Instant Talk Now</h3>
              <p className="text-white/60 leading-relaxed">
                Jump into real-time WebRTC audio and video conversations instantly. Zero fake queues. Connect face-to-face when you’re ready.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/[0.07] transition-colors">
              <div className="h-14 w-14 rounded-2xl bg-[#3B82F6]/20 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Safe & Secure</h3>
              <p className="text-white/60 leading-relaxed">
                Verified profiles, mandatory 18+ enforcement, encrypted signaling, and proactive moderation keep the community welcoming.
              </p>
            </div>
          </div>
        </section>

        {/* Safety & Trust */}
        <section id="safety" className="py-24 border-t border-white/5 flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1">
            <div className="h-full w-full bg-gradient-to-br from-[#1a0b22] to-[#0a0a0c] border border-white/10 rounded-[40px] p-8 relative overflow-hidden aspect-square max-h-[500px]">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[#855CF6]/20 blur-[80px] rounded-full" />
              <div className="relative z-10 h-full w-full flex flex-col items-center justify-center gap-6 text-center">
                <svg className="w-24 h-24 text-white drop-shadow-2xl" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <h3 className="text-3xl font-black text-white">Your Safety First.</h3>
                <p className="text-white/70 font-medium px-4">
                  We actively moderate the platform to ensure a positive environment. Report and block with a single tap.
                </p>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-6">
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">Built on a foundation of Trust.</h2>
            <p className="text-lg text-white/60 leading-relaxed">
              VUZKI is committed to creating a respectful environment. We use advanced backend systems to enforce safety rules, prevent duplicate accounts, and immediately restrict abusive behavior.
            </p>
            <ul className="space-y-4 pt-4">
              <li className="flex items-start gap-3">
                <div className="mt-1 h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white/80">End-to-end encrypted WebRTC media pathways for all calls</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white/80">Strict 18+ age verification & verified community</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white/80">Zero-tolerance community protection policies</span>
              </li>
            </ul>
            <div className="pt-4 flex items-center gap-6">
              <Link href="/safety" className="text-[#FF2D8F] font-semibold hover:text-[#FF006E] transition-colors flex items-center gap-2">
                Read our Safety Policy
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* App Availability Section */}
        <section className="py-20 border-t border-white/5 text-center">
          <div className="rounded-3xl bg-white/5 border border-white/10 p-10 max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-3">Install VUZKI on Any Device</h3>
            <p className="text-white/65 text-sm md:text-base leading-relaxed mb-6">
              VUZKI is fully optimized as an installable Progressive Web App (PWA). Add VUZKI to your Home Screen on iOS or Android for full-screen calls, notifications, and instant access without app store downloads. Native app store releases are coming soon.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/welcome"
                className="px-6 py-3 rounded-full bg-gradient-to-r from-[#FF2D8F] to-[#855CF6] text-white text-sm font-bold shadow-glow"
              >
                Launch Web App
              </Link>
              <Link
                href="/features"
                className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-all"
              >
                View Features
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-black/40 backdrop-blur-lg">
        <div className="w-full max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <VuzkiLogo size={28} showTagline={false} />
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-white/50">
            <Link href="/features" className="hover:text-white transition-colors">Features</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/safety" className="hover:text-white transition-colors">Safety</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <Link href="/admin/login" className="hover:text-white transition-colors">Admin Portal</Link>
          </div>
          <p className="text-white/40 text-xs">© {new Date().getFullYear()} VUZKI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
