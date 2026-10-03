'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, patch } from '@/lib/admin/api';
import { Card, PageHeader, Tabs, Badge, Button, Modal, Toast, EmptyState, Loading } from '@/components/admin/ui';
import { Shield } from '@/components/admin/icons';
import Link from 'next/link';

type ContentFlagStatus = 'REVIEW' | 'APPROVED' | 'REJECTED' | 'REMOVED';

interface ContentFlag {
  id: string;
  contentType: string;
  contentId: string | null;
  ownerUserId: string;
  category: string;
  confidence: number;
  metadata: any;
  status: ContentFlagStatus;
  isBlocking: boolean;
  createdAt: string;
}

export default function ContentModerationPage() {
  const [activeTab, setActiveTab] = useState<string>('REVIEW');
  const [flags, setFlags] = useState<ContentFlag[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [selectedFlag, setSelectedFlag] = useState<ContentFlag | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await api(`/admin/content-flags?status=${activeTab}&limit=50`);
      setFlags(res.data.items);
      setTotal(res.data.total);
    } catch (err: any) {
      setToastType('error');
      setToast(err.message || 'Failed to load content flags');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleAction = async (decision: 'APPROVED' | 'REJECTED' | 'REMOVED') => {
    if (!selectedFlag) return;
    try {
      setIsSubmitting(true);
      await patch(`/admin/content-flags/${selectedFlag.id}`, { decision, note: actionNote });
      setToastType('success');
      setToast(`Flag marked as ${decision}`);
      setSelectedFlag(null);
      setActionNote('');
      fetchFlags();
    } catch (err: any) {
      setToastType('error');
      setToast(err.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { key: 'REVIEW', label: 'Needs Review' },
    { key: 'APPROVED', label: 'Approved (Violation)' },
    { key: 'REJECTED', label: 'Rejected (Safe)' },
    { key: 'REMOVED', label: 'Removed (Deleted)' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Content Moderation" 
        subtitle={`Managing flagged content and AI safety limits. ${total} total in current view.`} 
      />

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {loading ? (
        <Loading />
      ) : flags.length === 0 ? (
        <EmptyState title="No Content Flags" message={`No ${activeTab.toLowerCase()} content flags found.`} />
      ) : (
        <div className="bg-surface-overlay border border-surface-border rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-raised border-b border-surface-border">
              <tr>
                <th className="px-6 py-4 font-semibold text-brand-300">Category</th>
                <th className="px-6 py-4 font-semibold text-brand-300">Type</th>
                <th className="px-6 py-4 font-semibold text-brand-300">User</th>
                <th className="px-6 py-4 font-semibold text-brand-300">Confidence</th>
                <th className="px-6 py-4 font-semibold text-brand-300">Status</th>
                <th className="px-6 py-4 font-semibold text-brand-300">Date</th>
                <th className="px-6 py-4 font-semibold text-brand-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {flags.map(flag => (
                <tr key={flag.id} className="hover:bg-surface-raised/50 transition-colors">
                  <td className="px-6 py-4 font-medium">
                    <div className="flex items-center gap-2">
                      <Shield className={`w-4 h-4 ${flag.isBlocking ? 'text-red-400' : 'text-brand-400'}`} />
                      <span className="capitalize">{flag.category.toLowerCase().replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-brand-600/20 text-brand-300 border-brand-500/30">
                      {flag.contentType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/admin/users/${flag.ownerUserId}`} className="text-brand-400 hover:underline">
                      {flag.ownerUserId.substring(0, 8)}...
                    </Link>
                  </td>
                  <td className="px-6 py-4">{(flag.confidence * 100).toFixed(0)}%</td>
                  <td className="px-6 py-4">
                    {flag.status === 'REVIEW' && <Badge color="yellow">Review</Badge>}
                    {flag.status === 'APPROVED' && <Badge color="red">Approved</Badge>}
                    {flag.status === 'REJECTED' && <Badge color="green">Rejected</Badge>}
                    {flag.status === 'REMOVED' && <Badge color="gray">Removed</Badge>}
                  </td>
                  <td className="px-6 py-4 text-white/50">{new Date(flag.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="secondary" size="sm" onClick={() => setSelectedFlag(flag)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!selectedFlag} onClose={() => setSelectedFlag(null)} title="Review Content Flag">
        {selectedFlag && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-white/50 mb-1">Content Type</div>
                <div className="font-medium">{selectedFlag.contentType}</div>
              </div>
              <div>
                <div className="text-white/50 mb-1">Category</div>
                <div className="font-medium capitalize">{selectedFlag.category.toLowerCase()}</div>
              </div>
              <div className="col-span-2">
                <div className="text-white/50 mb-1">Target User ID</div>
                <div className="font-mono bg-surface-raised p-2 rounded">{selectedFlag.ownerUserId}</div>
              </div>
              <div className="col-span-2">
                <div className="text-white/50 mb-1">Metadata</div>
                <pre className="text-xs bg-black/50 p-3 rounded overflow-auto border border-surface-border">
                  {JSON.stringify(selectedFlag.metadata, null, 2)}
                </pre>
              </div>
            </div>

            {selectedFlag.status === 'REVIEW' && (
              <div className="pt-4 border-t border-surface-border space-y-4">
                <div>
                  <label className="block text-sm text-white/70 mb-2">Review Note (optional)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-surface-raised border border-surface-border rounded-lg text-white"
                    placeholder="Enter reason for decision..."
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="success" onClick={() => handleAction('REJECTED')} disabled={isSubmitting}>
                    Reject (Safe)
                  </Button>
                  <Button variant="danger" onClick={() => handleAction('APPROVED')} disabled={isSubmitting}>
                    Approve (Violation)
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
