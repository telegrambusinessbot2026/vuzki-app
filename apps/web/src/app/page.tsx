import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#0a0a0c] flex flex-col justify-between relative overflow-hidden">
      {/* Decorative background blurs matching reference */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] aspect-square bg-gradient-radial from-[#FF4DBD]/30 to-transparent blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-1/4 right-0 w-[100%] aspect-square bg-gradient-radial from-[#A855F7]/30 to-transparent blur-[100px] pointer-events-none mix-blend-screen" />

      {/* Top right handwritten text */}
      <div className="absolute top-16 right-6 text-right rotate-[-5deg]">
        <p className="font-serif italic text-[#FF4DBD] text-xl drop-shadow-sm leading-tight">
          More than<br/>an App<br/>A Better Way<br/>to Connect
        </p>
        <svg className="ml-auto mt-1 w-5 h-5 text-[#FF4DBD]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6">
        <div className="relative mb-4">
          <svg width="120" height="120" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
            <path d="M20 38C20 38 4 28 4 15C4 9.47715 8.47715 5 14 5C17.0678 5 19.8133 6.37923 21.6441 8.5684C23.0805 6.43851 25.5905 5 28.5 5C34.0228 5 38.5 9.47715 38.5 15C38.5 28 20 38 20 38Z" fill="url(#paint0_linear_logo_splash)"/>
            <defs>
              <linearGradient id="paint0_linear_logo_splash" x1="4" y1="5" x2="38.5" y2="38" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FF4DBD"/>
                <stop offset="1" stopColor="#A855F7"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 className="text-[52px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#FF4DBD] to-[#A855F7] drop-shadow-md mb-2">
          VUZKI
        </h1>
        <p className="text-white text-[19px] font-medium tracking-tight mb-2">
          Real People. Real Connections.
        </p>
        <div className="flex items-center gap-3 text-sm text-[#3B82F6] font-medium tracking-wide">
          <span>Talk</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]"></span>
          <span>Connect</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]"></span>
          <span>Belong</span>
        </div>
      </main>

      {/* Bottom CTA */}
      <div className="px-6 pb-safe pb-12 relative z-10 space-y-4">
        <Link
          href="/welcome"
          className="flex items-center justify-center w-full h-[56px] rounded-full bg-gradient-to-r from-[#FF4DBD] to-[#A855F7] text-white text-[17px] font-semibold shadow-[0_0_24px_rgba(255,77,189,0.4)] hover:scale-[0.98] transition-transform"
        >
          Get Started
          <svg className="absolute right-6 w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
        </Link>
        <Link
          href="/auth/login"
          className="flex items-center justify-center w-full h-[56px] rounded-full bg-transparent border-[1.5px] border-white/20 text-white text-[17px] font-semibold hover:bg-white/5 transition-colors"
        >
          I Already Have an Account
        </Link>
      </div>
    </div>
  );
}
