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
    setList((l) => l.filter((u) => u.id !== id));
    try {
      await del(`/users/${id}/block`);
    } catch {
      /* keep optimistic removal */
    }
  };

  return (
    <div className="px-4 pt-4 pb-4">
      <header className="flex items-center justify-between mb-4">
        <Link href="/app/settings" className="p-2 -ml-2 rounded-full hover:bg-surface-overlay text-white/80"><ArrowLeftIcon /></Link>
        <h1 className="font-bold text-lg">Blocked users</h1>
        <div className="w-10" />
      </header>

      <p className="text-sm text-white/50 mb-4">Blocked users can&apos;t message you, call you, or see your profile.</p>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
      {loading && (
        <div className="py-16 flex justify-center">
          <Spinner className="h-6 w-6 text-white/50" />
        </div>
      )}

      {!loading && list.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="h-12 w-12 rounded-full bg-surface-overlay mx-auto mb-3 flex items-center justify-center text-white/40">✓</div>
          <p className="font-semibold">No blocked users</p>
          <p className="text-sm text-white/50 mt-1">You haven&apos;t blocked anyone yet.</p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {list.map((u) => (
            <Card key={u.id} className="p-3 flex items-center gap-3">
              <Avatar src={u.avatarUrl} name={u.displayName} size="md" online={u.onlineStatus} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{u.displayName}</p>
                <p className="text-xs text-white/50 truncate">@{u.username}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => unblock(u.id)}>
                Unblock
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
