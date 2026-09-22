import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#0a0a0c] flex flex-col justify-between relative overflow-hidden">
      {/* Decorative background blurs matching blueprint */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] aspect-square bg-gradient-radial from-brand-600/30 to-transparent blur-[100px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[120%] aspect-square bg-gradient-radial from-pink-600/20 to-transparent blur-[80px] pointer-events-none mix-blend-screen" />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10">
        <svg width="80" height="80" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-6 drop-shadow-2xl">
          <path d="M20 38C20 38 4 28 4 15C4 9.47715 8.47715 5 14 5C17.0678 5 19.8133 6.37923 21.6441 8.5684C23.0805 6.43851 25.5905 5 28.5 5C34.0228 5 38.5 9.47715 38.5 15C38.5 28 20 38 20 38Z" fill="url(#paint0_linear_logo_splash)"/>
          <defs>
            <linearGradient id="paint0_linear_logo_splash" x1="4" y1="5" x2="38.5" y2="38" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FF4DBD"/>
              <stop offset="1" stopColor="#A855F7"/>
            </linearGradient>
          </defs>
        </svg>
        <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-md">
          VUZKI
        </h1>
      </main>

      {/* Bottom CTA */}
      <div className="px-6 pb-safe pb-12 relative z-10">
        <Link
          href="/auth/login"
          className="flex items-center justify-center w-full h-14 rounded-2xl bg-brand-gradient text-white text-lg font-bold shadow-glow hover:scale-[0.98] transition-transform"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
