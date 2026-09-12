'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Card';
import { ArrowLeftIcon } from '@/components/ui/Icons';

const genderOptions = ['Female', 'Male', 'Other', 'All'];
const interestsPool = ['Music', 'Travel', 'Fitness', 'Coffee', 'Movies', 'Gaming', 'Art', 'Food', 'Dancing', 'Books', 'Photography', 'Yoga', 'Coding', 'Nature', 'Pets'];
const distanceOptions = [
  { value: '10', label: 'Up to 10 km' },
  { value: '25', label: 'Up to 25 km' },
  { value: '50', label: 'Up to 50 km' },
  { value: '100', label: 'Up to 100 km' },
  { value: 'any', label: 'Anywhere' },
];

export default function FiltersPage() {
  const router = useRouter();
  const [minAge, setMinAge] = useState('18');
  const [maxAge, setMaxAge] = useState('35');
  const [distance, setDistance] = useState('50');
  const [gender, setGender] = useState('All');
  const [interests, setInterests] = useState<string[]>([]);

  const toggle = (val: string) =>
    setInterests((s) => (s.includes(val) ? s.filter((x) => x !== val) : [...s, val]));

  const apply = () => {
    router.push('/app/discover');
  };

  return (
    <div className="px-4 pt-4 pb-4">
      <header className="flex items-center justify-between mb-4">
        <Link href="/app/discover" className="p-2 -ml-2 rounded-full hover:bg-surface-overlay text-white/80"><ArrowLeftIcon /></Link>
        <h1 className="font-bold text-lg">Filters</h1>
        <div className="w-10" />
      </header>

      <div className="space-y-5">
        <div>
          <span className="block text-sm font-medium text-white/80 mb-1.5">Age range</span>
          <div className="flex items-center gap-3">
            <Input label="" type="number" min={18} max={99} value={minAge} onChange={(e) => setMinAge(e.target.value)} />
            <span className="text-white/40">to</span>
            <Input label="" type="number" min={18} max={99} value={maxAge} onChange={(e) => setMaxAge(e.target.value)} />
          </div>
        </div>

        <Select label="Distance" options={distanceOptions} value={distance} onChange={(e) => setDistance(e.target.value)} />

        <div>
          <span className="block text-sm font-medium text-white/80 mb-1.5">Gender</span>
          <div className="flex gap-2 flex-wrap">
            {genderOptions.map((g) => (
              <Chip key={g} selected={gender === g} onClick={() => setGender(g)}>{g}</Chip>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-white/80 mb-1.5">Interests</span>
          <div className="flex flex-wrap gap-2">
            {interestsPool.map((it) => (
              <Chip key={it} selected={interests.includes(it)} onClick={() => toggle(it)}>{it}</Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <Button variant="gradient" size="lg" full onClick={apply}>Apply Filters</Button>
      </div>
    </div>
  );
}
