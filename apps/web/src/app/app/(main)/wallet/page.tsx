'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, Badge, Divider } from '@/components/ui/Card';
import { ArrowLeftIcon, CoinIcon, GiftIcon, SparkleIcon, WalletIcon, ZapIcon } from '@/components/ui/Icons';
import { api } from '@/lib/api';

interface CoinPack {
  id: string;
  name: string;
  coins: number;
  bonusCoins: number;
  price: number;
  currency: string;
  isPopular: boolean;
}

interface Txn {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  metadata?: any;
  createdAt: string;
}

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [packs, setPacks] = useState<CoinPack[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [purchased, setPurchased] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWallet = useCallback(async () => {
    try {
      const [w, p, h] = await Promise.all([
        api<{ balance: number; currency: string }>('/wallet', { auth: true }),
        api<{ items: CoinPack[] }>('/wallet/packages', { auth: true }),
        api<{ items: Txn[] }>('/wallet/history?limit=20', { auth: true }),
      ]);
      setBalance(w.balance ?? 0);
      setPacks(p.items ?? []);
      setTxns(h.items ?? []);
      try {
        const r = await api<{ claimedToday: boolean }>('/rewards/daily', { auth: true });
        setRewardClaimed(r.claimedToday);
      } catch {
        /* reward endpoint optional */
      }
    } catch {
      setError('Could not load wallet. Please try again.');
    }
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const buyPack = async (p: CoinPack) => {
    setPurchased(p.id);
    setError(null);
    try {
      const order = await api<{ orderId: string; provider: string }>('/wallet/purchase', {
        method: 'POST',
        body: { packageId: p.id },
        auth: true,
      });
      // Fulfill the order (demo mode server-side). In production a real
      // redirect/checkout occurs and the webhook fulfills; this verify call is
      // only honored when the server is genuinely in demo mode.
      await api('/wallet/verify', {
        method: 'POST',
        body: { orderId: order.orderId, provider: order.provider, demo: true },
        auth: true,
      }).catch(() => {
        /* in production the webhook handles fulfillment */
      });
      await loadWallet();
    } catch {
      setError('Purchase could not be completed.');
    } finally {
      setPurchased(null);
    }
  };

  const claimDaily = async () => {
    setClaiming(true);
    try {
      await api('/rewards/daily/claim', { method: 'POST', body: {}, auth: true });
      setRewardClaimed(true);
      await loadWallet();
    } catch {
      setError('Reward already claimed today or could not be claimed.');
    } finally {
      setClaiming(false);
    }
  };

  const txnMeta = (t: Txn) => {
    const type = t.type;
    if (type === 'PURCHASE') return { icon: <CoinIcon size={18} />, cls: 'bg-surface-overlay text-white/60', title: 'Coin purchase', isEarn: false };
    if (type === 'REWARD') return { icon: <ZapIcon size={18} />, cls: 'bg-amber-500/15 text-amber-400', title: 'Daily reward', isEarn: true };
    if (type === 'REFERRAL') return { icon: <SparkleIcon size={18} />, cls: 'bg-green-500/15 text-green-400', title: 'Referral bonus', isEarn: true };
    if (type.includes('CALL')) return { icon: <WalletIcon size={18} />, cls: 'bg-surface-overlay text-white/60', title: 'Call', isEarn: false };
    if (type === 'GIFT_SENT') return { icon: <GiftIcon size={18} />, cls: 'bg-surface-overlay text-white/60', title: 'Gift sent', isEarn: false };
    if (type === 'SUPER_LIKE' || type === 'SUPER_LIKE_PURCHASE') return { icon: <WalletIcon size={18} />, cls: 'bg-surface-overlay text-white/60', title: type === 'SUPER_LIKE' ? 'Super like' : 'Super like pack', isEarn: false };
    if (type === 'BOOST') return { icon: <ZapIcon size={18} />, cls: 'bg-surface-overlay text-white/60', title: 'Boost', isEarn: false };
    if (type === 'REFUND') return { icon: <WalletIcon size={18} />, cls: 'bg-green-500/15 text-green-400', title: 'Refund', isEarn: true };
    return { icon: <WalletIcon size={18} />, cls: 'bg-surface-overlay text-white/60', title: type.toLowerCase(), isEarn: t.amount > 0 };
  };

  return (
    <div className="px-4 pt-4 pb-4">
      <header className="flex items-center justify-between mb-4">
        <Link href="/app/home" className="p-2 -ml-2 rounded-full hover:bg-surface-overlay text-white/80"><ArrowLeftIcon /></Link>
        <h1 className="font-bold text-lg">Wallet</h1>
        <div className="w-10" />
      </header>

      <div className="relative rounded-2xl overflow-hidden bg-brand-gradient-soft border border-surface-border mb-4">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700/50 via-transparent to-pink-600/40" />
        <div className="relative p-5">
          <p className="text-xs text-white/70 mb-2">Available balance</p>
          <div className="flex items-center gap-2 mb-4">
            <CoinIcon size={28} className="text-amber-400" />
            <span className="text-4xl font-bold">{balance.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-white/60">
              <WalletIcon size={14} /> = <span className="text-white/80 font-semibold">{(balance * 0.02).toFixed(2)} INR</span>
            </div>
            <Link href="/app/gifts" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-brand-500 to-pink-500 text-white text-xs font-semibold">
              <GiftIcon size={14} /> Send gift
            </Link>
          </div>
        </div>
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-amber-400 to-yellow-300 mb-5">
        <div className="p-4 flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900/70 mb-1"><SparkleIcon size={10} /> DAILY REWARD</span>
            <p className="font-bold text-black">Claim your free daily coins!</p>
            <p className="text-[11px] text-amber-900/70">Come back daily to keep your streak</p>
          </div>
          <Button size="sm" variant="primary" className="bg-black text-amber-300 hover:bg-black/90" loading={claiming} disabled={rewardClaimed} onClick={claimDaily}>
            <ZapIcon size={14} /> {rewardClaimed ? 'Claimed' : 'Claim'}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      <h2 className="font-bold mb-3">Buy coins</h2>
      <div className="space-y-2.5 mb-5">
        {packs.length === 0 && <p className="text-sm text-white/40 py-4 text-center">No coin packages available</p>}
        {packs.map((pack) => (
          <Card key={pack.id} className="p-4 flex items-center justify-between relative overflow-hidden">
            {pack.isPopular && (
              <span className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-xl bg-amber-500 text-[10px] font-bold text-black">POPULAR</span>
            )}
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <CoinIcon size={22} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">{pack.coins.toLocaleString()} coins</span>
                  {pack.bonusCoins > 0 && <Badge color="green">+{pack.bonusCoins}</Badge>}
                </div>
                <p className="text-xs text-white/50">{pack.price.toFixed(2)} {pack.currency}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant={pack.isPopular ? 'gradient' : 'secondary'}
              loading={purchased === pack.id}
              onClick={() => buyPack(pack)}
            >
              {pack.price.toFixed(2)}
            </Button>
          </Card>
        ))}
      </div>

      <h2 className="font-bold mb-3">Transaction history</h2>
      <Card className="divide-y divide-surface-border">
        {txns.length === 0 && <p className="text-sm text-white/40 py-6 text-center">No transactions yet</p>}
        {txns.map((tx, i) => {
          const m = txnMeta(tx);
          return (
            <div key={tx.id} className={`p-3.5 flex items-center gap-3 ${i === 0 ? '' : ''}`}>
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${m.cls}`}>
                {m.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.title}</p>
                <p className="text-xs text-white/50">{new Date(tx.createdAt).toLocaleString()}</p>
              </div>
              <div className={`text-sm font-semibold ${m.isEarn ? 'text-green-400' : 'text-white/80'}`}>
                {tx.amount > 0 ? '+' : ''}{Math.abs(tx.amount ?? 0).toLocaleString()}
              </div>
            </div>
          );
        })}
      </Card>
      <Divider className="my-4" />
    </div>
  );
}
