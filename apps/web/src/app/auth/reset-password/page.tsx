'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RedirectIfAuthed } from '@/components/shell/RedirectIfAuthed';
import { PasswordInput } from '@/components/ui/Input';

const LockIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;

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

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      router.push('/auth/login');
    } catch (err) {
      setError('Failed to reset password. Please try again.');
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
            <h1 className="text-[28px] font-bold text-white mb-2">New Password</h1>
            <p className="text-[13px] text-white/60 mx-auto max-w-[280px]">
              Enter your new password below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordInput 
              prefix={<LockIcon />} 
              placeholder="New Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              className="rounded-xl border-white/10 focus:ring-[#FF2D8F]/50 focus:border-[#FF2D8F]"
            />
            <PasswordInput 
              prefix={<LockIcon />} 
              placeholder="Confirm Password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
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
                'Update Password'
              )}
            </button>
          </form>
        </div>
      </div>
    </RedirectIfAuthed>
  );
}
