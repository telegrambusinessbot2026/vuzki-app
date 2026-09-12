'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, Divider } from '@/components/ui/Card';
import { ArrowLeftIcon, CoinIcon, GiftIcon, LinkIcon, ShareIcon, SparkleIcon, UserIcon } from '@/components/ui/Icons';
import { api } from '@/lib/api';

interface ReferralData {
  referralCode: string | null;
  referralLink: string;
  stats: { total: number; eligible: number; paid: number; pending: number; totalRewardCoins: number };
}

export default function ReferralPage() {
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<ReferralData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api<ReferralData>('/referrals', { auth: true })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error)?.message || 'Failed to load referral info');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const code = data?.referralCode || 'VUZKI';
  const link = data?.referralLink || '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="px-4 pt-4 pb-4">
      <header className="flex items-center justify-between mb-4">
        <Link href="/app/home" className="p-2 -ml-2 rounded-full hover:bg-surface-overlay text-white/80"><ArrowLeftIcon /></Link>
        <h1 className="font-bold text-lg">Referral</h1>
        <div className="w-10" />
      </header>

      <div className="rounded-2xl p-5 mb-5 relative overflow-hidden bg-gradient-to-br from-brand-600 to-pink-600 border border-surface-border">
        <div className="absolute -top-8 -right-6 opacity-20 text-[120px] leading-none select-none">🎁</div>
        <div className="relative">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold text-white mb-3"><SparkleIcon size={10} /> INVITE & EARN</span>
          <p className="font-bold text-lg leading-tight mb-1">Get 100 coins for every friend</p>
          <p className="text-white/80 text-xs mb-4">Your friend gets 50 coins too. No limit on invites!</p>
          <div className="flex items-center gap-2 bg-white/15 backdrop-blur rounded-xl p-1.5 border border-white/20">
            <span className="flex-1 text-center font-mono font-bold tracking-[0.2em] text-white py-1">{code}</span>
            <Button size="sm" variant="glass" onClick={copy}><LinkIcon size={14} /> {copied ? 'Copied!' : 'Copy'}</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-surface-overlay text-brand-400 flex items-center justify-center"><UserIcon size={16} /></div>
          </div>
          <p className="text-2xl font-bold">{data?.stats.total ?? 0}</p>
          <p className="text-xs text-white/50">Friends invited</p>
        </Card>
        <Card className="p-4">
          <div className="h-8 w-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center mb-1"><CoinIcon size={16} /></div>
          <p className="text-2xl font-bold">{data?.stats.totalRewardCoins ?? 0}</p>
          <p className="text-xs text-white/50">Coins earned</p>
        </Card>
      </div>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <div className="grid grid-cols-2 gap-3 mb-5">
        <Button variant="gradient" size="lg" icon={<ShareIcon size={18} />}>Share link</Button>
        <Button variant="outline" size="lg" icon={<LinkIcon size={18} />} onClick={copy}>Copy link</Button>
      </div>

      <Divider className="mb-4" />

      <h2 className="font-bold mb-3">How it works</h2>
      <div className="space-y-3 mb-4">
        <Step step={1} icon={<ShareIcon />} title="Share your invite code" desc="Send your link or code to friends via chat or social." />
        <Step step={2} icon={<UserIcon />} title="Friend joins VUZKI" desc="They sign up and claim their 50 free coins instantly." />
        <Step step={3} icon={<CoinIcon />} title="You both earn" desc="You get 100 coins added to your wallet right away." />
      </div>

      <Card className="p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center shrink-0"><GiftIcon size={18} /></div>
        <p className="text-sm text-white/60">Referred friends who go premium earn you a <span className="text-amber-400 font-semibold">10% bonus</span> on their subscription — invite creators and heavy users for the biggest rewards.</p>
      </Card>
    </div>
  );
}

function Step({ step, icon, title, desc }: { step: number; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="h-10 w-10 rounded-xl bg-surface-overlay text-brand-400 flex items-center justify-center shrink-0">{icon}</div>
        {step < 3 && <div className="w-px flex-1 bg-surface-border my-1" />}
      </div>
      <div className="pt-1.5">
        <p className="font-semibold flex items-center gap-2"><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-600/30 text-brand-300">STEP {step}</span>{title}</p>
        <p className="text-sm text-white/50 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
