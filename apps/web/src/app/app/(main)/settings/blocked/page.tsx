'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, del } from '@/lib/api';
import { mapUser } from '@/lib/api-users';
import type { FeedUser, PublicUser } from '@/lib/api-users';
import { Avatar } from '@/components/ui/Avatar';
import { Button, Spinner } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeftIcon } from '@/components/ui/Icons';

export default function BlockedPage() {
  const [list, setList] = useState<FeedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api<{ blocked: PublicUser[] }>('/users/me/blocked', { auth: true })
      .then((data) => {
        if (!cancelled) setList((data.blocked ?? []).map((u) => mapUser(u)));
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Could not load blocked users');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const unblock = async (id: string) => {
    try {
      setError('');
      await del(`/users/${id}/block`);
      setList((l) => l.filter((u) => u.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to unblock user');
    }
  };

  return (
    <div className="px-4 pt-safe pt-4 pb-8 min-h-dvh bg-[#0a0a0c]">
      <header className="flex items-center justify-between mb-8 mt-2">
        <Link href="/app/settings" className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 active:scale-95 transition-all"><ArrowLeftIcon size={18} /></Link>
        <h1 className="text-3xl font-extrabold tracking-tight">Blocked</h1>
        <div className="w-10" />
      </header>

      <p className="text-sm font-medium text-white/50 mb-6 bg-white/5 border border-white/5 p-4 rounded-2xl">Blocked users can&apos;t message you, call you, or see your profile.</p>

      {error && <p className="text-xs text-red-400 mb-4 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-2xl animate-shake font-medium">{error}</p>}
      
      {loading && (
        <div className="py-16 flex justify-center">
          <Spinner className="h-6 w-6 text-white/50" />
        </div>
      )}

      {!loading && list.length === 0 ? (
        <Card className="p-10 text-center glass-panel border border-white/5 shadow-float mt-10">
          <div className="h-14 w-14 rounded-full bg-white/5 text-white/30 flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
          <p className="font-bold text-lg text-white/90">No blocked users</p>
          <p className="text-sm font-medium text-white/50 mt-1">You haven&apos;t blocked anyone yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((u) => (
            <Card key={u.id} className="p-4 flex items-center gap-4 glass-panel border border-white/5 hover:bg-white/5 transition-colors">
              <Avatar src={u.avatarUrl} name={u.displayName} size="md" online={u.onlineStatus} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white/90 truncate text-sm">{u.displayName}</p>
                <p className="text-[11px] font-medium text-white/50 truncate uppercase tracking-wider">@{u.username}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => unblock(u.id)} className="border-white/10 bg-white/5 text-white/70 hover:text-white">
                Unblock
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
