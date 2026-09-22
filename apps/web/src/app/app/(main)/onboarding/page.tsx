'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input, TextArea } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Card';

const interestsPool = ['Music', 'Travel', 'Fitness', 'Coffee', 'Movies', 'Gaming', 'Art', 'Food', 'Dancing', 'Books', 'Photography', 'Yoga', 'Coding', 'Nature', 'Pets'];
const languagesPool = ['English', 'Hindi', 'Spanish', 'French', 'Arabic', 'Portuguese', 'German', 'Japanese'];
const steps = ['Interests', 'About you', 'Languages', 'Preferences'];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refresh } = useAuth();

  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<string[]>(user?.interests ?? []);
  const [bio, setBio] = useState(user?.bio ?? '');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [languages, setLanguages] = useState<string[]>(user?.languages ?? []);
  const [dailyMatches, setDailyMatches] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = (list: string[], set: (v: string[]) => void, val: string) =>
    set(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);

  const next = () => {
    setError(null);
    if (step === 0 && interests.length === 0) {
      setError('Pick at least one interest.');
      return;
    }
    if (step === 1 && !displayName.trim()) {
      setError('Enter a display name.');
      return;
    }
    if (step === 2 && languages.length === 0) {
      setError('Select at least one language.');
      return;
    }
    setStep((s) => s + 1);
  };

  const finish = async () => {
    setError(null);
    setLoading(true);
    try {
      // Persist the collected onboarding data through the existing profile API.
      // Onboarding is only marked complete AFTER the server save succeeds so a
      // failed save never leaves the user half-onboarded or stuck in a loop.
      await api('/users/me/profile', {
        method: 'PUT',
        auth: true,
        body: {
          displayName,
          bio,
          interests,
          languages,
          onboardingStep: 'COMPLETE',
        },
      });
      // Sync local auth/user state with the server (bio, interests, languages,
      // onboardingStep) so the completed state survives logout/login.
      await refresh();
      router.push('/app/home');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#0a0a0c] px-6 flex flex-col pt-safe relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[50%] bg-brand-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[40%] bg-pink-600/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="mt-8 mb-8 relative z-10">
        <div className="flex items-center gap-1.5 mb-6">
          {steps.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-brand-500 shadow-glow' : 'bg-white/10'}`} />
          ))}
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1 drop-shadow-md">
          {step === 0 && 'What excites you?'}
          {step === 1 && 'Tell people about you'}
          {step === 2 && 'Languages you speak'}
          {step === 3 && 'Your match preferences'}
        </h1>
        <p className="text-white/60 font-medium text-sm">
          Step {step + 1} of {steps.length} — {steps[step]}
        </p>
      </div>

      <div className="flex-1 relative z-10 pb-24">
        {step === 0 && (
          <div className="flex flex-wrap gap-2.5">
            {interestsPool.map((it) => (
              <Chip key={it} selected={interests.includes(it)} onClick={() => toggle(interests, setInterests, it)}>{it}</Chip>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 glass-panel rounded-3xl p-6 border border-white/10 shadow-float">
            <Input label="Display name" placeholder="How others see you" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <div className="relative">
               <TextArea label="Bio" placeholder="A short intro about yourself… (optional)" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} />
               <p className="absolute bottom-3 right-3 text-xs font-bold text-white/30">{bio.length}/200</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-wrap gap-2.5">
            {languagesPool.map((l) => (
              <Chip key={l} selected={languages.includes(l)} onClick={() => toggle(languages, setLanguages, l)}>{l}</Chip>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setDailyMatches((v) => !v)}
              className={`w-full rounded-3xl border p-5 text-left flex items-center justify-between shadow-sm transition-all active:scale-[0.98] ${dailyMatches ? 'border-brand-500 bg-brand-600/10 shadow-glow' : 'border-white/10 glass-panel hover:bg-white/5'}`}
            >
              <div>
                <p className="font-bold text-white text-base">Daily matches</p>
                <p className="text-xs text-white/50 font-medium mt-0.5">Get a fresh curated list every day</p>
              </div>
              <div className={`h-7 w-12 rounded-full p-1 transition-colors relative shadow-inner ${dailyMatches ? 'bg-brand-500 shadow-glow' : 'bg-white/10'}`}>
                <div className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white transition-transform ${dailyMatches ? 'translate-x-5' : ''}`} />
              </div>
            </button>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 mt-4 px-2">You can change these anytime in Settings.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium px-4 py-3 rounded-2xl animate-shake mt-4">
            {error}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 pb-safe px-6 pt-10 pb-6 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c] to-transparent z-20">
        <div className="max-w-md mx-auto">
          {step < 3 ? (
            <Button variant="gradient" size="lg" full onClick={next} className="shadow-glow">Continue</Button>
          ) : (
            <Button variant="gradient" size="lg" full loading={loading} onClick={finish} className="shadow-glow">Finish</Button>
          )}
        </div>
      </div>
    </div>
  );
}
