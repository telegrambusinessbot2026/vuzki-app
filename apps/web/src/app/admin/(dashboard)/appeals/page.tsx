'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, patch } from '@/lib/admin/api';
import { Card, PageHeader, Tabs, Badge, Button, Modal, Toast, EmptyState, Loading } from '@/components/admin/ui';
import Link from 'next/link';

type AppealStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED';

interface Appeal {
  id: string;
  userId: string;
  restrictionType: string;
  status: AppealStatus;
  message: string;
  createdAt: string;
}

export default function AppealsPage() {
  const [activeTab, setActiveTab] = useState<string>('PENDING');
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAppeals = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await api(`/admin/appeals?status=${activeTab}&limit=50`);
      setAppeals(res.data.items);
      setTotal(res.data.total);
    } catch (err: any) {
      setToastType('error');
      setToast(err.message || 'Failed to load appeals');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchAppeals();
  }, [fetchAppeals]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleAction = async (action: 'UPHELD' | 'REMOVED' | 'REDUCE') => {
    if (!selectedAppeal) return;
    try {
      setIsSubmitting(true);
      await patch(`/admin/appeals/${selectedAppeal.id}`, { action, note: actionNote });
      setToastType('success');
      setToast(`Appeal marked as ${action}`);
      setSelectedAppeal(null);
      setActionNote('');
      fetchAppeals();
    } catch (err: any) {
      setToastType('error');
      setToast(err.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { key: 'PENDING', label: 'Pending' },
    { key: 'APPROVED', label: 'Approved (Removed)' },
    { key: 'REJECTED', label: 'Rejected (Upheld)' },
    { key: 'ESCALATED', label: 'Escalated' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Appeals" 
        subtitle={`Managing user restriction appeals. ${total} total in current view.`} 
      />

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {loading ? (
        <Loading />
      ) : appeals.length === 0 ? (
        <EmptyState title="No Appeals" message={`No ${activeTab.toLowerCase()} appeals found.`} />
      ) : (
        <div className="bg-surface-overlay border border-surface-border rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-raised border-b border-surface-border">
              <tr>
                <th className="px-6 py-4 font-semibold text-brand-300">User</th>
                <th className="px-6 py-4 font-semibold text-brand-300">Restriction</th>
                <th className="px-6 py-4 font-semibold text-brand-300">Message Snippet</th>
                <th className="px-6 py-4 font-semibold text-brand-300">Status</th>
                <th className="px-6 py-4 font-semibold text-brand-300">Date</th>
                <th className="px-6 py-4 font-semibold text-brand-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {appeals.map(appeal => (
                <tr key={appeal.id} className="hover:bg-surface-raised/50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/admin/users/${appeal.userId}`} className="text-brand-400 hover:underline">
                      {appeal.userId.substring(0, 8)}...
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-red-500/10 text-red-400 border-red-500/20">
                      {appeal.restrictionType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {appeal.message && appeal.message.length > 40 ? appeal.message.substring(0, 40) + '...' : appeal.message || '-'}
                  </td>
                  <td className="px-6 py-4">
                    {appeal.status === 'PENDING' && <Badge color="yellow">Pending</Badge>}
                    {appeal.status === 'APPROVED' && <Badge color="green">Approved</Badge>}
                    {appeal.status === 'REJECTED' && <Badge color="red">Rejected</Badge>}
                    {appeal.status === 'ESCALATED' && <Badge color="gray">Escalated</Badge>}
                  </td>
                  <td className="px-6 py-4 text-white/50">{new Date(appeal.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="secondary" size="sm" onClick={() => setSelectedAppeal(appeal)}>
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!selectedAppeal} onClose={() => setSelectedAppeal(null)} title="Review Appeal">
        {selectedAppeal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-white/50 mb-1">Target User ID</div>
                <div className="font-mono bg-surface-raised p-2 rounded">{selectedAppeal.userId}</div>
              </div>
              <div>
                <div className="text-white/50 mb-1">Restriction Type</div>
                <div className="font-medium text-red-400">{selectedAppeal.restrictionType}</div>
              </div>
              <div className="col-span-2">
                <div className="text-white/50 mb-1">User Message</div>
                <div className="bg-surface-raised p-3 rounded border border-surface-border whitespace-pre-wrap">
                  {selectedAppeal.message || 'No message provided.'}
                </div>
              </div>
            </div>

            {selectedAppeal.status === 'PENDING' && (
              <div className="pt-4 border-t border-surface-border space-y-4">
                <div>
                  <label className="block text-sm text-white/70 mb-2">Review Note (optional)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-surface-raised border border-surface-border rounded-lg text-white"
                    placeholder="Enter reasoning..."
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="danger" onClick={() => handleAction('UPHELD')} disabled={isSubmitting}>
                    Reject Appeal (Upheld)
                  </Button>
                  <Button variant="warning" onClick={() => handleAction('REDUCE')} disabled={isSubmitting}>
                    Reduce Penalty
                  </Button>
                  <Button variant="success" onClick={() => handleAction('REMOVED')} disabled={isSubmitting}>
                    Approve (Remove Restriction)
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {toast && (
        <div onClick={() => setToast(null)}>
          <Toast message={toast} type={toastType} />
        </div>
      )}
    </div>
  );
}
