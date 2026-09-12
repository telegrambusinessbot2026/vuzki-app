'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, Badge, Divider } from '@/components/ui/Card';
import { PremiumBadge } from '@/components/ui/Avatar';
import { ArrowLeftIcon, CrownIcon, ShieldIcon, StarIcon } from '@/components/ui/Icons';
import { api, post } from '@/lib/api';

interface Plan {
  id: string;
  tier: string;
  cycle: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
}

function CheckIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function PremiumPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tier, setTier] = useState('FREE');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<{ plans: Record<string, Plan[]> }>('/subscriptions/plans', { auth: true }),
      api<{ subscription: { tier: string } | null; effectiveTier: string }>('/subscriptions/me', { auth: true }),
    ])
      .then(([planData, meData]) => {
        if (cancelled) return;
        const order = ['PLUS', 'PREMIUM', 'VIP'];
        const all: Plan[] = [];
        order.forEach((t) => {
          (planData.plans[t] || []).forEach((p) => all.push(p));
        });
        setPlans(all);
        setTier(meData.effectiveTier || meData.subscription?.tier || 'FREE');
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error)?.message || 'Failed to load plans');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = async (plan: Plan) => {
    setWorking(true);
    setError('');
    try {
      const res = await post<{ orderId: string; requiresVerification: boolean }>('/subscriptions', { planId: plan.id });
      if (res.requiresVerification) {
        await post('/subscriptions/verify', { orderId: res.orderId });
        const meData = await api<{ effectiveTier: string }>('/subscriptions/me', { auth: true });
        setTier(meData.effectiveTier);
      }
    } catch (e) {
      setError((e as Error)?.message || 'Subscription failed');
    } finally {
      setWorking(false);
    }
  };

  const planGradient = (name: string) =>
    name === 'VIP' ? 'from-amber-400 to-yellow-300' : name === 'PLUS' ? 'from-blue-500 to-cyan-400' : 'from-purple-500 to-fuchsia-400';

  const cycleLabel = (c: string) => (c === 'YEARLY' ? 'yr' : 'mo');

  return (
    <div className="px-4 pt-4 pb-4">
      <header className="flex items-center justify-between mb-4">
        <Link href="/app/home" className="p-2 -ml-2 rounded-full hover:bg-surface-overlay text-white/80"><ArrowLeftIcon /></Link>
        <h1 className="font-bold text-lg">Premium</h1>
        <Link href="/app/wallet" className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-surface-overlay border border-surface-border text-amber-400 text-xs font-semibold">
          <CrownIcon size={14} /> Upgrade
        </Link>
      </header>

      <div className="rounded-2xl p-4 mb-5 bg-gradient-to-r from-purple-600/30 to-fuchsia-600/20 border border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-400 flex items-center justify-center text-white"><CrownIcon size={20} /></div>
          <div>
            <p className="font-bold">Current plan</p>
            <p className="text-xs text-white/50">Unlock limits & exclusive perks</p>
          </div>
        </div>
        <PremiumBadge tier={tier === 'FREE' ? 'FREE' : tier} />
      </div>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <div className="space-y-3 mb-5">
        {plans.map((plan) => {
          const active = tier === plan.tier;
          return (
            <Card
              key={plan.id}
              className={`p-4 relative overflow-hidden ${plan.tier === 'PLUS' || plan.tier === 'VIP' || active ? 'border-brand-500' : ''}`}
            >
              {plan.tier === 'PLUS' && (
                <span className="absolute top-0 right-0 px-2.5 py-0.5 rounded-bl-xl bg-brand-600 text-[10px] font-bold text-white">MOST POPULAR</span>
              )}
              {plan.tier === 'VIP' && (
                <span className="absolute top-0 right-0 px-2.5 py-0.5 rounded-bl-xl bg-amber-500 text-[10px] font-bold text-black">Save 20%</span>
              )}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${planGradient(plan.tier)} px-2.5 py-1 text-[11px] font-bold text-white`}>
                    {plan.tier === 'VIP' ? '👑' : <StarIcon size={11} />} {plan.name}
                  </span>
                  {active && tier !== 'FREE' && <Badge color="green">Active</Badge>}
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold">${plan.price}</span>
                  <span className="text-xs text-white/50">/{cycleLabel(plan.cycle)}</span>
                </div>
              </div>
              <ul className="space-y-1.5 mb-4">
                {plan.features.map((perk, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                    <span className="text-brand-400 mt-0.5"><CheckIcon size={15} /></span>
                    {perk}
                  </li>
                ))}
              </ul>
              <Button full variant={active && tier !== 'FREE' ? 'secondary' : 'gradient'} onClick={() => subscribe(plan)} loading={working}>
                {active && tier !== 'FREE' ? 'You are subscribed' : `Subscribe to ${plan.name}`}
              </Button>
            </Card>
          );
        })}
      </div>

      <Divider className="mb-4" />

      <h2 className="font-bold mb-3">Compare perks</h2>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-white/50 bg-surface-overlay">
              <th className="p-3 text-left font-medium">Benefit</th>
              <th className="p-3 font-medium">PLUS</th>
              <th className="p-3 font-medium">PREMIUM</th>
              <th className="p-3 font-medium">VIP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            <CompareRow label="Extra likes" plus="10" premium="50" vip="∞" />
            <CompareRow label="Verified badge" plus="—" premium="✓" vip="✓" />
            <CompareRow label="No ads" plus="✓" premium="✓" vip="✓" />
            <CompareRow label="Priority support" plus="—" premium="—" vip="✓" />
            <CompareRow label="Top placement" plus="—" premium="—" vip="✓" />
          </tbody>
        </table>
      </Card>

      <Divider className="my-4" />

      <Card className="p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-green-500/15 text-green-400 flex items-center justify-center shrink-0"><ShieldIcon size={18} /></div>
        <p className="text-sm text-white/60">Subscriptions auto-renew monthly. Cancel anytime in Settings. All payments are secure and encrypted.</p>
      </Card>
    </div>
  );
}

function CompareRow({ label, plus, premium, vip }: { label: string; plus: string; premium: string; vip: string }) {
  const Cell = ({ v }: { v: string }) => (
    <td className="p-3 text-center">{v === '—' ? <span className="text-white/30">—</span> : v === '✓' ? <span className="text-green-400">✓</span> : <span className="font-semibold text-white">{v}</span>}</td>
  );
  return (
    <tr>
      <td className="p-3 text-white/80">{label}</td>
      <Cell v={plus} />
      <Cell v={premium} />
      <Cell v={vip} />
    </tr>
  );
}
