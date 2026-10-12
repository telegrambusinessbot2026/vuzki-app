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

const GoogleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M21.35 11.1h-9.17v2.73h5.51c-.18 1.48-1.12 2.62-2.4 3.48v2.85h3.9a9.66 9.66 0 0 0 3.01-6.91c0-.75-.12-1.48-.35-2.15z" fill="#4285F4" />
    <path d="M12.18 20.47c2.6 0 4.79-.86 6.38-2.33l-3.9-2.85c-.86.58-1.95.92-3.1.92-2.38 0-4.4-1.61-5.12-3.77H2.43v2.94c1.61 3.2 4.93 5.4 8.75 5.4z" fill="#34A853" />
    <path d="M7.06 12.44c-.18-.54-.29-1.1-.29-1.68 0-.58.11-1.14.29-1.68V6.14H2.43a9.7 9.7 0 0 0-.6 3.42c0 1.57.37 3.06 1.02 4.38l4.21-1.5z" fill="#FBBC05" />
    <path d="M12.18 5.4c1.41 0 2.68.48 3.68 1.44l2.76-2.76A9.63 9.63 0 0 0 12.18 1C8.36 1 5.04 3.2 3.43 6.4L7.64 9.34c.72-2.16 2.74-3.77 5.12-3.77z" fill="#EA4335" />
  </svg>
);

type GenderType = 'MALE' | 'FEMALE';

export default function RegisterPage() {
  const router = useRouter();
  const { register, sendOtp, loginWithGoogle } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<GenderType>('MALE');
  const [terms, setTerms] = useState(false);

  // OTP Verification state
  const [step, setStep] = useState<'FORM' | 'OTP'>('FORM');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Countdown timer for OTP resend
  React.useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!terms) {
      setError('Please accept the Terms of Service to continue.');
      return;
    }
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@gmail.com')) {
      setError('Registration currently requires a Gmail address (@gmail.com).');
      return;
    }
    const rawDigits = phone.replace(/\D/g, '');
    if (rawDigits.length < 7 || rawDigits.length > 14) {
      setError('Please enter a valid mobile number.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters with letters and numbers.');
      return;
    }
    if (!dob) {
      setError('Please enter your date of birth (must be 18+).');
      return;
    }

    setLoading(true);
    try {
      await sendOtp(cleanEmail, 'registration');
      setStep('OTP');
      setOtpSent(true);
      setOtpCountdown(60);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : (err?.message || 'Failed to send verification code.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otp.trim()) {
      setError('Please enter the verification code sent to your email.');
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `${countryCode}${phone.replace(/\D/g, '')}`;
      await register({
        email: email.trim().toLowerCase(),
        phone: fullPhone,
        countryCode,
        password,
        name: name.trim(),
        dob,
        gender,
        otp: otp.trim(),
      });
      router.push('/app/onboarding');
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : (err?.message || 'Registration failed. Please check your verification code.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpCountdown > 0) return;
    setError(null);
    setLoading(true);
    try {
      await sendOtp(email.trim().toLowerCase(), 'registration');
      setOtpCountdown(60);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : (err?.message || 'Failed to resend code.'));
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

        <div className="flex-1 flex flex-col px-6 pt-4 pb-6 relative z-10 w-full max-w-sm mx-auto">
          <BrandLogo />

          <div className="text-center mb-6">
            <h1 className="text-[26px] font-bold text-white mb-1.5">
              {step === 'FORM' ? 'Create Account' : 'Verify Email'}
            </h1>
            <p className="text-[13px] text-white/60 mx-auto max-w-[280px]">
              {step === 'FORM'
                ? 'Join VUZKI and start meeting real people today'
                : `We sent a 6-digit verification code to ${email}`}
            </p>
          </div>

          {step === 'FORM' ? (
            <form onSubmit={handleSendOtp} className="space-y-3">
              {/* 1. Full Name */}
              <Input
                prefix={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                }
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded-xl border-white/10 focus:ring-[#FF2D8F]/50 focus:border-[#FF2D8F]"
              />

              {/* 2. Email Address */}
              <Input
                prefix={<MailIcon />}
                type="email"
                placeholder="Gmail Address (@gmail.com)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-xl border-white/10 focus:ring-[#FF2D8F]/50 focus:border-[#FF2D8F]"
              />

              {/* 3. Mobile Number with Country Code (Default India +91) */}
              <div className="flex gap-2">
                <div className="w-[84px] shrink-0">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full h-[52px] bg-white/5 border border-white/10 rounded-xl px-2.5 text-sm text-white font-medium focus:outline-none focus:border-[#FF2D8F] focus:ring-1 focus:ring-[#FF2D8F]"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="+91" className="bg-[#121216] text-white">🇮🇳 +91</option>
                    <option value="+1" className="bg-[#121216] text-white">🇺🇸 +1</option>
                    <option value="+44" className="bg-[#121216] text-white">🇬🇧 +44</option>
                    <option value="+971" className="bg-[#121216] text-white">🇦🇪 +971</option>
                    <option value="+65" className="bg-[#121216] text-white">🇸🇬 +65</option>
                  </select>
                </div>
                <div className="flex-1">
                  <Input
                    prefix={
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
                        <path d="M12 18h.01"/>
                      </svg>
                    }
                    type="tel"
                    placeholder="Mobile Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="rounded-xl border-white/10 focus:ring-[#FF2D8F]/50 focus:border-[#FF2D8F]"
                  />
                </div>
              </div>

              {/* 4. Password */}
              <PasswordInput
                prefix={<LockIcon />}
                placeholder="Password (min. 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rounded-xl border-white/10 focus:ring-[#FF2D8F]/50 focus:border-[#FF2D8F]"
              />

              {/* 5. Date of Birth */}
              <Input
                prefix={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                }
                type="date"
                placeholder="Date of Birth"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
                className="rounded-xl border-white/10 focus:ring-[#FF2D8F]/50 focus:border-[#FF2D8F] text-white/80"
                style={{ colorScheme: 'dark' }}
              />

              {/* 6. Gender with ONLY TWO options: Male and Female */}
              <div>
                <label className="block text-[11px] font-semibold text-white/60 uppercase tracking-wider mb-1.5 pl-1">
                  Gender
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { value: 'MALE', label: 'Male' },
                    { value: 'FEMALE', label: 'Female' },
                  ].map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGender(g.value as GenderType)}
                      className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all text-center ${
                        gender === g.value
                          ? 'border-[#FF2D8F] bg-[#FF2D8F]/20 text-white shadow-[0_0_12px_rgba(255,45,143,0.3)]'
                          : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={terms}
                      onChange={(e) => setTerms(e.target.checked)}
                      className="peer appearance-none h-5 w-5 rounded-md border-2 border-[#FF2D8F] bg-white/5 checked:bg-[#FF2D8F] transition-all cursor-pointer"
                    />
                    <svg className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-[12px] text-white/70 font-medium group-hover:text-white transition-colors">
                    I confirm I am 18+ and agree to the{' '}
                    <Link href="/terms" className="text-[#FF2D8F] hover:text-[#FF006E] font-semibold">
                      Terms of Service
                    </Link>
                  </span>
                </label>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium px-4 py-3 rounded-2xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="relative flex items-center justify-center w-full h-[52px] rounded-full bg-gradient-to-r from-[#FF2D8F] to-[#855CF6] text-white text-[16px] font-bold shadow-[0_0_24px_rgba(255,45,143,0.35)] hover:shadow-[0_0_32px_rgba(255,45,143,0.45)] active:scale-95 transition-all mt-4 disabled:opacity-70 disabled:active:scale-100"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Continue to Verification
                    <svg className="absolute right-6 w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCompleteRegistration} className="space-y-4">
              <Input
                prefix={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                  </svg>
                }
                type="text"
                inputMode="numeric"
                placeholder="6-digit verification code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="rounded-xl border-white/10 focus:ring-[#FF2D8F]/50 focus:border-[#FF2D8F] tracking-widest text-center text-lg font-bold"
              />

              <div className="flex items-center justify-between px-1 text-xs">
                <button
                  type="button"
                  onClick={() => setStep('FORM')}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  ← Edit details
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpCountdown > 0 || loading}
                  className="font-semibold text-[#FF2D8F] hover:text-[#FF006E] transition-colors disabled:opacity-50"
                >
                  {otpCountdown > 0 ? `Resend code in ${otpCountdown}s` : 'Resend Code'}
                </button>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium px-4 py-3 rounded-2xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="relative flex items-center justify-center w-full h-[52px] rounded-full bg-gradient-to-r from-[#FF2D8F] to-[#855CF6] text-white text-[16px] font-bold shadow-[0_0_24px_rgba(255,45,143,0.35)] hover:shadow-[0_0_32px_rgba(255,45,143,0.45)] active:scale-95 transition-all mt-4 disabled:opacity-70 disabled:active:scale-100"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Verify & Create Account
                    <svg className="absolute right-6 w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'FORM' && (
            <>
              <div className="mt-5 flex items-center gap-4">
                <div className="flex-1 h-[1px] bg-white/10" />
                <span className="text-[12px] text-white/50 font-medium">Or continue with</span>
                <div className="flex-1 h-[1px] bg-white/10" />
              </div>

              <div className="mt-4 mb-4">
                <button
                  type="button"
                  onClick={() => handleSocialAuth(loginWithGoogle, 'Google')}
                  className="w-full flex items-center justify-center gap-3 h-12 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white font-sans font-medium text-sm"
                  title="Sign up with Google"
                >
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </button>
              </div>
            </>
          )}

          <div className="mt-auto pt-4 text-center">
            <span className="text-[13px] text-white/70">Already have an account? </span>
            <Link href="/auth/login" className="text-[13px] font-bold text-[#FF2D8F] hover:text-[#FF006E]">
              Login
            </Link>
          </div>
        </div>
      </div>
    </RedirectIfAuthed>
  );
}
