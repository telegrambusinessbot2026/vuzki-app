'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { Input, TextArea } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Card';

const interestsPool = ['Music', 'Travel', 'Fitness', 'Coffee', 'Movies', 'Gaming', 'Art', 'Food', 'Dancing', 'Books', 'Photography', 'Yoga', 'Coding', 'Nature', 'Pets'];
const languagesPool = ['English', 'Hindi', 'Spanish', 'French', 'Arabic', 'Portuguese', 'German', 'Japanese'];
const steps = ['Interests', 'About you', 'Languages', 'Preferences'];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();

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

  const finish = () => {
    setError(null);
    setLoading(true);
    if (user) {
      updateUser({ ...user, interests, bio, displayName, languages, onboardingStep: 'complete', needsOnboarding: false });
    }
    setTimeout(() => router.push('/app/home'), 400);
  };

  return (
    <div className="min-h-screen bg-surface px-6 py-8 flex flex-col">
      <div className="mb-8">
        <div className="flex items-center gap-1.5 mb-4">
          {steps.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-brand-500' : 'bg-surface-border'}`} />
          ))}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {step === 0 && 'What excites you?'}
          {step === 1 && 'Tell people about you'}
          {step === 2 && 'Languages you speak'}
          {step === 3 && 'Your match preferences'}
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Step {step + 1} of {steps.length} — {steps[step]}
        </p>
      </div>

      {step === 0 && (
        <div className="flex flex-wrap gap-2.5">
          {interestsPool.map((it) => (
            <Chip key={it} selected={interests.includes(it)} onClick={() => toggle(interests, setInterests, it)}>{it}</Chip>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <Input label="Display name" placeholder="How others see you" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <TextArea label="Bio" placeholder="A short intro about yourself… (optional)" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} />
          <p className="text-xs text-white/40">{bio.length}/200</p>
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
            className={`w-full rounded-2xl border p-4 text-left flex items-center justify-between ${dailyMatches ? 'border-brand-500 bg-brand-600/10' : 'border-surface-border bg-surface-raised'}`}
          >
            <div>
              <p className="font-semibold">Daily matches</p>
              <p className="text-xs text-white/50">Get a fresh curated list every day</p>
            </div>
            <div className={`h-6 w-11 rounded-full p-0.5 transition-colors ${dailyMatches ? 'bg-brand-500' : 'bg-surface-border'}`}>
              <div className={`h-5 w-5 rounded-full bg-white transition-transform ${dailyMatches ? 'translate-x-5' : ''}`} />
            </div>
          </button>
          <p className="text-xs text-white/40">You can change these anytime in Settings.</p>
        </div>
      )}

      {error && <p className="text-sm text-red-400 mt-4">{error}</p>}

      <div className="mt-auto pt-8">
        {step < 3 ? (
          <Button variant="gradient" size="lg" full onClick={next}>Continue</Button>
        ) : (
          <Button variant="gradient" size="lg" full loading={loading} onClick={finish}>Finish</Button>
        )}
      </div>
    </div>
  );
}
