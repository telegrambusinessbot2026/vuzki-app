'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { RedirectIfAuthed } from '@/components/shell/RedirectIfAuthed';
import { Input, PasswordInput } from '@/components/ui/Input';
import { BrandLogo } from '@/components/ui/BrandLogo';

const MailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const KeyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M21.35 11.1h-9.17v2.73h5.51c-.18 1.48-1.12 2.62-2.4 3.48v2.85h3.9a9.66 9.66 0 0 0 3.01-6.91c0-.75-.12-1.48-.35-2.15z" fill="#4285F4" />
    <path d="M12.18 20.47c2.6 0 4.79-.86 6.38-2.33l-3.9-2.85c-.86.58-1.95.92-3.1.92-2.38 0-4.4-1.61-5.12-3.77H2.43v2.94c1.61 3.2 4.93 5.4 8.75 5.4z" fill="#34A853" />
    <path d="M7.06 12.44c-.18-.54-.29-1.1-.29-1.68 0-.58.11-1.14.29-1.68V6.14H2.43a9.7 9.7 0 0 0-.6 3.42c0 1.57.37 3.06 1.02 4.38l4.21-1.5z" fill="#FBBC05" />
    <path d="M12.18 5.4c1.41 0 2.68.48 3.68 1.44l2.76-2.76A9.63 9.63 0 0 0 12.18 1C8.36 1 5.04 3.2 3.43 6.4L7.64 9.34c.72-2.16 2.74-3.77 5.12-3.77z" fill="#EA4335" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [useOtp, setUseOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const authed = await login(identifier.trim().toLowerCase(), useOtp ? undefined : password, useOtp ? otp : undefined);
      router.push(authed.needsOnboarding ? '/app/onboarding' : '/app/home');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to log in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (action: () => Promise<void>, providerName: string) => {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError((err as Error)?.message || `${providerName} sign-in is not configured yet.`);
    }
  };

  const toggleOtp = () => {
    setUseOtp((v) => !v);
    setError(null);
  };

  return (
    <RedirectIfAuthed>
      <div className="min-h-dvh bg-[#0a0a0c] flex flex-col relative overflow-hidden font-sans text-white">
        {/* Background blobs matching the brand identity */}
        <div className="absolute top-0 left-[-20%] w-[120%] aspect-square bg-gradient-radial from-[#FF2D8F]/15 to-transparent blur-[120px] pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[100%] aspect-square bg-gradient-radial from-[#855CF6]/15 to-transparent blur-[100px] pointer-events-none mix-blend-screen" />

        <header className="flex items-center justify-between px-6 pt-safe-top mt-4 relative z-10">
          <Link href="/" className="p-2 -ml-2 text-white/70 hover:text-white" aria-label="Home">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
        </header>

        <div className="flex-1 flex flex-col px-6 pt-6 pb-6 relative z-10 w-full max-w-sm mx-auto">
          <BrandLogo />

          <div className="text-center mb-8">
            <h1 className="text-[28px] font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-[13px] text-white/60 mx-auto max-w-[280px]">
              Login to continue where you left off
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              prefix={<MailIcon />}
              type={useOtp ? 'tel' : 'text'}
              placeholder={useOtp ? '+1 555 000 1234' : 'Email Address or Phone'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="rounded-xl border-white/10 focus:ring-[#FF2D8F]/50 focus:border-[#FF2D8F]"
            />
            {useOtp ? (
              <Input
                prefix={<KeyIcon />}
                type="text"
                inputMode="numeric"
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="rounded-xl border-white/10 focus:ring-[#FF2D8F]/50 focus:border-[#FF2D8F]"
              />
            ) : (
              <PasswordInput
                prefix={<LockIcon />}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rounded-xl border-white/10 focus:ring-[#FF2D8F]/50 focus:border-[#FF2D8F]"
              />
            )}

            <div className="flex items-center justify-between px-2 pt-1">
              <button
                type="button"
                onClick={toggleOtp}
                className="text-xs font-semibold text-[#FF2D8F] hover:text-[#FF006E] transition-colors uppercase tracking-wider"
              >
                {useOtp ? 'Use password' : 'Use one-time code'}
              </button>
              <Link href="/auth/forgot-password" className="text-xs font-semibold text-white/40 hover:text-white transition-colors uppercase tracking-wider">
                Forgot?
              </Link>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium px-4 py-3 rounded-2xl">
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
                <>
                  Log in
                  <svg className="absolute right-6 w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center gap-4">
            <div className="flex-1 h-[1px] bg-white/10" />
            <span className="text-[13px] text-white/50 font-medium">Or continue with</span>
            <div className="flex-1 h-[1px] bg-white/10" />
          </div>

          <div className="mt-6 mb-8">
            <button
              type="button"
              onClick={() => handleSocialAuth(loginWithGoogle, 'Google')}
              className="w-full flex items-center justify-center gap-3 h-14 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white font-sans font-medium text-sm"
              title="Continue with Google"
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="mt-auto pt-6 text-center">
            <span className="text-[13px] text-white/70">Don't have an account? </span>
            <Link href="/auth/register" className="text-[13px] font-bold text-[#FF2D8F] hover:text-[#FF006E]">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </RedirectIfAuthed>
  );
}
