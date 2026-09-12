'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, Badge, Divider } from '@/components/ui/Card';
import { CreatorBadge } from '@/components/ui/Avatar';
import { ArrowLeftIcon, CoinIcon, EyeIcon, GiftIcon, MicIcon, PhoneIcon, VideoIcon, WalletIcon, ZapIcon } from '@/components/ui/Icons';
import { api, post } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface DashboardData {
  profile: {
    rating: number | null;
    ratingCount: number;
    totalMinutes: number;
    callRateFrom: number | null;
    callRateTo: number | null;
    availability: string;
  };
  earnings: {
    today: number;
    total: number;
    availableBalance: number;
    totalMinutes: number;
    rating: number | null;
    numberOfRatings: number;
    giftsReceived: number;
  };
  gifts: number;
  recentCalls: { id: string; type: string; durationSeconds: number; costCoins: number; other: { id: string; displayName: string } | null; createdAt: string }[];
}

interface EarningTransaction {
  id: string;
  type: string;
  amount: number;
  coins: number;
  status: string;
  createdAt: string;
  callId: string | null;
}

export default function CreatorPage() {
  const { refresh } = useAuth();
  const [requested, setRequested] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [transactions, setTransactions] = useState<EarningTransaction[]>([]);
  const [error, setError] = useState('');

  const load = () => {
    Promise.all([
      api<DashboardData>('/creators/me/dashboard', { auth: true }),
      api<{ earnings: { availableBalance: number }; transactions: EarningTransaction[] }>('/creators/me/earnings', { auth: true }),
    ])
      .then(([dash, earn]) => {
        setDashboard(dash);
        setTransactions(earn.transactions);
      })
      .catch((e) => setError((e as Error)?.message || 'Failed to load creator dashboard'));
  };

  useEffect(() => {
    load();
  }, []);

  const available = dashboard?.earnings.availableBalance ?? 0;
  const today = dashboard?.earnings.today ?? 0;
  const rating = dashboard?.earnings.rating ?? dashboard?.profile.rating ?? 0;
  const callMinutes = dashboard?.earnings.totalMinutes ?? dashboard?.profile.totalMinutes ?? 0;
  const giftsReceived = dashboard?.earnings.giftsReceived ?? dashboard?.gifts ?? 0;

  const claim = async () => {
    setRequested(true);
    setError('');
    try {
      await post('/creators/me/earnings/claim');
      refresh();
      load();
    } catch (e) {
      setError((e as Error)?.message || 'Claim failed');
      setRequested(false);
    }
  };

  const sourceOf = (t: string) => (t === 'AUDIO_CALL' || t === 'VIDEO_CALL' ? 'call' : t === 'GIFT' ? 'gift' : 'tip');

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${h}:${m}`;
  };

  const rate = (min: number) => <span className="flex items-center gap-1"><CoinIcon size={14} className="text-amber-400" /> {min} / min</span>;

  return (
    <div className="px-4 pt-4 pb-4">
      <header className="flex items-center justify-between mb-4">
        <Link href="/app/home" className="p-2 -ml-2 rounded-full hover:bg-surface-overlay text-white/80"><ArrowLeftIcon /></Link>
        <h1 className="font-bold text-lg">Creator Studio</h1>
        <div className="w-10" />
      </header>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <div className="rounded-2xl p-4 mb-4 bg-brand-gradient-soft border border-surface-border relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700/40 via-transparent to-pink-600/40" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CreatorBadge />
              <Badge color="amber">⭐ {rating ? rating.toFixed(1) : '—'} rating</Badge>
            </div>
            <button className="text-xs text-white/50 flex items-center gap-1"><MicIcon size={12} /> Live now</button>
          </div>
          <p className="text-xs text-white/70 mb-1">Today&apos;s earnings</p>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-3xl font-bold">${(today || 0).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-white/80">
              <WalletIcon size={16} className="text-white/60" />
              <span>Available: <span className="font-bold text-amber-400">${(available || 0).toFixed(2)}</span></span>
            </div>
            <Button size="sm" variant="gradient" icon={<ZapIcon size={14} />} onClick={claim} className={requested ? 'bg-green-600' : ''}>
              {requested ? 'Request sent' : 'Get Paid'}
            </Button>
          </div>
          {requested && (
            <p className="text-xs text-green-400 mt-2">Earnings moved to available balance — withdraw within 2 business days.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <StatCard icon={<EyeIcon />} label="Call minutes" value={String(callMinutes || 0)} change="total" />
        <StatCard icon={<PhoneIcon />} label="Calls" value={String(dashboard?.recentCalls.length ?? 0)} change="recent" />
        <StatCard icon={<GiftIcon />} label="Gifts received" value={String(giftsReceived || 0)} change="total" />
      </div>

      <h2 className="font-bold mb-3">Your call rates</h2>
      <Card className="divide-y divide-surface-border mb-5">
        <RateRow icon={<VideoIcon />} label="Video call" sub="Per minute" right={rate(dashboard?.profile.callRateFrom ?? 0)} />
        <RateRow icon={<PhoneIcon />} label="Audio call" sub="Per minute" right={rate(dashboard?.profile.callRateTo ?? 0)} />
        <RateRow icon={<MicIcon />} label="Group voice chat" sub="Per minute" right={rate(dashboard?.profile.callRateFrom ?? 0)} />
      </Card>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold">Recent earnings</h2>
        <Link href="/app/withdrawals" className="text-xs text-brand-400">Withdrawals</Link>
      </div>
      <Card className="divide-y divide-surface-border mb-4">
        {transactions.length === 0 && !error && <p className="p-4 text-sm text-white/50">No earnings yet.</p>}
        {transactions.slice(0, 10).map((e) => {
          const source = sourceOf(e.type);
          const sourceColor =
            source === 'call' ? 'bg-blue-500/15 text-blue-400' : source === 'gift' ? 'bg-pink-500/15 text-pink-400' : 'bg-amber-500/15 text-amber-400';
          return (
            <div key={e.id} className="p-3.5 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${sourceColor}`}>
                {source === 'call' ? <PhoneIcon size={18} /> : source === 'gift' ? <GiftIcon size={18} /> : <ZapIcon size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{e.type.replace(/_/g, ' ')}</p>
                <p className="text-xs text-white/50">{formatDate(e.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-green-400">+${(e.amount || 0).toFixed(2)}</p>
                {e.coins > 0 && <p className="flex items-center justify-end gap-1 text-[11px] text-white/50"><CoinIcon size={11} className="text-amber-400" /> {e.coins}</p>}
              </div>
            </div>
          );
        })}
      </Card>

      <Divider className="mb-4" />

      <Card className="p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center shrink-0"><CoinIcon size={18} /></div>
        <p className="text-sm text-white/60">Coins you earn convert to cash automatically. Minimum withdrawal is $10. Earn more by keeping your rates competitive and staying online.</p>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, change, up }: { icon: React.ReactNode; label: string; value: string; change: string; up?: boolean }) {
  return (
    <Card className="p-3">
      <div className="h-8 w-8 rounded-lg bg-surface-overlay text-brand-400 flex items-center justify-center mb-2">{icon}</div>
      <p className="text-lg font-bold leading-tight">{value}</p>
      <p className="text-[11px] text-white/50">{label}</p>
      <p className={`text-[10px] mt-0.5 ${up ? 'text-green-400' : 'text-white/40'}`}>{change}</p>
    </Card>
  );
}

function RateRow({ icon, label, sub, right }: { icon: React.ReactNode; label: string; sub: string; right: React.ReactNode }) {
  return (
    <div className="p-3.5 flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-surface-overlay text-white/70 flex items-center justify-center">{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[11px] text-white/50">{sub}</p>
      </div>
      <div className="text-sm font-semibold text-amber-400">{right}</div>
    </div>
  );
}
