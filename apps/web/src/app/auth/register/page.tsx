'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { RedirectIfAuthed } from '@/components/shell/RedirectIfAuthed';
import { Input, PasswordInput } from '@/components/ui/Input';

// Inline Icons to match the UI
const UserIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const MailIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;
const LockIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;
const CalendarIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const GoogleIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21.35 11.1h-9.17v2.73h5.51c-.18 1.48-1.12 2.62-2.4 3.48v2.85h3.9a9.66 9.66 0 0 0 3.01-6.91c0-.75-.12-1.48-.35-2.15z" fill="#4285F4"/><path d="M12.18 20.47c2.6 0 4.79-.86 6.38-2.33l-3.9-2.85c-.86.58-1.95.92-3.1.92-2.38 0-4.4-1.61-5.12-3.77H2.43v2.94c1.61 3.2 4.93 5.4 8.75 5.4z" fill="#34A853"/><path d="M7.06 12.44c-.18-.54-.29-1.1-.29-1.68 0-.58.11-1.14.29-1.68V6.14H2.43a9.7 9.7 0 0 0-.6 3.42c0 1.57.37 3.06 1.02 4.38l4.21-1.5z" fill="#FBBC05"/><path d="M12.18 5.4c1.41 0 2.68.48 3.68 1.44l2.76-2.76A9.63 9.63 0 0 0 12.18 1C8.36 1 5.04 3.2 3.43 6.4L7.64 9.34c.72-2.16 2.74-3.77 5.12-3.77z" fill="#EA4335"/></svg>;
const AppleIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M17.05 16.48c-.02.06-2.6 9-7.25 9-2.22 0-3.08-1.37-5.63-1.37-2.5 0-3.5 1.35-5.58 1.35-4.8 0-7.85-9.67-4.48-15.52 1.6-2.78 4.45-4.52 7.42-4.55 2.37-.02 4.6 1.62 5.85 1.62 1.25 0 3.8-1.92 6.57-1.65 1.15.05 4.38.45 6.45 3.48-5.32 3.1-4.45 10.6.9 12.75-.43 1.1-.98 2.22-1.6 3.28h-1.68v-.02l-1.6.02v-3.23l-3.32-.02-.13-5.23zm-3.15-13.8a6.38 6.38 0 0 0 1.5-4.68 6.55 6.55 0 0 0-4.22 2.18 6.13 6.13 0 0 0-1.55 4.5 5.25 5.25 0 0 0 4.27-2z" transform="scale(0.85) translate(2.5, 1)"/></svg>;
const FacebookIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="#1877F2" xmlns="http://www.w3.org/2000/svg"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07z"/></svg>;

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
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
    setLoading(true);
    try {
      await register({
        username: username || email.split('@')[0], // Use part of email if username is empty, but we collect it via "Full Name" visually
        email,
        phone: phone || '+10000000000', // Mock phone since it's not in the design
        password,
        gender: 'Other', // Mock gender since it's not in the design
        age: age ? Number(age) : 18,
        countryCode: 'US',
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
      <div className="min-h-dvh bg-[#0a0a0c] flex flex-col relative overflow-hidden">
        {/* Background blobs matching the reference */}
        <div className="absolute top-0 left-[-20%] w-[120%] aspect-square bg-gradient-radial from-[#FF4DBD]/20 to-transparent blur-[120px] pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[100%] aspect-square bg-gradient-radial from-[#A855F7]/20 to-transparent blur-[100px] pointer-events-none mix-blend-screen" />

        <header className="flex items-center justify-between px-6 pt-safe-top mt-4 relative z-10">
          <Link href="/" className="p-2 -ml-2 text-white/70 hover:text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Link>
          <div className="text-right">
            <span className="text-[13px] text-white/70">Already have an account?<br/></span>
            <Link href="/auth/login" className="text-[13px] font-bold text-[#FF4DBD] hover:text-pink-400">Login</Link>
          </div>
        </header>

        <div className="flex-1 flex flex-col px-6 pt-6 relative z-10 w-full max-w-sm mx-auto">
          {/* Logo & Header */}
          <div className="flex flex-col items-center mb-8">
            <svg width="60" height="60" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4">
              <path d="M20 38C20 38 4 28 4 15C4 9.47715 8.47715 5 14 5C17.0678 5 19.8133 6.37923 21.6441 8.5684C23.0805 6.43851 25.5905 5 28.5 5C34.0228 5 38.5 9.47715 38.5 15C38.5 28 20 38 20 38Z" fill="url(#paint0_linear_logo_reg)"/>
              <defs>
                <linearGradient id="paint0_linear_logo_reg" x1="4" y1="5" x2="38.5" y2="38" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FF4DBD"/>
                  <stop offset="1" stopColor="#A855F7"/>
                </linearGradient>
              </defs>
            </svg>
            <h2 className="text-[28px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#FF4DBD] to-[#A855F7] leading-none mb-1">
              VUZKI
            </h2>
            <p className="text-[11px] text-white font-medium tracking-tight mb-8">Real People. Real Connections.</p>
            
            <h1 className="text-[28px] font-bold text-white mb-2">Create Account</h1>
            <p className="text-[13px] text-white/60 text-center max-w-[280px]">
              Join VUZKI and start meeting amazing people today!
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <Input 
              prefix={<UserIcon />} 
              placeholder="Full Name" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
            />
            <Input 
              prefix={<MailIcon />} 
              type="email" 
              placeholder="Email Address" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
            <PasswordInput 
              prefix={<LockIcon />} 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
            <Input 
              prefix={<CalendarIcon />} 
              type="number" 
              placeholder="Date of Birth" 
              value={age} 
              onChange={(e) => setAge(e.target.value)} 
              suffix={<span className="text-xs font-medium text-white/50">18+</span>}
              required 
            />

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium px-4 py-3 rounded-2xl">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="relative flex items-center justify-center w-full h-[56px] rounded-full bg-gradient-to-r from-[#FF4DBD] to-[#A855F7] text-white text-[17px] font-semibold shadow-[0_0_24px_rgba(255,77,189,0.3)] active:scale-95 transition-transform mt-6"
            >
              Sign Up
              <svg className="absolute right-6 w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </form>

          <div className="mt-8 flex items-center gap-4">
            <div className="flex-1 h-[1px] bg-white/10" />
            <span className="text-[13px] text-white/50">Or continue with</span>
            <div className="flex-1 h-[1px] bg-white/10" />
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6 mb-8">
            <button type="button" className="flex items-center justify-center h-14 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition-all">
              <GoogleIcon />
            </button>
            <button type="button" className="flex items-center justify-center h-14 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition-all">
              <AppleIcon />
            </button>
            <button type="button" className="flex items-center justify-center h-14 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition-all">
              <FacebookIcon />
            </button>
          </div>

          <label className="flex items-center justify-center gap-3 mt-auto mb-safe-bottom pb-8 cursor-pointer group mx-auto">
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                className="peer appearance-none h-5 w-5 rounded-md border-2 border-[#FF4DBD] bg-white/5 checked:bg-[#FF4DBD] transition-all cursor-pointer"
              />
              <svg className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-[11px] text-white/70 font-medium group-hover:text-white transition-colors">
              I agree to the <Link href="/terms" className="text-[#FF4DBD] hover:text-pink-400">Terms of Service</Link> and <Link href="/privacy" className="text-[#FF4DBD] hover:text-pink-400">Privacy Policy</Link>
            </span>
          </label>
        </div>
      </div>
    </RedirectIfAuthed>
  );
}
