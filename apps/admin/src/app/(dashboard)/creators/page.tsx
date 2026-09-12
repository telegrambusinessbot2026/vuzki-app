'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, patch } from '@/lib/api';
import { Card, PageHeader, Tabs, StatusBadge, Badge, Button, Modal, Avatar, EmptyState, Th, Td, Toast, Loading, SearchInput } from '@/components/ui';
import { Check, X, Eye, Star, Ban } from '@/components/icons';

type Tab = 'APPLICATIONS' | 'ACTIVE' | 'REJECTED';

interface Creator {
  id: string;
  displayName: string;
  username: string;
  isCreator: boolean;
  verif: boolean;
  creator: {
    status: string;
    rating: number;
    kyciStatus: string;
    totalEarnings: number;
    totalMinutes: number;
  } | null;
}

const statusForTab: Record<Tab, string> = { APPLICATIONS: 'PENDING', ACTIVE: 'APPROVED', REJECTED: 'REJECTED' };

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('APPLICATIONS');
  const [search, setSearch] = useState('');
  const [actionFor, setActionFor] = useState<{ user: Creator; action: 'approve' | 'reject' | 'suspend' } | null>(null);
  const [kycFor, setKycFor] = useState<Creator | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('status', statusForTab[tab]);
      params.set('limit', '50');
      const data = await api<{ items: Creator[]; total: number }>(`/admin/creators?${params.toString()}`);
      setCreators(data.items);
      setTotal(data.total);
    } catch (e: any) {
      setError(e?.message || 'Failed to load creators');
      setCreators([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search) return creators;
    const q = search.toLowerCase();
    return creators.filter((c) => `${c.displayName} ${c.username}`.toLowerCase().includes(q));
  }, [creators, search]);

  const runAction = async () => {
    if (!actionFor) return;
    const { user, action } = actionFor;
    try {
      await patch(`/admin/creators/${user.id}`, { action });
      setToast(action === 'approve' ? 'Creator approved' : action === 'reject' ? 'Creator application rejected' : 'Creator suspended');
      setToastType('success');
      load();
    } catch (e: any) {
      setToast(e?.message || 'Action failed');
      setToastType('error');
    }
    setActionFor(null);
  };

  const kycBadge = (k: string) => {
    if (k === 'APPROVED') return <StatusBadge status="APPROVED_KYC" />;
    if (k === 'PENDING') return <StatusBadge status="PENDING_KYC" />;
    if (k === 'REJECTED') return <StatusBadge status="REJECTED_KYC" />;
    return <StatusBadge status="NONE" />;
  };

  const creatorBadge = (s: string) => {
    const m: Record<string, string> = { APPROVED: 'green', REJECTED: 'red', SUSPENDED: 'amber', REVOKED: 'gray', PENDING: 'amber' };
    return <Badge color={m[s] || 'gray'}>{s.charAt(0) + s.slice(1).toLowerCase()}</Badge>;
  };

  return (
    <div>
      <PageHeader title="Creators" subtitle={`${total} creators match the current view`} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          tabs={[
            { key: 'APPLICATIONS', label: 'Applications', count: tab === 'APPLICATIONS' ? total : undefined },
            { key: 'ACTIVE', label: 'Active', count: tab === 'ACTIVE' ? total : undefined },
            { key: 'REJECTED', label: 'Rejected', count: tab === 'REJECTED' ? total : undefined },
          ]}
          active={tab}
          onChange={(k) => setTab(k as Tab)}
        />
        <div className="w-full sm:w-72">
          <SearchInput value={search} onChange={setSearch} placeholder="Search creators…" />
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <Loading />
        ) : error ? (
          <div className="p-10 text-center text-sm text-rose-400">{error}</div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No creators here" message="No creators match the current tab or search." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>Creator</Th>
                  <Th>Rating</Th>
                  <Th>Earnings</Th>
                  <Th>Minutes</Th>
                  <Th>KYC</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-[#1d1d27]">
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar src="" name={c.displayName} />
                        <div>
                          <p className="font-medium">
                            {c.displayName} <span className="text-white/40">@{c.username}</span>
                            {c.verif && <span className="ml-1 text-brand-400">✓</span>}
                          </p>
                          <p className="text-xs text-white/40">{c.id}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>{c.creator ? c.creator.rating.toFixed(1) : '—'}</Td>
                    <Td>₹{Number(c.creator?.totalEarnings || 0).toLocaleString()}</Td>
                    <Td>{Number(c.creator?.totalMinutes || 0).toLocaleString()}</Td>
                    <Td>
                      <button onClick={() => setKycFor(c)} className="inline-flex items-center gap-1 hover:opacity-80">
                        {kycBadge(c.creator?.kyciStatus || 'NONE')} <Eye className="h-3 w-3 text-white/40" />
                      </button>
                    </Td>
                    <Td>{c.creator ? creatorBadge(c.creator.status) : <span className="text-white/30">—</span>}</Td>
                    <Td className="text-right">
                      {tab === 'APPLICATIONS' ? (
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={() => setActionFor({ user: c, action: 'approve' })}>
                            <Check className="h-4 w-4 text-emerald-400" /> Approve
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => setActionFor({ user: c, action: 'reject' })}>
                            <X className="h-4 w-4 text-rose-400" /> Reject
                          </Button>
                        </div>
                      ) : tab === 'ACTIVE' ? (
                        <Button variant="secondary" size="sm" onClick={() => setActionFor({ user: c, action: 'suspend' })}>
                          <Ban className="h-4 w-4 text-amber-400" /> Suspend
                        </Button>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {actionFor && (
        <Modal
          open
          onClose={() => setActionFor(null)}
          title={
            actionFor.action === 'approve' ? 'Approve creator' : actionFor.action === 'reject' ? 'Reject application' : 'Suspend creator'
          }
        >
          <p className="text-sm text-white/60">
            {actionFor.action === 'approve' &&
              `Approve ${actionFor.user.displayName} as a verified creator? They will gain access to creator tools.`}
            {actionFor.action === 'reject' && `Reject ${actionFor.user.displayName}'s creator application?`}
            {actionFor.action === 'suspend' &&
              `Suspend ${actionFor.user.displayName} from creating content? Their account will be flagged.`}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setActionFor(null)}>Cancel</Button>
            <Button
              variant={actionFor.action === 'approve' ? 'primary' : 'danger'}
              onClick={runAction}
            >
              {actionFor.action === 'approve' ? 'Approve' : actionFor.action === 'reject' ? 'Reject' : 'Suspend'}
            </Button>
          </div>
        </Modal>
      )}

      {kycFor && (
        <Modal open onClose={() => setKycFor(null)} title="KYC Review">
          <div className="flex items-center gap-3 border-b border-[#2a2a37] pb-4">
            <Avatar src="" name={kycFor.displayName} />
            <div>
              <p className="font-semibold">{kycFor.displayName}</p>
              <p className="text-xs text-white/40">@{kycFor.username}</p>
            </div>
            {kycBadge(kycFor.creator?.kyciStatus || 'NONE')}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              ['Full name', kycFor.displayName],
              ['Rating', kycFor.creator ? kycFor.creator.rating.toFixed(1) : '—'],
              ['Total earnings', kycFor.creator ? `₹${kycFor.creator.totalEarnings.toLocaleString()}` : '—'],
              ['Total minutes', kycFor.creator ? kycFor.creator.totalMinutes.toLocaleString() : '—'],
              ['KYC status', kycFor.creator?.kyciStatus || 'NONE'],
              ['Creator status', kycFor.creator?.status || '—'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-[#111118] p-3">
                <p className="text-[11px] uppercase tracking-wider text-white/40">{k}</p>
                <p className="mt-1 text-sm font-medium">{String(v)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-[#2a2a37] bg-[#111118] p-3 text-center text-sm text-white/40">
            <Star className="mx-auto mb-1 h-5 w-5 text-brand-400" />
            Document previews render here in production.
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setKycFor(null)}>Close</Button>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast} type={toastType} />}
    </div>
  );
}