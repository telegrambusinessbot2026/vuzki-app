'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { RedirectIfAuthed } from '@/components/shell/RedirectIfAuthed';
import { Button } from '@/components/ui/Button';
import { Input, PasswordInput } from '@/components/ui/Input';
import { ArrowLeftIcon } from '@/components/ui/Icons';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

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
      const authed = await login(identifier, useOtp ? undefined : password, useOtp ? otp : undefined);
      router.push(authed.needsOnboarding ? '/app/onboarding' : '/app/home');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to log in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleOtp = () => {
    setUseOtp((v) => !v);
    setError(null);
  };

  return (
    <RedirectIfAuthed>
      <div className="min-h-dvh bg-[#0a0a0c] px-6 flex flex-col justify-center relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[50%] bg-brand-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[40%] bg-pink-600/20 blur-[120px] rounded-full pointer-events-none" />

        <Link href="/" className="absolute top-safe mt-6 left-6 h-10 w-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 active:scale-95 transition-all z-10">
          <ArrowLeftIcon size={18} />
        </Link>

        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="h-20 w-20 rounded-[28px] bg-brand-gradient flex items-center justify-center shadow-glow mb-6">
            <span className="text-5xl font-black text-white drop-shadow-md">V</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Welcome Back</h1>
          <p className="text-white/60 font-medium text-sm">Enter your details to sign in</p>
        </div>

        <div className="rounded-3xl p-6 relative z-10 w-full max-w-sm mx-auto">
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label={useOtp ? 'Phone or email' : 'Email or phone'}
              type={useOtp ? 'tel' : 'text'}
              placeholder={useOtp ? '+1 555 000 1234' : 'you@example.com'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
            {useOtp ? (
              <Input
                label="One-time code"
                type="text"
                inputMode="numeric"
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            ) : (
              <PasswordInput
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            )}

            <div className="flex items-center justify-between mt-2">
              <button type="button" onClick={toggleOtp} className="text-xs font-bold text-brand-300 hover:text-brand-200 transition-colors uppercase tracking-wider">
                {useOtp ? 'Use password' : 'Use one-time code'}
              </button>
              <button type="button" className="text-xs font-bold text-white/40 hover:text-white transition-colors uppercase tracking-wider">Forgot?</button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium px-4 py-3 rounded-2xl animate-shake">
                {error}
              </div>
            )}

            <Button type="submit" variant="gradient" size="lg" full loading={loading} className="mt-8 shadow-glow rounded-2xl h-14 text-lg">
              Sign In
            </Button>
          </form>

          <div className="mt-8 flex items-center justify-center text-sm font-medium">
            <span className="text-white/50 mr-2">New to Vuzki?</span>
            <Link href="/auth/register" className="text-brand-300 font-bold hover:text-brand-200 transition-colors">Create account</Link>
          </div>
        </div>
      </div>
    </RedirectIfAuthed>
  );
}
