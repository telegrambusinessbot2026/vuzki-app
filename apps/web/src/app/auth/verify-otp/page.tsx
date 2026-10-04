'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RedirectIfAuthed } from '@/components/shell/RedirectIfAuthed';
import { Input } from '@/components/ui/Input';
import { BrandLogo } from '@/components/ui/BrandLogo';

const KeyIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>;


export default function VerifyOtpPage() {
  const router = useRouter();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      router.push('/app/home');
    } catch (err) {
      setError('Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RedirectIfAuthed>
      <div className="min-h-dvh bg-[#0a0a0c] flex flex-col relative overflow-hidden font-sans text-white">
        <div className="absolute top-0 left-[-20%] w-[120%] aspect-square bg-gradient-radial from-[#FF2D8F]/15 to-transparent blur-[120px] pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[100%] aspect-square bg-gradient-radial from-[#855CF6]/15 to-transparent blur-[100px] pointer-events-none mix-blend-screen" />

        <header className="flex items-center justify-between px-6 pt-safe-top mt-4 relative z-10">
          <Link href="/auth/login" className="p-2 -ml-2 text-white/70 hover:text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Link>
        </header>

        <div className="flex-1 flex flex-col px-6 pt-6 pb-6 relative z-10 w-full max-w-sm mx-auto">
          <BrandLogo />
          
          <div className="text-center mb-8">
            <h1 className="text-[28px] font-bold text-white mb-2">Verification</h1>
            <p className="text-[13px] text-white/60 mx-auto max-w-[280px]">
              Enter the 6-digit code we sent to your email.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              prefix={<KeyIcon />}
              type="text"
              inputMode="numeric"
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              className="rounded-xl border-white/10 focus:ring-[#FF2D8F]/50 focus:border-[#FF2D8F] tracking-widest text-center text-lg"
            />

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium px-4 py-3 rounded-2xl mt-4">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="relative flex items-center justify-center w-full h-[56px] rounded-full bg-gradient-to-r from-[#FF2D8F] to-[#855CF6] text-white text-[17px] font-semibold shadow-[0_0_24px_rgba(255,45,143,0.3)] hover:shadow-[0_0_32px_rgba(255,45,143,0.4)] active:scale-95 transition-all mt-6 disabled:opacity-70 disabled:active:scale-100"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Verify'
              )}
            </button>
          </form>

          <div className="mt-auto pt-6 text-center">
            <span className="text-[13px] text-white/70">Didn't receive code? </span>
            <button className="text-[13px] font-bold text-[#FF2D8F] hover:text-[#FF006E]">Resend</button>
          </div>
        </div>
      </div>
    </RedirectIfAuthed>
  );
}
