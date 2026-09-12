'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { RedirectIfAuthed } from '@/components/shell/RedirectIfAuthed';
import { Button } from '@/components/ui/Button';
import { Input, PasswordInput, Select } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Card';
import { ArrowLeftIcon } from '@/components/ui/Icons';

const genders = ['Female', 'Male', 'Other'];
const countries = [
  { value: 'US', label: 'United States' },
  { value: 'IN', label: 'India' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'BR', label: 'Brazil' },
  { value: 'MX', label: 'Mexico' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [gender, setGender] = useState('Female');
  const [age, setAge] = useState('');
  const [country, setCountry] = useState('US');
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!terms) {
      setError('Please accept the Terms of Service to continue.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await register({
        username,
        email,
        phone,
        password,
        gender,
        age: age ? Number(age) : undefined,
        countryCode: country,
      });
      router.push('/app/onboarding');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RedirectIfAuthed>
      <div className="min-h-screen bg-surface px-6 py-8 flex flex-col">
        <Link href="/" className="p-2 -ml-2 mb-4 self-start rounded-full hover:bg-surface-overlay text-white/70">
          <ArrowLeftIcon />
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Create your <span className="bg-gradient-to-r from-brand-400 to-pink-500 bg-clip-text text-transparent">account</span>
          </h1>
          <p className="text-white/50 text-sm mt-1">Join millions on VUZKI</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 flex-1">
          <Input label="Username" placeholder="coolmaya" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Phone" type="tel" placeholder="+1 555 000 1234" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <PasswordInput label="Password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <PasswordInput label="Confirm" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>

          <div>
            <span className="block text-sm font-medium text-white/80 mb-1.5">Gender</span>
            <div className="flex gap-2">
              {genders.map((g) => (
                <Chip key={g} selected={gender === g} onClick={() => setGender(g)}>{g}</Chip>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Age" type="number" min={18} max={99} placeholder="23" value={age} onChange={(e) => setAge(e.target.value)} required />
            <Select label="Country" options={countries} value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>

          <label className="flex items-start gap-2 text-xs text-white/60">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-brand-600"
            />
            <span>
              I agree to the <span className="text-brand-400">Terms of Service</span> and <span className="text-brand-400">Privacy Policy</span>
            </span>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" variant="gradient" size="lg" full loading={loading}>
            Create Account
          </Button>

          {/* TODO(oauth): Google & Apple sign-up buttons are intentionally hidden
            until a real backend OAuth flow exists (authorization redirect,
            callback, code/token exchange, ID-token verification, account
            linking, and token issuance). Do NOT re-add these buttons or present
            them as working sign-up methods until that flow is implemented. */}

          <p className="text-center text-sm text-white/50">
            Already have an account? <Link href="/auth/login" className="text-brand-400 font-semibold">Log in</Link>
          </p>
        </form>
      </div>
    </RedirectIfAuthed>
  );
}
