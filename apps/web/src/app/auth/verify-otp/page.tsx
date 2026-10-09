'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { RedirectIfAuthed } from '@/components/shell/RedirectIfAuthed';
import { Input } from '@/components/ui/Input';
import { BrandLogo } from '@/components/ui/BrandLogo';

const KeyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const MailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyOtp, sendOtp } = useAuth();

  const [identifier, setIdentifier] = useState(searchParams.get('identifier') || '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanIdentifier = identifier.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (!cleanIdentifier) {
      setError('Please provide the email address you registered with.');
      return;
    }
    if (cleanOtp.length < 4 || cleanOtp.length > 8) {
      setError('Please enter a valid verification code.');
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(cleanIdentifier, cleanOtp, 'registration');
      setSuccess('Email verified successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/auth/login');
      }, 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const cleanIdentifier = identifier.trim().toLowerCase();
    if (!cleanIdentifier) {
      setError('Please enter your registered email address first.');
      return;
    }

    setError(null);
    setSuccess(null);
    setResending(true);
    try {
      await sendOtp(cleanIdentifier, 'registration');
      setSuccess('A new verification code has been sent.');
      setCountdown(60);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to resend code. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  return (
    <RedirectIfAuthed>
      <div className="min-h-dvh bg-[#0a0a0c] flex flex-col relative overflow-hidden font-sans text-white">
        <div className="absolute top-0 left-[-20%] w-[120%] aspect-square bg-gradient-radial from-[#FF2D8F]/15 to-transparent blur-[120px] pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[100%] aspect-square bg-gradient-radial from-[#855CF6]/15 to-transparent blur-[100px] pointer-events-none mix-blend-screen" />

        <header className="flex items-center justify-between px-6 pt-safe-top mt-4 relative z-10">
          <Link href="/auth/login" className="p-2 -ml-2 text-white/70 hover:text-white" aria-label="Back to login">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
        </header>

        <div className="flex-1 flex flex-col px-6 pt-6 pb-6 relative z-10 w-full max-w-sm mx-auto">
          <BrandLogo />

          <div className="text-center mb-8">
            <h1 className="text-[28px] font-bold text-white mb-2">Verify Account</h1>
            <p className="text-[13px] text-white/60 mx-auto max-w-[280px]">
              Enter the verification code sent to your registered Gmail address.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              prefix={<MailIcon />}
              type="email"
              placeholder="Registered Gmail Address"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="rounded-xl border-white/10 focus:ring-[#FF2D8F]/50 focus:border-[#FF2D8F]"
            />

            <Input
              prefix={<KeyIcon />}
              type="text"
              inputMode="numeric"
              placeholder="6-digit verification code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              className="rounded-xl border-white/10 focus:ring-[#FF2D8F]/50 focus:border-[#FF2D8F] tracking-widest text-center text-lg font-bold"
            />

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium px-4 py-3 rounded-2xl">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium px-4 py-3 rounded-2xl">
                {success}
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
                'Verify & Activate'
              )}
            </button>
          </form>

          <div className="mt-auto pt-6 text-center">
            <span className="text-[13px] text-white/70">Didn't receive a code? </span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || countdown > 0}
              className="text-[13px] font-bold text-[#FF2D8F] hover:text-[#FF006E] disabled:opacity-50"
            >
              {countdown > 0 ? `Resend in ${countdown}s` : resending ? 'Sending...' : 'Resend Code'}
            </button>
          </div>
        </div>
      </div>
    </RedirectIfAuthed>
  );
}

export default function VerifyOtpPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#FF2D8F] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyOtpForm />
    </React.Suspense>
  );
}
