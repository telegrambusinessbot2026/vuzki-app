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
      <div className="min-h-screen bg-surface px-6 flex flex-col justify-center">
        <Link href="/" className="absolute top-6 left-6 p-2 -ml-2 rounded-full hover:bg-surface-overlay text-white/70">
          <ArrowLeftIcon />
        </Link>

        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-glow mb-4">
            <span className="text-4xl font-black text-white">V</span>
          </div>
          <h1 className="bg-gradient-to-r from-brand-400 to-pink-500 bg-clip-text text-transparent text-3xl font-bold tracking-tight">VUZKI</h1>
          <p className="text-white/50 text-sm mt-1">Meet · Talk · Connect</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 mb-5">
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

          <button type="button" onClick={toggleOtp} className="text-sm text-brand-400 hover:text-brand-300">
            {useOtp ? 'Use password instead' : 'Use one-time code instead'}
          </button>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" variant="gradient" size="lg" full loading={loading}>
            Log in
          </Button>
        </form>

        {/* TODO(oauth): Google & Apple sign-in buttons are intentionally hidden
            until a real backend OAuth flow exists (authorization redirect,
            callback, code/token exchange, ID-token verification, account
            linking, and token issuance). Do NOT re-add these buttons or present
            them as working login methods until that flow is implemented. */}

        <div className="flex items-center justify-between text-sm">
          <button type="button" className="text-white/50 hover:text-white">Forgot password</button>
          <Link href="/auth/register" className="text-brand-400 font-semibold hover:text-brand-300">Create account</Link>
        </div>
      </div>
    </RedirectIfAuthed>
  );
}
