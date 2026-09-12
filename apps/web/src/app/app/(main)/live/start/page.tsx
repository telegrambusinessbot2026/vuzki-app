'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Card';
import { ArrowLeftIcon } from '@/components/ui/Icons';

const categories = ['Music', 'Chat', 'Sports', 'Travel'];
const talkOptions = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'followers', label: 'Followers only' },
  { value: 'host', label: 'Host only' },
];
const tags = ['chill', 'party', 'talking', 'friendly', 'desi', 'vibes', 'stories'];

export default function LiveStartPage() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Chat');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [talk, setTalk] = useState('everyone');
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (t: string) =>
    setSelectedTags((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  const goLive = () => {
    setError(null);
    if (!title.trim()) {
      setError('Give your room a title.');
      return;
    }
    // Live broadcasting is not yet available on the backend. Do not fabricate a
    // room; inform the user honestly instead of navigating to a fake one.
    setError('Live rooms are not available yet. This feature is coming soon.');
  };

  return (
    <div className="px-4 pt-4 pb-4">
      <header className="flex items-center justify-between mb-4">
        <Link href="/app/live" className="p-2 -ml-2 rounded-full hover:bg-surface-overlay text-white/80"><ArrowLeftIcon /></Link>
        <h1 className="font-bold text-lg">Start a room</h1>
        <div className="w-10" />
      </header>

      <div className="space-y-5">
        <Input
          label="Room title"
          placeholder="e.g. Late Night Vibes 🌙"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={60}
        />

        <div>
          <span className="block text-sm font-medium text-white/80 mb-1.5">Category</span>
          <div className="flex gap-2 flex-wrap">
            {categories.map((c) => (
              <Chip key={c} selected={category === c} onClick={() => setCategory(c)}>{c}</Chip>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-white/80 mb-1.5">Tags</span>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <Chip key={t} selected={selectedTags.includes(t)} onClick={() => toggleTag(t)}>#{t}</Chip>
            ))}
          </div>
        </div>

        <Select label="Who can talk" options={talkOptions} value={talk} onChange={(e) => setTalk(e.target.value)} />

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      <div className="mt-8">
        <Button variant="gradient" size="lg" full onClick={goLive}>Go Live</Button>
      </div>
    </div>
  );
}
