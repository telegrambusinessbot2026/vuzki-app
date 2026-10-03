import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#0a0a0c] flex flex-col relative overflow-x-hidden selection:bg-[#FF4DBD] selection:text-white">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] md:w-[80%] aspect-[1/1] md:aspect-[2/1] bg-gradient-radial from-[#FF4DBD]/15 to-transparent blur-[120px] pointer-events-none mix-blend-screen" />
      
      {/* Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-2">
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 38C20 38 4 28 4 15C4 9.47715 8.47715 5 14 5C17.0678 5 19.8133 6.37923 21.6441 8.5684C23.0805 6.43851 25.5905 5 28.5 5C34.0228 5 38.5 9.47715 38.5 15C38.5 28 20 38 20 38Z" fill="url(#paint_header_logo)"/>
            <defs>
              <linearGradient id="paint_header_logo" x1="4" y1="5" x2="38.5" y2="38" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FF4DBD"/>
                <stop offset="1" stopColor="#A855F7"/>
              </linearGradient>
            </defs>
          </svg>
          <span className="text-2xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#FF4DBD] to-[#A855F7]">VUZKI</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
          <Link href="#how-it-works" className="hover:text-white transition-colors">How it Works</Link>
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="#safety" className="hover:text-white transition-colors">Trust & Safety</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="hidden md:block text-sm font-medium text-white/80 hover:text-white transition-colors">
            Log In
          </Link>
          <Link href="/welcome" className="h-10 px-6 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white text-sm font-semibold flex items-center justify-center transition-all">
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 relative z-10">
        {/* Hero Section */}
        <section className="pt-20 pb-32 md:pt-32 md:pb-40 text-center max-w-4xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-medium text-white/80 tracking-wide">Thousands of users online now</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-6 leading-[1.1]">
            More than an App.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4DBD] to-[#A855F7]">
              A Better Way to Connect.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/60 font-medium max-w-2xl mb-10 leading-relaxed">
            VUZKI is the premium social platform designed for real people. 
            Discover meaningful connections, talk instantly via crystal-clear WebRTC, and find where you belong.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link href="/welcome" className="w-full sm:w-auto h-14 px-8 rounded-full bg-gradient-to-r from-[#FF4DBD] to-[#A855F7] text-white text-lg font-bold shadow-[0_0_32px_rgba(255,77,189,0.3)] hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,77,189,0.4)] transition-all flex items-center justify-center gap-2">
              Join VUZKI Today
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </section>

        {/* How it Works / Features */}
        <section id="how-it-works" className="py-24 border-t border-white/5">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How VUZKI Works</h2>
            <p className="text-white/60 max-w-xl mx-auto">We've rebuilt the connection experience from the ground up to be faster, safer, and more authentic.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/[0.07] transition-colors">
              <div className="h-14 w-14 rounded-2xl bg-[#FF4DBD]/20 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-[#FF4DBD]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Smart Discovery</h3>
              <p className="text-white/60 leading-relaxed">Our matching engine filters for active, available, and compatible users based on strict safety rules and shared interests.</p>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/[0.07] transition-colors">
              <div className="h-14 w-14 rounded-2xl bg-[#A855F7]/20 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-[#A855F7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Instant Talk Now</h3>
              <p className="text-white/60 leading-relaxed">Jump into high-quality WebRTC audio and video calls instantly. No waiting. Connect face-to-face when you're ready.</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/[0.07] transition-colors">
              <div className="h-14 w-14 rounded-2xl bg-[#3B82F6]/20 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Safe & Secure</h3>
              <p className="text-white/60 leading-relaxed">Verified profiles, mandatory 18+ enforcement, encrypted signaling, and proactive moderation keep the community safe.</p>
            </div>
          </div>
        </section>

        {/* Safety & Trust */}
        <section id="safety" className="py-24 border-t border-white/5 flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1">
            <div className="h-full w-full bg-gradient-to-br from-[#1a0b22] to-[#0a0a0c] border border-white/10 rounded-[40px] p-8 relative overflow-hidden aspect-square max-h-[500px]">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[#A855F7]/20 blur-[80px] rounded-full" />
              <div className="relative z-10 h-full w-full flex flex-col items-center justify-center gap-6 text-center">
                 <svg className="w-24 h-24 text-white drop-shadow-2xl" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                 <h3 className="text-3xl font-black text-white">Your Safety First.</h3>
                 <p className="text-white/70 font-medium px-4">We actively monitor and moderate the platform to ensure a positive environment. Report and block instantly.</p>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-6">
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">Built on a foundation of Trust.</h2>
            <p className="text-lg text-white/60 leading-relaxed">
              VUZKI is committed to creating a respectful environment. We use advanced backend systems to enforce safety rules, prevent duplicate accounts, and instantly restrict abusive behavior. 
            </p>
            <ul className="space-y-4 pt-4">
              <li className="flex items-start gap-3">
                <div className="mt-1 h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                </div>
                <span className="text-white/80">End-to-end WebRTC encryption for all calls</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                </div>
                <span className="text-white/80">Strict 18+ age enforcement & verified profiles</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                </div>
                <span className="text-white/80">Zero-tolerance community guidelines</span>
              </li>
            </ul>
            <div className="pt-4">
              <Link href="/safety" className="text-[#A855F7] font-semibold hover:text-[#FF4DBD] transition-colors flex items-center gap-2">
                Read our Safety Policy <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-black/40 backdrop-blur-lg">
        <div className="w-full max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black italic tracking-tighter text-white/40">VUZKI</span>
            <span className="text-white/30 text-sm">© 2026 All rights reserved.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-white/50">
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/safety" className="hover:text-white transition-colors">Community Guidelines</Link>
            <Link href="/auth/login" className="hover:text-white transition-colors">Admin Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
