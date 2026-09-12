'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/lib/store';

export default function LoginPage() {
  const { session, login } = useAdmin();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) router.replace('/dashboard');
  }, [session, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch {
      setError('Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-black text-white shadow-glow">
            V
          </div>
          <h1 className="text-2xl font-bold">VUZKI Admin</h1>
          <p className="mt-1 text-sm text-white/40">Sign in to the moderation dashboard</p>
        </div>

        <div className="rounded-2xl border border-[#2a2a37] bg-[#16161d] p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@vuzki.app"
                className="w-full rounded-lg border border-[#2a2a37] bg-[#111118] px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-brand-500/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-[#2a2a37] bg-[#111118] px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-brand-500/50"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-5 rounded-lg bg-[#111118] px-3 py-2.5 text-xs text-white/40">
            Sign in with your admin credentials.
          </div>
        </div>
      </div>
    </div>
  );
}
