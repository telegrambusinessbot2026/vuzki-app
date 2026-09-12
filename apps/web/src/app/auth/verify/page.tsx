'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { RedirectIfAuthed } from '@/components/shell/RedirectIfAuthed';
import { Button } from '@/components/ui/Button';
import { ArrowLeftIcon } from '@/components/ui/Icons';

export default function VerifyPage() {
  const router = useRouter();
  const { verifyOtp, sendOtp } = useAuth();

  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [sent, setSent] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length > 1) {
      const arr = clean.slice(0, 4).split('');
      const next = [...arr, ...Array(4).fill('')].slice(0, 4);
      setDigits(next);
      inputs.current[Math.min(clean.length, 3)]?.focus();
      return;
    }
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < 3) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const otp = digits.join('');
    if (!identifier.trim()) {
      setError('Enter the email or phone you registered with.');
      return;
    }
    if (otp.length !== 4) {
      setError('Enter the 4-digit code.');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(identifier, otp, 'register');
      setSent(true);
      router.push('/auth/login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setResending(true);
    try {
      await sendOtp(identifier, 'register');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <RedirectIfAuthed>
      <div className="min-h-screen bg-surface px-6 flex flex-col justify-center">
        <Link href="/" className="absolute top-6 left-6 p-2 -ml-2 rounded-full hover:bg-surface-overlay text-white/70">
          <ArrowLeftIcon />
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="h-11 w-11 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow">
            <span className="text-2xl font-black text-white">V</span>
          </div>
          <h1 className="bg-gradient-to-r from-brand-400 to-pink-500 bg-clip-text text-transparent text-2xl font-bold">Verify your account</h1>
        </div>

        <p className="text-white/50 text-sm mb-6">
          We sent a 4-digit code to your phone or email. Enter it below to confirm your registration.
        </p>

        <form onSubmit={handleVerify} className="space-y-5">
          <input
            className="w-full h-12 px-4 bg-surface-overlay border border-surface-border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Email or phone you registered"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />

          <div className="flex gap-3 justify-between">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="h-16 w-16 text-center text-2xl font-bold bg-surface-overlay border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 border-surface-border"
              />
            ))}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {sent && <p className="text-sm text-green-400">Verified! Redirecting to login…</p>}

          <Button type="submit" variant="gradient" size="lg" full loading={loading}>
            Verify
          </Button>

          <button type="button" onClick={handleResend} className="w-full text-center text-sm text-brand-400 hover:text-brand-300" disabled={resending}>
            {resending ? 'Resending…' : 'Resend code'}
          </button>
        </form>
      </div>
    </RedirectIfAuthed>
  );
}
