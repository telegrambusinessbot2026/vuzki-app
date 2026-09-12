'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, Badge, Divider } from '@/components/ui/Card';
import { ArrowLeftIcon, DownloadIcon, WalletIcon } from '@/components/ui/Icons';
import { api, post } from '@/lib/api';

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function UpiIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <path d="M6 12h3M12 12h3" />
    </svg>
  );
}

function BankIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="22" x2="21" y2="22" />
      <line x1="6" y1="18" x2="6" y2="11" />
      <line x1="10" y1="18" x2="10" y2="11" />
      <line x1="14" y1="18" x2="14" y2="11" />
      <line x1="18" y1="18" x2="18" y2="11" />
      <polygon points="12 2 20 7 4 7 12 2" />
    </svg>
  );
}

function PaypalIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h9a4 4 0 014 4c0 .9-.3 1.7-.8 2.4" />
      <path d="M4 21l3-9h9a4 4 0 014 4c0 .9-.3 1.7-.8 2.4" />
      <path d="M4 12l1-3" />
    </svg>
  );
}

const methodOptions = [
  { id: 'upi', apiMethod: 'UPI', label: 'UPI', sub: 'Instant · Free', icon: <UpiIcon /> },
  { id: 'bank', apiMethod: 'BANK_TRANSFER', label: 'Bank transfer', sub: '1–2 days · Free', icon: <BankIcon /> },
  { id: 'paypal', apiMethod: 'PAYPAL', label: 'PayPal', sub: 'Instant · fees apply', icon: <PaypalIcon /> },
];

const statusColor: Record<string, 'default' | 'green' | 'amber' | 'blue' | 'red'> = {
  pending: 'amber',
  processing: 'blue',
  completed: 'green',
  failed: 'red',
  rejected: 'red',
};

const methodLabel: Record<string, string> = { upi: 'UPI', bank: 'Bank', paypal: 'PayPal' };

interface WithdrawalItem {
  id: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
}

interface WithdrawalMeta {
  availableBalance: number;
  pendingBalance: number;
  methods: string[];
  minimum: number;
  isCreator: boolean;
  kycRequired: boolean;
  kycStatus: string;
}

const methodFromApi = (m: string): string | undefined =>
  [methodOptions.find((o) => o.apiMethod === m)?.id, 'upi'].find((x) => x !== undefined);

export default function WithdrawalsPage() {
  const [method, setMethod] = useState<string>('upi');
  const [amount, setAmount] = useState('');
  const [detail, setDetail] = useState('');
  const [sent, setSent] = useState(false);
  const [available, setAvailable] = useState(0);
  const [minimum, setMinimum] = useState(10);
  const [methods, setMethods] = useState(methodOptions);
  const [history, setHistory] = useState<WithdrawalItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<WithdrawalMeta>('/withdrawals/meta', { auth: true }),
      api<{ items: WithdrawalItem[] }>('/withdrawals', { auth: true }),
    ])
      .then(([meta, data]) => {
        if (cancelled) return;
        setAvailable(meta.availableBalance);
        setMinimum(meta.minimum);
        if (meta.methods && meta.methods.length) {
          setMethods(methodOptions.filter((m) => meta.methods.includes(m.apiMethod)));
        }
        setHistory(data.items);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error)?.message || 'Failed to load withdrawals');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    if (!amount) return;
    const m = methodOptions.find((o) => o.id === method);
    if (!m) return;
    setSent(true);
    setError('');
    try {
      const details: Record<string, string> =
        m.apiMethod === 'UPI' ? { upiId: detail } : { accountName: detail, accountNumber: detail };
      await post('/withdrawals', { amount: Number(amount), method: m.apiMethod, details });
      setAmount('');
      setDetail('');
      const meta = await api<WithdrawalMeta>('/withdrawals/meta', { auth: true });
      setAvailable(meta.availableBalance);
      const data = await api<{ items: WithdrawalItem[] }>('/withdrawals', { auth: true });
      setHistory(data.items);
    } catch (e) {
      setError((e as Error)?.message || 'Withdrawal failed');
    } finally {
      setSent(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="px-4 pt-4 pb-4">
      <header className="flex items-center justify-between mb-4">
        <Link href="/app/creator" className="p-2 -ml-2 rounded-full hover:bg-surface-overlay text-white/80"><ArrowLeftIcon /></Link>
        <h1 className="font-bold text-lg">Withdrawals</h1>
        <div className="w-10" />
      </header>

      <div className="rounded-2xl p-4 mb-5 bg-brand-gradient-soft border border-surface-border relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700/40 via-transparent to-pink-600/40" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-xs text-white/70 mb-1 flex items-center gap-1"><WalletIcon size={13} /> Available balance</p>
            <p className="text-3xl font-bold">${available.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p className="text-[11px] text-white/50 mt-1">Minimum withdrawal ${minimum} · No fees on UPI & Bank</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center"><DownloadIcon size={22} /></div>
        </div>
      </div>

      <h2 className="font-bold mb-3">Withdrawal method</h2>
      <div className="space-y-2.5 mb-4">
        {methods.map((m) => (
          <Card
            key={m.id}
            interactive
            onClick={() => setMethod(m.id)}
            className={`p-4 flex items-center gap-3 ${method === m.id ? 'border-brand-500 bg-brand-600/10' : ''}`}
          >
            <div className="h-11 w-11 rounded-xl bg-surface-overlay text-brand-400 flex items-center justify-center">{m.icon}</div>
            <div className="flex-1">
              <p className="font-semibold">{m.label}</p>
              <p className="text-xs text-white/50">{m.sub}</p>
            </div>
            {method === m.id && <div className="h-5 w-5 rounded-full bg-brand-600 flex items-center justify-center text-white"><CheckIcon size={12} /></div>}
          </Card>
        ))}
      </div>

      <h2 className="font-bold mb-3">Request amount</h2>
      <Card className="p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl text-white/50">$</span>
          <input
            type="number"
          min={minimum}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="flex-1 bg-transparent text-2xl font-bold outline-none placeholder:text-white/25"
        />
        <Button size="sm" variant="ghost" onClick={() => setAmount(String(available))}>Max</Button>
        </div>
        <Divider className="mb-3" />
        <label className="text-xs text-white/50">Details ({methodLabel[method]})</label>
        <input
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder={method === 'paypal' ? 'Enter PayPal email' : method === 'upi' ? 'Enter UPI ID (e.g. name@upi)' : 'Enter bank account & IFSC'}
          className="mt-2 w-full bg-surface-overlay border border-surface-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500 placeholder:text-white/30"
        />
        <div className="flex items-center justify-between mt-3 text-xs text-white/50">
          <span>You&apos;ll receive</span>
          <span className="text-white/80 font-semibold">${amount ? (Number(amount) * 0.98).toFixed(2) : '0.00'}</span>
        </div>
        <Button
          full
          size="lg"
          variant="gradient"
          className="mt-4"
          disabled={!amount || Number(amount) < minimum || Number(amount) > available || !method}
          loading={sent}
          onClick={submit}
        >
          {sent ? 'Submitting...' : 'Withdraw funds'}
        </Button>
        {error && <p className="text-center text-xs text-red-400 mt-2">{error}</p>}
      </Card>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold">History</h2>
        <span className="text-xs text-white/50">{history.length} entries</span>
      </div>
      <Card className="divide-y divide-surface-border">
        {history.length === 0 && !error && <p className="p-4 text-sm text-white/50">No withdrawals yet.</p>}
        {history.map((w) => {
          const m = methodOptions.find((o) => o.apiMethod === w.method);
          const MethodIcon = m ? m.icon : <WalletIcon size={18} />;
          const label = m ? m.label : w.method;
          return (
            <div key={w.id} className="p-3.5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-surface-overlay text-brand-400 flex items-center justify-center">{MethodIcon}</div>
              <div className="flex-1">
                <p className="text-sm font-medium">${w.amount.toFixed(2)}</p>
                <p className="text-xs text-white/50">{label} · {formatDate(w.createdAt)}</p>
              </div>
              <Badge color={statusColor[w.status.toLowerCase()] || 'default'}>{w.status}</Badge>
            </div>
          );
        })}
      </Card>
      <Divider className="my-4" />
    </div>
  );
}
