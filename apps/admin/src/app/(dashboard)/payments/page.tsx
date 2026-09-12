'use client';

import { useEffect, useState } from 'react';
import { api, patch } from '@/lib/api';
import { Card, PageHeader, Badge, Button, Th, Td, Toast, EmptyState, Loading, SearchInput } from '@/components/ui';
import { Wallet, Dollar, TrendingUp, Refresh } from '@/components/icons';

const money = (n: number, currency: string) => {
  const sym = currency === 'USD' ? '$' : '₹';
  return `${sym}${Number(n || 0).toLocaleString()}`;
};

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

interface FinanceOverview {
  coinRevenue: number;
  subscriptionRevenue: number;
  completedWithdrawals: number;
  pendingWithdrawals: number;
  creatorEarnings: number;
  giftsSent: number;
}

interface PaymentProvider {
  id: string;
  name: string;
  enabled: boolean;
  configured: boolean;
  productionReady: boolean;
}

export default function PaymentsPage() {
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [finance, setFinance] = useState<FinanceOverview | null>(null);
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<{ items: CoinPackage[] }>('/admin/coin-packages'),
      api<FinanceOverview>('/admin/finance'),
      api<{ providers: PaymentProvider[] }>('/payment-providers'),
    ])
      .then(([p, f, prov]) => {
        if (cancelled) return;
        setPackages(p.items);
        setFinance(f);
        setProviders(prov.providers);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || 'Failed to load packages');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadPackages = async () => {
    try {
      const data = await api<{ items: CoinPackage[] }>('/admin/coin-packages');
      setPackages(data.items);
    } catch (e: any) {
      setToast(e?.message || 'Failed to reload packages');
      setToastType('error');
    }
  };

  const toggleProvider = async (id: string, currentEnabled: boolean) => {
    try {
      await patch(`/payment-providers/${id}`, { enabled: !currentEnabled });
      const { providers } = await api<{ providers: PaymentProvider[] }>('/payment-providers');
      setProviders(providers);
      setToast(`${currentEnabled ? 'Disabling' : 'Enabling'} provider...`);
    } catch (e: any) {
      setToast(e?.message || 'Failed to toggle provider');
      setToastType('error');
    }
  };

  const toggleStatus = async (p: CoinPackage) => {
    const next = p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await patch(`/admin/coin-packages/${p.id}`, { status: next });
      setToast(`${p.name} ${next === 'ACTIVE' ? 'enabled' : 'disabled'}`);
      setToastType('success');
      loadPackages();
    } catch (e: any) {
      setToast(e?.message || 'Update failed');
      setToastType('error');
    }
  };

  const togglePopular = async (p: CoinPackage) => {
    try {
      await patch(`/admin/coin-packages/${p.id}`, { isPopular: !p.isPopular });
      setToast(`${p.name} ${p.isPopular ? 'unmarked' : 'marked'} as popular`);
      setToastType('success');
      loadPackages();
    } catch (e: any) {
      setToast(e?.message || 'Update failed');
      setToastType('error');
    }
  };

  const filtered = packages.filter((p) =>
    !search || `${p.name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Payment Providers" subtitle="Manage payment providers for the platform" />

      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Payment Providers</h3>
        {providers.length === 0 && loading ? (
          <Loading />
        ) : error ? (
          <div className="p-10 text-center text-sm text-rose-400">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>Provider</Th>
                  <Th>Enabled</Th>
                  <Th>Configured</Th>
                  <Th>Production Ready</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.id} className="hover:bg-[#1d1d27]">
                    <Td>{p.name}</Td>
                    <Td>
                      <Badge color={p.enabled ? 'green' : 'gray'}>
                        {p.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </Td>
                    <Td>{p.configured ? 'Configured' : 'Configuration Required'}</Td>
                    <Td>{p.productionReady ? 'Production Ready' : 'Not Ready'}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant={p.enabled ? 'outline' : 'primary'}
                          size="sm"
                          onClick={() => toggleProvider(p.id, p.enabled)}
                        >
                          {p.enabled ? 'Disable' : 'Enable'}
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mb-4 mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-white/50">
          Gifts sent: {Number(finance?.giftsSent || 0).toLocaleString()} · Pending withdrawals:{' '}
          {money(finance?.pendingWithdrawals || 0, 'INR')}
        </p>
        <div className="w-full sm:w-72">
          <SearchInput value={search} onChange={setSearch} placeholder="Search packages…" />
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <Loading />
        ) : error ? (
          <div className="p-10 text-center text-sm text-rose-400">{error}</div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No packages" message="No coin packages match the current search." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Coins</Th>
                  <Th>Bonus Coins</Th>
                  <Th>Price</Th>
                  <Th>Popular</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-[#1d1d27]">
                    <Td className="font-medium">{p.name}</Td>
                    <Td>{p.coins.toLocaleString()}</Td>
                    <Td className="text-white/60">{p.bonusCoins > 0 ? `+${p.bonusCoins.toLocaleString()}` : '—'}</Td>
                    <Td className="font-medium">{money(p.price, p.currency)}</Td>
                    <Td>
                      {p.isPopular ? <Badge color="amber">Popular</Badge> : <span className="text-white/30">—</span>}
                    </Td>
                    <Td>
                      <Badge color={p.status === 'ACTIVE' ? 'green' : 'gray'}>{p.status}</Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => togglePopular(p)}>
                          {p.isPopular ? 'Unmark popular' : 'Mark popular'}
                        </Button>
                        <Button
                          variant={p.status === 'ACTIVE' ? 'outline' : 'primary'}
                          size="sm"
                          onClick={() => toggleStatus(p)}
                        >
                          <Refresh className="h-4 w-4" />{" "}
                          {p.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {toast && <Toast message={toast} type={toastType} />}
    </div>
  );
}