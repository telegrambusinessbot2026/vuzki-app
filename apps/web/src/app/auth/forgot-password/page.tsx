'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RedirectIfAuthed } from '@/components/shell/RedirectIfAuthed';
import { Input } from '@/components/ui/Input';

const MailIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;

const Logo = () => (
  <div className="flex flex-col items-center mb-8">
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4">
      <path d="M30 50C30 50 10 35 10 20C10 12 16 8 22 8C26 8 28 10 30 14C32 10 34 8 38 8C44 8 50 12 50 20C50 35 30 50 30 50Z" stroke="url(#paint0_linear)" strokeWidth="4" fill="none"/>
      <path d="M40 25C40 25 30 35 25 35C20 35 18 30 20 25C22 20 28 18 32 18C38 18 40 22 40 25Z" stroke="url(#paint1_linear)" strokeWidth="2" fill="none"/>
      <defs>
        <linearGradient id="paint0_linear" x1="10" y1="8" x2="50" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF2D8F"/>
          <stop offset="1" stopColor="#855CF6"/>
        </linearGradient>
        <linearGradient id="paint1_linear" x1="20" y1="18" x2="40" y2="35" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF006E"/>
          <stop offset="1" stopColor="#6C3BFF"/>
        </linearGradient>
      </defs>
    </svg>
    <h2 className="text-[28px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#FF2D8F] to-[#855CF6] leading-none mb-1">
      VUZKI
    </h2>
  </div>
);

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(true);
    } catch (err) {
      setError('Failed to send reset link. Please try again.');
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
          <Logo />
          
          <div className="text-center mb-8">
            <h1 className="text-[28px] font-bold text-white mb-2">Reset Password</h1>
            <p className="text-[13px] text-white/60 mx-auto max-w-[280px]">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {success ? (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium px-4 py-6 rounded-2xl text-center">
              Check your email for the reset link!
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input 
                prefix={<MailIcon />} 
                type="email" 
                placeholder="Email Address" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="rounded-xl border-white/10 focus:ring-[#FF2D8F]/50 focus:border-[#FF2D8F]"
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
                  'Send Reset Link'
                )}
              </button>
            </form>
          )}

          <div className="mt-auto pt-6 text-center">
            <span className="text-[13px] text-white/70">Remember your password? </span>
            <Link href="/auth/login" className="text-[13px] font-bold text-[#FF2D8F] hover:text-[#FF006E]">Log in</Link>
          </div>
        </div>
      </div>
    </RedirectIfAuthed>
  );
}
