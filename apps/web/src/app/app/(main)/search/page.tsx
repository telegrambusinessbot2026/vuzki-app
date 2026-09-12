'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { mapUser } from '@/lib/api-users';
import type { FeedUser, PublicUser } from '@/lib/api-users';
import { Chip } from '@/components/ui/Card';
import { SearchIcon } from '@/components/ui/Icons';

const filters = ['All', 'Online', 'Creators', 'New'];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [results, setResults] = useState<FeedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError('');
    const t = setTimeout(async () => {
      const q = query.trim();
      try {
        const data = await api<{ items: PublicUser[] }>(`/search?q=${encodeURIComponent(q)}&limit=50`, { auth: true });
        if (reqId.current === id) setResults((data.items ?? []).map((u) => mapUser(u)));
      } catch (e: any) {
        if (reqId.current === id) setError(e?.message || 'Search failed');
      } finally {
        if (reqId.current === id) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const visible = useMemo(() => {
    return results.filter((u) => {
      if (filter === 'Online' && !u.onlineStatus) return false;
      if (filter === 'Creators' && !u.isCreator) return false;
      if (filter === 'New' && !u.badges.includes('NEW')) return false;
      return true;
    });
  }, [results, filter]);

  return (
    <div className="px-4 pt-4 pb-4">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Search</h1>
        </div>
      </header>

      <div className="relative mb-3">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
          <SearchIcon />
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people or interests"
          className="w-full h-12 pl-10 pr-4 bg-surface-overlay border border-surface-border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {filters.map((f) => (
          <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>{f}</Chip>
        ))}
      </div>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
      {loading ? (
        <p className="text-xs text-white/40 mb-3">Searching…</p>
      ) : (
        <p className="text-xs text-white/40 mb-3">{visible.length} results</p>
      )}

      {!loading && visible.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-semibold">No results found</p>
          <p className="text-sm text-white/50 mt-1">Try a different name or interest.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          {visible.map((u) => (
            <Link key={u.id} href={`/app/profile/${u.id}`} className="rounded-2xl overflow-hidden border border-surface-border bg-surface-raised">
              <div className="relative aspect-square bg-surface-overlay">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u.avatarUrl!} alt={u.displayName} className="w-full h-full object-cover" />
                {u.onlineStatus && <span className="absolute top-2 left-2 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-surface" />}
              </div>
              <div className="p-2">
                <p className="text-xs font-semibold truncate">{u.displayName}{u.age ? `, ${u.age}` : ''}</p>
                <p className="text-[10px] text-white/50 truncate">{u.countryCode}{u.distance ? ` · ${u.distance}` : ''}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
