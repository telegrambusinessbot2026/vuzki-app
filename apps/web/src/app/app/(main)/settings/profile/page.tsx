'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input, TextArea, Select } from '@/components/ui/Input';
import { ArrowLeftIcon, UserIcon } from '@/components/ui/Icons';
import { Card } from '@/components/ui/Card';

export default function EditProfilePage() {
  const router = useRouter();
  const { user, refresh } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('PREFER_NOT_TO_SAY');
  const [region, setRegion] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [interests, setInterests] = useState('');
  const [languages, setLanguages] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName ?? '');
    setUsername(user.username ?? '');
    setBio(user.bio ?? '');
    setGender(user.gender || 'PREFER_NOT_TO_SAY');
    setRegion(user.region ?? '');
    setCountryCode(user.countryCode ?? '');
    setInterests((user.interests ?? []).join(', '));
    setLanguages((user.languages ?? []).join(', '));
    setAvatarUrl(user.avatarUrl ?? '');
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api('/users/me/profile', {
        method: 'PUT',
        auth: true,
        body: {
          displayName,
          username,
          bio,
          gender,
          region,
          countryCode: countryCode || null,
          avatarUrl: avatarUrl || null,
          interests: interests.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20),
          languages: languages.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).slice(0, 10),
        },
      });
      await refresh();
      router.push('/app/settings');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pt-4 pb-8">
      <header className="flex items-center justify-between mb-5">
        <Link href="/app/settings" className="p-2 -ml-2 rounded-full hover:bg-surface-overlay text-white/80"><ArrowLeftIcon /></Link>
        <h1 className="font-bold text-lg">Edit Profile</h1>
        <div className="w-10" />
      </header>

      <Card className="p-4 mb-5 flex items-center gap-3">
        <div className="h-14 w-14 rounded-2xl bg-brand-500/15 text-brand-300 flex items-center justify-center">
          <UserIcon size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{displayName || 'Your name'}</p>
          <p className="text-xs text-white/50 truncate">@{username || 'username'}</p>
        </div>
      </Card>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How others see you" required />
        <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="yourname" required />
        <TextArea label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Say something about yourself" rows={3} maxLength={300} />
        <Select
          label="Gender"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          options={[
            { value: 'FEMALE', label: 'Female' },
            { value: 'MALE', label: 'Male' },
            { value: 'OTHER', label: 'Other' },
            { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
          ]}
        />
        <Input label="Region" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="City, state, etc." />
        <Input label="Country code" value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase())} placeholder="IN" maxLength={3} />
        <Input label="Interests (comma separated)" value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="Music, Travel, Food" />
        <Input label="Languages (comma separated, ISO codes)" value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="en, hi" />
        <Input label="Profile photo URL" type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />

        <div className="pt-2">
          <Button type="submit" variant="gradient" size="lg" full loading={loading}>
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}