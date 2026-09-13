'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Avatar, PremiumBadge, CreatorBadge, VerifiedIcon } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SettingsIcon, WalletIcon, CoinIcon, ChevronRightIcon, PhoneIcon, VideoIcon } from '@/components/ui/Icons';
import { Spinner } from '@/components/ui/Button';

interface CallHistoryItem {
  id: string;
  other: { id: string; displayName: string; username: string; avatarUrl: string | null; isVerified: boolean };
  type: 'AUDIO' | 'VIDEO';
  status: string;
  role: 'CALLER' | 'RECEIVER';
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  costCoins: number;
}

function callTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-6 w-6 text-white/50" />
      </div>
    );
  }

  const [history, setHistory] = useState<CallHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [stats, setStats] = useState<{ followers: number; following: number; profileViews: number } | null>(null);

  useEffect(() => {
    api<{ items: CallHistoryItem[] }>('/calls/history', { auth: true })
      .then((d) => setHistory(d.items ?? []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    api<{ user: { followers: number; following: number; profileViews: number } }>('/users/me/profile', { auth: true })
      .then((d) => setStats({ followers: d.user.followers, following: d.user.following, profileViews: d.user.profileViews }))
      .catch(() => setStats({ followers: 0, following: 0, profileViews: 0 }));
  }, []);

  const statRows = [
    { label: 'Followers', value: stats ? stats.followers.toLocaleString() : '…' },
    { label: 'Following', value: stats ? stats.following.toLocaleString() : '…' },
    { label: 'Views', value: stats ? stats.profileViews.toLocaleString() : '…' },
  ];

  return (
    <div className="px-4 pt-4 pb-4">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">My Profile</h1>
        </div>
        <Link href="/app/settings" className="p-2 rounded-full bg-surface-overlay border border-surface-border text-white/70 hover:text-white">
          <SettingsIcon />
        </Link>
      </header>

      <div className="relative rounded-3xl overflow-hidden bg-brand-gradient-soft border border-surface-border mb-5">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700/40 via-transparent to-pink-600/40" />
        <div className="relative p-5 flex flex-col items-center pt-10">
          <Avatar src={user.avatarUrl} name={user.displayName} size="2xl" online verified={user.isVerified} className="mb-3 ring-4 ring-surface" />
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{user.displayName}</h2>
            {user.isVerified && <VerifiedIcon size={16} />}
            {user.isPremium && <PremiumBadge tier={user.premiumTier || 'PREMIUM'} />}
          </div>
          <p className="text-white/60 text-sm mt-0.5">@{user.username}</p>
          {user.isCreator && <div className="mt-2"><CreatorBadge /></div>}

          <div className="grid grid-cols-3 gap-6 mt-5 w-full max-w-xs">
            {statRows.map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-bold text-lg">{s.value}</p>
                <p className="text-[11px] text-white/50">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2.5 mt-5 w-full">
            <Link href="/app/settings/profile" className="flex-1">
              <Button variant="gradient" size="md" full>Edit Profile</Button>
            </Link>
          </div>
        </div>
      </div>

      <Card className="p-4 mb-4">
        <h3 className="font-semibold mb-1.5">Bio</h3>
        <p className="text-sm text-white/60 leading-relaxed">{user.bio || 'No bio yet — say something about yourself!'}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {user.interests?.length ? (
            user.interests.map((it) => (
              <span key={it} className="text-[11px] px-3 py-1 rounded-full bg-surface-overlay border border-surface-border text-white/70">{it}</span>
            ))
          ) : (
            <span className="text-[11px] text-white/40">Add interests to get better matches</span>
          )}
        </div>
      </Card>

      <Link href="/app/wallet">
        <Card interactive className="p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <WalletIcon size={20} />
            </div>
            <div>
              <p className="text-sm text-white/60">Balance</p>
              <p className="flex items-center gap-1 font-bold text-amber-400">
                <CoinIcon size={16} /> {user.wallet?.balance?.toLocaleString() ?? '0'} coins
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-right">
            <span className="text-xs text-brand-400 font-semibold">Top Up</span>
            <ChevronRightIcon size={16} className="text-white/40" />
          </div>
        </Card>
      </Link>

      {/* Recent calls */}
      <Card className="p-4 mb-4">
        <h3 className="font-semibold mb-3">Recent Calls</h3>
        {historyLoading && <div className="py-4 flex justify-center"><Spinner className="h-5 w-5 text-white/40" /></div>}
        {!historyLoading && history.length === 0 && (
          <p className="text-sm text-white/40 py-2">No calls yet — start one to see it here.</p>
        )}
        <div className="space-y-2.5">
          {history.slice(0, 6).map((c) => {
            const missed = c.status === 'MISSED' || c.status === 'REJECTED' || c.status === 'CANCELLED';
            const duration = c.durationSeconds ? `${Math.floor(c.durationSeconds / 60)}m` : '—';
            return (
              <Link key={c.id} href={`/app/call/${c.other.id}?type=${c.type.toLowerCase()}`} className="flex items-center gap-3">
                <Avatar src={c.other.avatarUrl} name={c.other.displayName} size="md" verified={c.other.isVerified} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{c.other.displayName}</p>
                  <p className="text-[11px] text-white/50 flex items-center gap-1">
                    {c.type === 'VIDEO' ? <VideoIcon size={11} /> : <PhoneIcon size={11} />}
                    {c.type === 'VIDEO' ? 'Video' : 'Audio'} · {duration} · {callTime(c.startedAt)}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${missed ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'}`}>
                  {missed ? 'Missed' : 'Completed'}
                </span>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
