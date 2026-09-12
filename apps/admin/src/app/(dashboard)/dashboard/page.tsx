'use client';

import { useEffect, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { api } from '@/lib/api';
import { Card, StatCard, PageHeader, Badge, Toggle, Button, Loading } from '@/components/ui';
import { Users, Star, TrendingUp, Dollar, Bell, Shield, Ban, Send } from '@/components/icons';

const money = (n: number) => `₹${Number(n || 0).toLocaleString()}`;

interface DashboardStats {
  totalUsers: number;
  newUsersToday: number;
  premiumUsers: number;
  onlineUsers: number;
  callsToday: number;
  messagesToday: number;
  pendingWithdrawals: number;
  openReports: number;
  bannedUsers: number;
  revenue: number;
  activeUsers: number;
}

const recentActivity = (s: DashboardStats) => [
  { action: 'New signups', target: `${s.newUsersToday.toLocaleString()} today`, time: 'Today', cat: 'growth', color: 'green' },
  { action: 'Online right now', target: s.onlineUsers.toLocaleString(), time: 'Live', cat: 'presence', color: 'brand' },
  { action: 'Calls today', target: s.callsToday.toLocaleString(), time: 'Today', cat: 'calls', color: 'blue' },
  { action: 'Messages today', target: s.messagesToday.toLocaleString(), time: 'Today', cat: 'chat', color: 'blue' },
  { action: 'Pending withdrawals', target: s.pendingWithdrawals.toLocaleString(), time: 'Now', cat: 'finance', color: 'amber' },
  { action: 'Open reports', target: s.openReports.toLocaleString(), time: 'Now', cat: 'moderation', color: 'red' },
];

export default function DashboardPage() {
  const [autoModeration, setAutoModeration] = useState(true);
  const [liveMonitoring, setLiveMonitoring] = useState(true);
  const [notifyBans, setNotifyBans] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<{ d: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<DashboardStats>('/admin/dashboard'),
      api<{ revenue: { date: string; value: number }[] }>('/admin/analytics?range=7d'),
    ])
      .then(([d, a]) => {
        if (cancelled) return;
        setStats(d);
        setChartData(
          a.revenue.map((p) => ({
            d: new Date(`${p.date}T00:00:00`).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
            revenue: p.value,
          }))
        );
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || 'Failed to load dashboard');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Loading label="Loading dashboard…" />;

  if (error || !stats) {
    return (
      <div>
        <PageHeader title="Overview" subtitle="Live platform metrics" />
        <Card className="p-10">
          <p className="text-center text-sm text-rose-400">{error || 'Failed to load dashboard'}</p>
        </Card>
      </div>
    );
  }

  const activity = recentActivity(stats);

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Live platform metrics"
        actions={
          <Button variant="outline" size="sm">
            <TrendingUp className="h-4 w-4" /> Export report
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Users" value={stats.totalUsers.toLocaleString()} color="brand" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Online Now" value={stats.onlineUsers.toLocaleString()} color="green" icon={<Bell className="h-5 w-5" />} />
        <StatCard label="Premium Users" value={stats.premiumUsers.toLocaleString()} color="blue" icon={<Star className="h-5 w-5" />} />
        <StatCard label="Total Revenue" value={money(stats.revenue)} color="amber" icon={<Dollar className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Revenue (7 days)</h3>
              <p className="text-xs text-white/40">Gross revenue per day</p>
            </div>
            <Badge color="green">Live</Badge>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a37" vertical={false} />
                <XAxis dataKey="d" tick={{ fill: '#8b8b99', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8b8b99', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ background: '#1d1d27', border: '1px solid #2a2a37', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Recent Activity</h3>
          <div className="space-y-4">
            {activity.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-${a.color === 'green' ? 'emerald' : a.color}-400`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="text-white">{a.action}</span>{' '}
                    <span className="text-white/40">· {a.target}</span>
                  </p>
                  <p className="text-[11px] text-white/30">
                    {a.time} · {a.cat}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="p-5">
          <h3 className="mb-1 font-semibold">Quick Toggles</h3>
          <p className="mb-4 text-xs text-white/40">System-wide moderation controls</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Auto-moderation</p>
                <p className="text-xs text-white/40">AI flagging on incoming content</p>
              </div>
              <Toggle checked={autoModeration} onChange={setAutoModeration} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Live monitoring</p>
                <p className="text-xs text-white/40">Real-time room moderation</p>
              </div>
              <Toggle checked={liveMonitoring} onChange={setLiveMonitoring} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Ban notifications</p>
                <p className="text-xs text-white/40">Email admins on bans</p>
              </div>
              <Toggle checked={notifyBans} onChange={setNotifyBans} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Moderation Queue</h3>
          <div className="space-y-3">
            {[
              { label: 'Pending reports', value: stats.openReports, icon: <Shield className="h-4 w-4 text-amber-400" /> },
              { label: 'Withdrawals pending', value: stats.pendingWithdrawals, icon: <Dollar className="h-4 w-4 text-brand-300" /> },
              { label: 'Calls today', value: stats.callsToday, icon: <Send className="h-4 w-4 text-blue-400" /> },
              { label: 'Banned users', value: stats.bannedUsers, icon: <Ban className="h-4 w-4 text-rose-400" /> },
            ].map((q) => (
              <div key={q.label} className="flex items-center justify-between rounded-lg bg-[#111118] px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm text-white/60">
                  {q.icon} {q.label}
                </span>
                <Badge color="amber">{q.value.toLocaleString()}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 font-semibold">System Health</h3>
          <div className="space-y-3">
            {[
              { label: 'API latency', value: '—', ok: true },
              { label: 'Payout service', value: 'Operational', ok: true },
              { label: 'Socket connections', value: stats.onlineUsers.toLocaleString(), ok: true },
              { label: 'Payment gateway', value: 'Degraded', ok: false },
            ].map((h) => (
              <div key={h.label} className="flex items-center justify-between rounded-lg bg-[#111118] px-3 py-2.5">
                <span className="text-sm text-white/60">{h.label}</span>
                <span className={`flex items-center gap-1.5 text-sm font-medium ${h.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                  <span className={`h-2 w-2 rounded-full ${h.ok ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  {h.value}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            <Shield className="h-4 w-4 flex-shrink-0" />
            Payment gateway degraded — check provider dashboard.
          </div>
        </Card>
      </div>
    </div>
  );
}