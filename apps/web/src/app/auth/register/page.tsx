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
      <div className="min-h-dvh bg-[#0a0a0c] px-6 flex flex-col justify-center relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[50%] bg-brand-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[40%] bg-pink-600/20 blur-[120px] rounded-full pointer-events-none" />

        <Link href="/" className="absolute top-safe mt-6 left-6 h-10 w-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 active:scale-95 transition-all z-10">
          <ArrowLeftIcon size={18} />
        </Link>

        <div className="mb-6 mt-16 relative z-10 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Create your <span className="bg-gradient-to-r from-brand-400 to-pink-500 bg-clip-text text-transparent drop-shadow-sm">account</span>
          </h1>
          <p className="text-white/60 text-sm font-medium">Join millions on VUZKI</p>
        </div>

        <div className="mb-6 relative z-10 w-full max-w-sm mx-auto">
          <form onSubmit={handleRegister} className="space-y-4 flex-1">
            <Input label="Username" placeholder="coolmaya" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Phone" type="tel" placeholder="+1 555 000 1234" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            <div className="grid grid-cols-2 gap-3">
              <PasswordInput label="Password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <PasswordInput label="Confirm" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>

            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2 pl-1">Gender</span>
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

            <label className="flex items-start gap-3 mt-4 mb-2 cursor-pointer group">
              <div className="relative flex items-center justify-center mt-0.5">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  className="peer appearance-none h-5 w-5 rounded border border-white/20 bg-white/5 checked:bg-brand-500 checked:border-brand-500 transition-all cursor-pointer"
                />
                <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-xs text-white/60 font-medium group-hover:text-white/80 transition-colors leading-relaxed">
                I agree to the <Link href="/terms" className="text-brand-400 hover:text-brand-300">Terms of Service</Link> and <Link href="/privacy" className="text-brand-400 hover:text-brand-300">Privacy Policy</Link>
              </span>
            </label>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium px-4 py-3 rounded-2xl animate-shake">
                {error}
              </div>
            )}

            <Button type="submit" variant="gradient" size="lg" full loading={loading} className="mt-8 shadow-glow rounded-2xl h-14 text-lg">
              Create Account
            </Button>
          </form>

          <div className="mt-8 flex items-center justify-center text-sm font-medium">
             <span className="text-white/50 mr-2">Already have an account?</span>
             <Link href="/auth/login" className="text-brand-300 font-bold hover:text-brand-200 transition-colors">Log in</Link>
          </div>
        </div>
      </div>
    </RedirectIfAuthed>
  );
}
