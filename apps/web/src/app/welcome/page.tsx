'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function WelcomeCarousel() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      router.push('/auth/register');
    }
  };

  return (
    <div className="min-h-dvh bg-[#0a0a0c] flex flex-col relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1517365830460-955ce3ccd263?q=80&w=600&auto=format&fit=crop" 
          alt="Background" 
          className="w-full h-full object-cover opacity-60" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0c]/80 via-transparent to-[#0a0a0c] opacity-90" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-safe-top mt-4">
        <div className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 38C20 38 4 28 4 15C4 9.47715 8.47715 5 14 5C17.0678 5 19.8133 6.37923 21.6441 8.5684C23.0805 6.43851 25.5905 5 28.5 5C34.0228 5 38.5 9.47715 38.5 15C38.5 28 20 38 20 38Z" fill="url(#paint0_linear_logo_wel)"/>
            <defs>
              <linearGradient id="paint0_linear_logo_wel" x1="4" y1="5" x2="38.5" y2="38" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FF4DBD"/>
                <stop offset="1" stopColor="#A855F7"/>
              </linearGradient>
            </defs>
          </svg>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white leading-none">VUZKI</h1>
            <p className="text-[7px] text-white/70">Real People. Real Connections.</p>
          </div>
        </div>
        <Link href="/auth/register" className="text-sm font-medium text-white/70 hover:text-white">
          Skip
        </Link>
      </header>

      {/* Decorative Text */}
      <div className="relative z-10 flex-1 flex flex-col items-end pr-8 pt-12">
        <div className="text-right rotate-[-5deg]">
          <p className="font-serif italic text-[#FF4DBD] text-2xl drop-shadow-sm leading-tight">
            Meet<br/>Amazing<br/>People
          </p>
          <svg className="ml-auto mt-2 w-6 h-6 text-[#FF4DBD]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </div>
      </div>

      {/* Bottom Content */}
      <div className="relative z-10 px-6 pb-safe-bottom pb-8">
        <div className="w-12 h-1 bg-[#FF4DBD] mb-6 rounded-full" />
        <h2 className="text-4xl font-black text-white leading-none tracking-tight drop-shadow-md">Meet</h2>
        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF4DBD] to-[#A855F7] leading-tight tracking-tight drop-shadow-md mb-3">
          Amazing People
        </h2>
        <p className="text-white/80 text-[15px] max-w-[260px] leading-snug mb-8">
          Find new friends, have fun and create real connections.
        </p>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-2 bg-[#FF4DBD] shadow-[0_0_10px_rgba(255,77,189,0.8)]' : 'w-2 bg-white/30'}`} />
            ))}
          </div>
          <button onClick={handleNext} className="w-12 h-12 rounded-full bg-gradient-to-r from-[#FF4DBD] to-[#A855F7] flex items-center justify-center text-white shadow-[0_0_20px_rgba(255,77,189,0.5)] active:scale-95 transition-transform">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>

        <Link
          href="/auth/register"
          className="flex items-center justify-center w-full h-[56px] rounded-full bg-gradient-to-r from-[#FF4DBD] to-[#A855F7] text-white text-[17px] font-semibold shadow-[0_0_24px_rgba(255,77,189,0.4)] active:scale-95 transition-transform"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
