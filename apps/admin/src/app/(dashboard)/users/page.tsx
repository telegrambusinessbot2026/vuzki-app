'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, patch } from '@/lib/api';
import { Card, PageHeader, SearchInput, Tabs, StatusBadge, Badge, Button, Modal, Avatar, EmptyState, Th, Td, Toast, Loading } from '@/components/ui';
import { More, Eye, Ban, Check, X, Download, Refresh } from '@/components/icons';

type Filter = 'ALL' | 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'PENDING';

interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  phone: string | null;
  status: string;
  isVerified: boolean;
  premiumTier: string;
  isCreator: boolean;
  created: string;
  reports: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ user: AdminUser; action: 'ban' } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (filter !== 'ALL') params.set('status', filter);
      params.set('limit', '50');
      const data = await api<{ items: AdminUser[]; total: number }>(`/admin/users?${params.toString()}`);
      setUsers(data.items);
      setTotal(data.total);
    } catch (e: any) {
      setError(e?.message || 'Failed to load users');
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { ALL: total, ACTIVE: 0, SUSPENDED: 0, BANNED: 0, PENDING: 0 };
    users.forEach((u) => {
      if (u.status in c) c[u.status as Filter]++;
    });
    return c;
  }, [users, total]);

  const doAction = async (id: string, action: string, user?: AdminUser) => {
    try {
      await patch(`/admin/users/${id}`, { action });
      setToast(
        action === 'verify'
          ? 'User verified'
          : action === 'unverify'
            ? 'Verification revoked'
            : action === 'suspend'
              ? 'User suspended'
              : action === 'ban'
                ? 'User banned'
                : action === 'restore'
                  ? 'User restored'
                  : 'User updated'
      );
      setToastType('success');
      if (user) setSelected({ ...user });
    } catch (e: any) {
      setToast(e?.message || 'Action failed');
      setToastType('error');
    }
    setMenuFor(null);
    load();
  };

  const confirmAction = () => {
    if (!confirm) return;
    doAction(confirm.user.id, 'ban');
    setConfirm(null);
  };

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={`${total} registered accounts`}
        actions={
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" /> Export
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          tabs={[
            { key: 'ALL', label: 'All', count: counts.ALL },
            { key: 'ACTIVE', label: 'Active', count: counts.ACTIVE },
            { key: 'SUSPENDED', label: 'Suspended', count: counts.SUSPENDED },
            { key: 'BANNED', label: 'Banned', count: counts.BANNED },
            { key: 'PENDING', label: 'Pending', count: counts.PENDING },
          ]}
          active={filter}
          onChange={(k) => setFilter(k as Filter)}
        />
        <div className="w-full sm:w-72">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, username…" />
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <Loading />
        ) : error ? (
          <div className="p-10 text-center text-sm text-rose-400">{error}</div>
        ) : users.length === 0 ? (
          <EmptyState title="No users found" message="Try adjusting your search or filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>User</Th>
                  <Th>Phone</Th>
                  <Th>Premium</Th>
                  <Th>Reports</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#1d1d27] cursor-pointer" onClick={() => setSelected(u)}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar src="" name={u.displayName} />
                        <div>
                          <p className="font-medium">
                            {u.displayName} <span className="text-white/40">@{u.username}</span>
                            {u.isVerified && <span className="ml-1 text-brand-400">✓</span>}
                          </p>
                          <p className="text-xs text-white/40">{u.email}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-white/60">{u.phone || '—'}</Td>
                    <Td>
                      {u.premiumTier && u.premiumTier !== 'FREE' ? (
                        <Badge color="amber">{u.premiumTier}</Badge>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </Td>
                    <Td>{u.reports}</Td>
                    <Td>
                      <StatusBadge status={u.status} />
                    </Td>
                    <Td className="text-white/50">{new Date(u.created).toLocaleDateString()}</Td>
                    <Td className="text-right">
                      <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setMenuFor(menuFor === u.id ? null : u.id)}
                          className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white"
                        >
                          <More className="h-4 w-4" />
                        </button>
                        {menuFor === u.id && (
                          <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-[#2a2a37] bg-[#1d1d27] shadow-xl">
                            <button onClick={() => { setSelected(u); setMenuFor(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5">
                              <Eye className="h-4 w-4 text-white/50" /> View
                            </button>
                            {u.status !== 'SUSPENDED' && u.status !== 'BANNED' && (
                              <button onClick={() => { doAction(u.id, 'suspend', u); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5">
                                <X className="h-4 w-4 text-amber-400" /> Suspend
                              </button>
                            )}
                            {u.status !== 'BANNED' && (
                              <button onClick={() => { setConfirm({ user: u, action: 'ban' }); setMenuFor(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5">
                                <Ban className="h-4 w-4 text-rose-400" /> Ban
                              </button>
                            )}
                            <button onClick={() => { doAction(u.id, u.isVerified ? 'unverify' : 'verify', u); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5">
                              <Check className="h-4 w-4 text-emerald-400" /> {u.isVerified ? 'Unverify' : 'Verify'}
                            </button>
                            {u.status !== 'ACTIVE' && u.status !== 'PENDING' && (
                              <button onClick={() => { doAction(u.id, 'restore', u); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5">
                                <Refresh className="h-4 w-4 text-emerald-400" /> Restore
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && (
        <Modal open onClose={() => setSelected(null)} title="User Details" wide>
          <div className="flex items-center gap-4 border-b border-[#2a2a37] pb-4">
            <Avatar src="" name={selected.displayName} size={14} />
            <div>
              <p className="text-lg font-semibold">
                {selected.displayName} {selected.isVerified && <span className="text-brand-400">✓</span>}
              </p>
              <p className="text-sm text-white/40">@{selected.username} · {selected.email}</p>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge status={selected.status} />
                {selected.isCreator && <Badge color="blue">Creator</Badge>}
                {selected.premiumTier && selected.premiumTier !== 'FREE' && <Badge color="amber">{selected.premiumTier}</Badge>}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ['Phone', selected.phone || '—'],
              ['Username', selected.username],
              ['Reports', selected.reports],
              ['Premium tier', selected.premiumTier || 'FREE'],
              ['Created', new Date(selected.created).toLocaleString()],
              ['Status', selected.status],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-[#111118] p-3">
                <p className="text-[11px] uppercase tracking-wider text-white/40">{k}</p>
                <p className="mt-1 text-sm font-medium">{String(v)}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex gap-2">
            {selected.status !== 'BANNED' && (
              <Button variant="danger" size="sm" onClick={() => { doAction(selected.id, 'ban'); setSelected(null); }}>
                <Ban className="h-4 w-4" /> Ban user
              </Button>
            )}
            {selected.status !== 'SUSPENDED' && selected.status !== 'BANNED' && (
              <Button variant="secondary" size="sm" onClick={() => { doAction(selected.id, 'suspend'); setSelected(null); }}>
                Suspend
              </Button>
            )}
            {selected.status !== 'ACTIVE' && (
              <Button variant="secondary" size="sm" onClick={() => { doAction(selected.id, 'restore'); setSelected(null); }}>
                <Refresh className="h-4 w-4" /> Restore
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}

      {confirm && (
        <Modal open onClose={() => setConfirm(null)} title="Ban user">
          <p className="text-sm text-white/60">
            Are you sure you want to <span className="font-medium text-white">ban</span>{' '}
            <span className="font-medium text-white">{confirm.user.displayName}</span>?
            This will immediately lock the account.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmAction}>
              Ban user
            </Button>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast} type={toastType} />}
    </div>
  );
}