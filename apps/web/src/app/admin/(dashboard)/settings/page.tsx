'use client';

import { useEffect, useState } from 'react';
import { api, patch, post } from '@/lib/admin/api';
import { useAdmin } from '@/lib/admin/store';
import { Card, PageHeader, Badge, Button, Toggle, Toast, Loading } from '@/components/admin/ui';
import { Shield, Wallet, Globe, Refresh, Bell } from '@/components/admin/icons';

const roleData = [
  {
    role: 'SUPER_ADMIN',
    color: 'brand',
    perms: ['Full access', 'Manage admins', 'Payment & finance', 'All moderation', 'System settings', 'Audit export'],
  },
  {
    role: 'ADMIN',
    color: 'blue',
    perms: ['User management', 'Creator review', 'Payment review', 'Report moderation', 'Withdrawals'],
  },
  {
    role: 'MODERATOR',
    color: 'green',
    perms: ['Report moderation', 'User status changes', 'Creator applications'],
  },
];

const FLAG_ROWS = [
  { key: 'talkNow', label: 'Talk Now', desc: 'Instant random talk pairing' },
  { key: 'videoCalls', label: 'Video calls', desc: 'Enable one-on-one video calls' },
  { key: 'newMatching', label: 'New matching', desc: 'Use the latest matching algorithm' },
  { key: 'promotions', label: 'Promotions', desc: 'Run promotional campaigns' },
  { key: 'gifts', label: 'Gifts', desc: 'Allow sending gifts between users' },
  { key: 'creatorFeatures', label: 'Creator features', desc: 'Creator tools & monetization' },
  { key: 'subscriptions', label: 'Subscriptions', desc: 'Recurring membership subscriptions' },
];

type Flags = Record<string, boolean>;

export default function SettingsPage() {
  const { session } = useAdmin();
  const [paymentProvider, setPaymentProvider] = useState('razorpay');
  const [rtcProvider, setRtcProvider] = useState('agora');
  const [flags, setFlags] = useState<Flags | null>(null);
  const [loadingFlags, setLoadingFlags] = useState(true);
  const [flagsError, setFlagsError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    let cancelled = false;
    api<Flags>('/admin/flags')
      .then((f) => {
        if (!cancelled) setFlags(f);
      })
      .catch((e: any) => {
        if (!cancelled) setFlagsError(e?.message || 'Failed to load feature flags');
      })
      .finally(() => {
        if (!cancelled) setLoadingFlags(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const flipFlag = async (key: string, value: boolean) => {
    if (!flags) return;
    setFlags({ ...flags, [key]: value });
    try {
      await patch(`/admin/flags/${key}`, { value });
      setToast(`Flag "${key}" updated`);
      setToastType('success');
    } catch (e: any) {
      setFlags((f) => (f ? { ...f, [key]: !value } : f));
      setToast(e?.message || 'Flag update failed');
      setToastType('error');
    }
  };

  const resetFlags = async () => {
    try {
      const f = await post<Flags>('/admin/flags/reset');
      setFlags(f);
      setToast('Flags reset to baseline');
      setToastType('success');
    } catch (e: any) {
      setToast(e?.message || 'Flag reset failed');
      setToastType('error');
    }
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Roles, providers and platform configuration" />

      <div className="grid grid-cols-1 gap-6">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-xl bg-brand-500/15 p-2.5 text-brand-300"><Shield className="h-5 w-5" /></div>
            <div>
              <h3 className="font-semibold">Roles & permissions</h3>
              <p className="text-xs text-white/40">Access levels assigned to admin accounts</p>
            </div>
            {session && (
              <div className="ml-auto">
                <Badge color="brand">{session.name} · {session.role}</Badge>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {roleData.map((r) => (
              <div key={r.role} className="rounded-xl border border-[#2a2a37] bg-[#111118] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-semibold">{r.role}</span>
                  <Badge color={r.color}>{r.perms.length} perms</Badge>
                </div>
                <ul className="space-y-2">
                  {r.perms.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm text-white/60">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-xl bg-emerald-500/15 p-2.5 text-emerald-400"><Wallet className="h-5 w-5" /></div>
              <div>
                <h3 className="font-semibold">Payment provider</h3>
                <p className="text-xs text-white/40">Stored in deployment config — UI selection only</p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { id: 'demo', label: 'Demo', desc: 'Sandbox / development mode' },
                { id: 'razorpay', label: 'Razorpay', desc: 'Primary — India & APAC' },
                { id: 'stripe', label: 'Stripe', desc: 'Global cards & subscriptions' },
                { id: 'cashfree', label: 'Cashfree', desc: 'Alternative gateway' },
              ].map((p) => (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                    paymentProvider === p.id
                      ? 'border-brand-500/50 bg-brand-600/10'
                      : 'border-[#2a2a37] hover:bg-white/5'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">{p.label}</p>
                    <p className="text-xs text-white/40">{p.desc}</p>
                  </div>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentProvider === p.id}
                    onChange={() => setPaymentProvider(p.id)}
                    className="h-4 w-4 accent-brand-600"
                  />
                </label>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-xl bg-blue-500/15 p-2.5 text-blue-400"><Globe className="h-5 w-5" /></div>
              <div>
                <h3 className="font-semibold">RTC provider</h3>
                <p className="text-xs text-white/40">Stored in deployment config — UI selection only</p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { id: 'agora', label: 'Agora', desc: 'Low-latency audio/video' },
                { id: 'livekit', label: 'LiveKit', desc: 'Open-source WebRTC' },
                { id: 'twilio', label: 'Twilio', desc: 'Programmable video' },
              ].map((p) => (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                    rtcProvider === p.id
                      ? 'border-brand-500/50 bg-brand-600/10'
                      : 'border-[#2a2a37] hover:bg-white/5'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">{p.label}</p>
                    <p className="text-xs text-white/40">{p.desc}</p>
                  </div>
                  <input
                    type="radio"
                    name="rtc"
                    checked={rtcProvider === p.id}
                    onChange={() => setRtcProvider(p.id)}
                    className="h-4 w-4 accent-brand-600"
                  />
                </label>
              ))}
            </div>
          </Card>
        </div>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-xl bg-amber-500/15 p-2.5 text-amber-400"><Bell className="h-5 w-5" /></div>
            <div>
              <h3 className="font-semibold">Feature flags</h3>
              <p className="text-xs text-white/40">Runtime-controlled platform features</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={resetFlags}>
                <Refresh className="h-4 w-4" /> Reset to baseline
              </Button>
            </div>
          </div>
          {loadingFlags ? (
            <Loading label="Loading flags…" />
          ) : flagsError ? (
            <p className="py-6 text-center text-sm text-rose-400">{flagsError}</p>
          ) : (
            <div className="divide-y divide-[#2a2a37]/60">
              {FLAG_ROWS.map((s) => (
                <div key={s.key} className="flex items-center justify-between py-3.5">
                  <div>
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-white/40">{s.desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color={flags?.[s.key] ? 'green' : 'gray'}>{flags?.[s.key] ? 'On' : 'Off'}</Badge>
                    <Toggle checked={!!flags?.[s.key]} onChange={(v) => flipFlag(s.key, v)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {toast && <Toast message={toast} type={toastType} />}
    </div>
  );
}