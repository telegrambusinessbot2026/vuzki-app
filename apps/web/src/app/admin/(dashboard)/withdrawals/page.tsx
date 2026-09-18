'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, patch } from '@/lib/admin/api';
import { Card, PageHeader, Badge, Button, Modal, Th, Td, Toast, EmptyState, Loading } from '@/components/admin/ui';
import { FileText, Wallet, Clock, Check, X } from '@/components/admin/icons';

interface Withdrawal {
  id: string;
  user: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const wdBadge = (s: string) => {
  const m: Record<string, string> = { PENDING: 'amber', PROCESSING: 'blue', COMPLETED: 'green', REJECTED: 'red', APPROVED: 'green', PAID: 'green' };
  return <Badge color={m[s] || 'gray'}>{s.charAt(0) + s.slice(1).toLowerCase()}</Badge>;
};

const methodBadge = (m: string) => {
  const name = (m || '').toUpperCase();
  if (name.includes('UPI')) return <Badge color="brand">UPI</Badge>;
  if (name.includes('BANK')) return <Badge color="blue">Bank</Badge>;
  return <Badge color="green">{name || '—'}</Badge>;
};

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Withdrawal | null>(null);
  const [confirm, setConfirm] = useState<{ wd: Withdrawal; action: 'approve' | 'reject' } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ items: Withdrawal[]; total: number }>('/admin/withdrawals?limit=50');
      setWithdrawals(data.items);
    } catch (e: any) {
      setError(e?.message || 'Failed to load withdrawals');
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    const pending = withdrawals.filter((w) => w.status === 'PENDING');
    const pendingAmount = pending.reduce((s, w) => s + w.amount, 0);
    const now = new Date();
    const paidThisMonth = withdrawals
      .filter((w) => w.status === 'COMPLETED' && new Date(w.updatedAt).getMonth() === now.getMonth())
      .reduce((s, w) => s + w.amount, 0);
    return { pendingCount: pending.length, pendingAmount, paidThisMonth };
  }, [withdrawals]);

  const pending = useMemo(() => withdrawals.filter((w) => w.status === 'PENDING'), [withdrawals]);
  const processed = useMemo(() => withdrawals.filter((w) => w.status !== 'PENDING'), [withdrawals]);

  const runConfirm = async () => {
    if (!confirm) return;
    try {
      await patch(`/admin/withdrawals/${confirm.wd.id}`, { decision: confirm.action });
      setToast(confirm.action === 'approve' ? 'Withdrawal approved' : 'Withdrawal rejected');
      setToastType('success');
      load();
    } catch (e: any) {
      setToast(e?.message || 'Action failed');
      setToastType('error');
    }
    setConfirm(null);
  };

  return (
    <div>
      <PageHeader title="Withdrawals" subtitle="Creator payout requests" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/15 p-3 text-amber-400"><Clock className="h-5 w-5" /></div>
            <div>
              <p className="text-sm text-white/50">Pending requests</p>
              <p className="text-xl font-bold">{summary.pendingCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand-500/15 p-3 text-brand-300"><Wallet className="h-5 w-5" /></div>
            <div>
              <p className="text-sm text-white/50">Pending amount</p>
              <p className="text-xl font-bold">${summary.pendingAmount.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/15 p-3 text-emerald-400"><FileText className="h-5 w-5" /></div>
            <div>
              <p className="text-sm text-white/50">Paid this month</p>
              <p className="text-xl font-bold">${summary.paidThisMonth.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      <h3 className="mb-3 mt-6 font-semibold">Pending requests</h3>
      <Card className="overflow-hidden">
        {loading ? (
          <Loading />
        ) : error ? (
          <div className="p-10 text-center text-sm text-rose-400">{error}</div>
        ) : pending.length === 0 ? (
          <EmptyState title="No pending withdrawals" message="All requests have been processed." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Creator</Th>
                  <Th>Method</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                  <Th>Requested</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {pending.map((w) => (
                  <tr key={w.id} className="cursor-pointer hover:bg-[#1d1d27]" onClick={() => setSelected(w)}>
                    <Td className="font-mono text-xs text-brand-300">{w.id}</Td>
                    <Td className="font-medium">{w.user}</Td>
                    <Td>{methodBadge(w.method)}</Td>
                    <Td className="font-medium">${w.amount.toLocaleString()}</Td>
                    <Td>{wdBadge(w.status)}</Td>
                    <Td className="text-white/50">{new Date(w.createdAt).toLocaleString()}</Td>
                    <Td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setConfirm({ wd: w, action: 'approve' })}>
                          <Check className="h-4 w-4 text-emerald-400" /> Approve
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setConfirm({ wd: w, action: 'reject' })}>
                          <X className="h-4 w-4 text-rose-400" /> Reject
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

      <h3 className="mb-3 mt-6 font-semibold">Processed</h3>
      <Card className="overflow-hidden">
        {loading ? (
          <Loading />
        ) : processed.length === 0 ? (
          <EmptyState title="No processed withdrawals" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Creator</Th>
                  <Th>Method</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                  <Th>Requested</Th>
                  <Th>Processed</Th>
                </tr>
              </thead>
              <tbody>
                {processed.map((w) => (
                  <tr key={w.id} className="hover:bg-[#1d1d27]">
                    <Td className="font-mono text-xs text-brand-300">{w.id}</Td>
                    <Td>{w.user}</Td>
                    <Td>{methodBadge(w.method)}</Td>
                    <Td className="font-medium">${w.amount.toLocaleString()}</Td>
                    <Td>{wdBadge(w.status)}</Td>
                    <Td className="text-white/50">{new Date(w.createdAt).toLocaleString()}</Td>
                    <Td className="text-white/50">{new Date(w.updatedAt).toLocaleString()}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && (
        <Modal open onClose={() => setSelected(null)} title="Withdrawal request">
          <div className="grid grid-cols-2 gap-3">
            {[
              ['ID', selected.id],
              ['Creator', selected.user],
              ['Method', selected.method],
              ['Amount', `$${selected.amount.toLocaleString()}`],
              ['Status', selected.status],
              ['Requested', new Date(selected.createdAt).toLocaleString()],
              ['Processed', new Date(selected.updatedAt).toLocaleString()],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-[#111118] p-3">
                <p className="text-[11px] uppercase tracking-wider text-white/40">{k}</p>
                <p className="mt-1 break-words text-sm font-medium">{String(v)}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            {selected.status === 'PENDING' && (
              <>
                <Button variant="outline" onClick={() => setConfirm({ wd: selected, action: 'reject' })}>Reject</Button>
                <Button onClick={() => setConfirm({ wd: selected, action: 'approve' })}>Approve</Button>
              </>
            )}
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
          </div>
        </Modal>
      )}

      {confirm && (
        <Modal open onClose={() => setConfirm(null)} title={confirm.action === 'approve' ? 'Approve withdrawal' : 'Reject withdrawal'}>
          <p className="text-sm text-white/60">
            {confirm.action === 'approve'
              ? `Approve payout of $${confirm.wd.amount.toLocaleString()} to ${confirm.wd.user}?`
              : `Reject the withdrawal request of $${confirm.wd.amount.toLocaleString()} from ${confirm.wd.user}?`}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant={confirm.action === 'approve' ? 'primary' : 'danger'} onClick={runConfirm}>
              {confirm.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast} type={toastType} />}
    </div>
  );
}