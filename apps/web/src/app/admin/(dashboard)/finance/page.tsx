'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/admin/api';
import { Card, PageHeader, StatCard, Badge, Th, Td, Loading } from '@/components/admin/ui';
import { Dollar, TrendingUp, Wallet, CreditCard } from '@/components/admin/icons';

const money = (n: number) => `₹${Number(n || 0).toLocaleString()}`;

interface FinanceOverview {
  coinRevenue: number;
  subscriptionRevenue: number;
  completedWithdrawals: number;
  pendingWithdrawals: number;
  creatorEarnings: number;
  giftsSent: number;
}

interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  bonusCoins: number;
  price: number;
  currency: string;
  isPopular: boolean;
  status: string;
}

interface SubscriptionPlan {
  id: string;
  tier: string;
  cycle: string;
  name: string;
  price: number;
  isActive: boolean;
  features: Record<string, unknown>;
}

export default function FinancePage() {
  const [finance, setFinance] = useState<FinanceOverview | null>(null);
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<FinanceOverview>('/admin/finance'),
      api<{ items: CoinPackage[] }>('/admin/coin-packages'),
      api<{ items: SubscriptionPlan[] }>('/admin/subscription-plans'),
    ])
      .then(([f, p, s]) => {
        if (cancelled) return;
        setFinance(f);
        setPackages(p.items);
        setPlans(s.items);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || 'Failed to load finance data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Loading label="Loading finance…" />;

  if (error || !finance) {
    return (
      <div>
        <PageHeader title="Finance" subtitle="Revenue, payouts and catalog" />
        <Card className="p-10">
          <p className="text-center text-sm text-rose-400">{error || 'Failed to load finance data'}</p>
        </Card>
      </div>
    );
  }

  const packagePrice = (p: CoinPackage) => (p.currency === 'USD' ? '$' : '₹') + Number(p.price).toLocaleString();

  return (
    <div>
      <PageHeader title="Finance" subtitle="Revenue, payouts and catalog" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Coin revenue" value={money(finance.coinRevenue)} color="brand" icon={<Dollar className="h-5 w-5" />} />
        <StatCard label="Subscription revenue" value={money(finance.subscriptionRevenue)} color="green" icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Creator earnings" value={money(finance.creatorEarnings)} color="blue" icon={<Wallet className="h-5 w-5" />} />
        <StatCard label="Payouts completed" value={money(finance.completedWithdrawals)} color="amber" icon={<CreditCard className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2a2a37] px-5 py-4">
            <div>
              <h3 className="font-semibold">Coin packages</h3>
              <p className="text-xs text-white/40">Purchasable coin bundles</p>
            </div>
            <Badge color="green">Live</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Coins</Th>
                  <Th>Bonus</Th>
                  <Th>Price</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {packages.length === 0 ? (
                  <tr>
                    <Td colSpan={5} className="py-8 text-center text-white/40">
                      No coin packages.
                    </Td>
                  </tr>
                ) : (
                  packages.map((p) => (
                    <tr key={p.id} className="hover:bg-[#1d1d27]">
                      <Td className="font-medium">
                        {p.name} {p.isPopular && <Badge color="amber">Popular</Badge>}
                      </Td>
                      <Td>{p.coins.toLocaleString()}</Td>
                      <Td className="text-white/60">{p.bonusCoins > 0 ? `+${p.bonusCoins.toLocaleString()}` : '—'}</Td>
                      <Td className="font-medium">{packagePrice(p)}</Td>
                      <Td><Badge color={p.status === 'ACTIVE' ? 'green' : 'gray'}>{p.status}</Badge></Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2a2a37] px-5 py-4">
            <div>
              <h3 className="font-semibold">Subscription plans</h3>
              <p className="text-xs text-white/40">Recurring membership tiers</p>
            </div>
            <Badge color="green">Live</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>Plan</Th>
                  <Th>Tier</Th>
                  <Th>Cycle</Th>
                  <Th>Price</Th>
                  <Th>Active</Th>
                </tr>
              </thead>
              <tbody>
                {plans.length === 0 ? (
                  <tr>
                    <Td colSpan={5} className="py-8 text-center text-white/40">
                      No subscription plans.
                    </Td>
                  </tr>
                ) : (
                  plans.map((p) => (
                    <tr key={p.id} className="hover:bg-[#1d1d27]">
                      <Td className="font-medium">{p.name}</Td>
                      <Td>{p.tier}</Td>
                      <Td className="text-white/60">{p.cycle}</Td>
                      <Td className="font-medium">₹{Number(p.price).toLocaleString()}</Td>
                      <Td>
                        {p.isActive ? (
                          <Badge color="green">Active</Badge>
                        ) : (
                          <Badge color="gray">Inactive</Badge>
                        )}
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-white/50">Pending withdrawals</p>
          <p className="mt-1 text-xl font-bold">{money(finance.pendingWithdrawals)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-white/50">Gifts sent</p>
          <p className="mt-1 text-xl font-bold">{finance.giftsSent.toLocaleString()}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-white/50">Completed withdrawals</p>
          <p className="mt-1 text-xl font-bold">{money(finance.completedWithdrawals)}</p>
        </Card>
      </div>
    </div>
  );
}