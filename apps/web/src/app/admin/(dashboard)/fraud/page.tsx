'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, patch } from '@/lib/admin/api';
import { Card, PageHeader, Tabs, Badge, Button, Modal, Toast, EmptyState, Loading } from '@/components/admin/ui';
import { Shield } from '@/components/admin/icons';

type FraudFlagStatus = 'OPEN' | 'INVESTIGATING' | 'CONFIRMED' | 'DISMISSED';

interface FraudFlag {
  id: string;
  entityType: string;
  entityId: string;
  userId: string | null;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
  evidence: any;
  status: FraudFlagStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolvedById: string | null;
}

export default function FraudFlagsPage() {
  const [flags, setFlags] = useState<FraudFlag[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FraudFlagStatus>('OPEN');
  const [selected, setSelected] = useState<FraudFlag | null>(null);
  const [actioning, setActioning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('status', filter);
      params.set('limit', '50');
      const data = await api<FraudFlag[]>(`/admin/fraud-flags?${params.toString()}`);
      setFlags(data || []);
      setTotal((data || []).length);
    } catch (err: any) {
      setError(err.message || 'Failed to load fraud flags');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAction = async (decision: 'INVESTIGATING' | 'CONFIRMED' | 'DISMISSED') => {
    if (!selected) return;
    setActioning(true);
    try {
      await patch(`/admin/fraud-flags/${selected.id}`, { decision, note });
      setToast(`Flag marked as ${decision}`);
      setToastType('success');
      setSelected(null);
      setNote('');
      load();
    } catch (err: any) {
      setToast(err.message || 'Failed to update flag');
      setToastType('error');
    } finally {
      setActioning(false);
    }
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const tabs = [
    { key: 'OPEN', label: 'Open' },
    { key: 'INVESTIGATING', label: 'Investigating' },
    { key: 'CONFIRMED', label: 'Confirmed' },
    { key: 'DISMISSED', label: 'Dismissed' },
  ];

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'MEDIUM': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'LOW': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Fraud & Risk Flags" 
        subtitle="Monitor and resolve automated anti-fraud and risk signals."
      />

      <Tabs tabs={tabs} active={filter} onChange={(id) => setFilter(id as FraudFlagStatus)} />

      <Card>
        {loading ? (
          <div className="p-8 flex justify-center"><Loading /></div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : flags.length === 0 ? (
          <EmptyState 
            title="No flags found" 
            message={`There are no ${filter.toLowerCase()} fraud flags.`} 
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-sm font-medium text-white/40">
                  <th className="p-4">Type / Entity</th>
                  <th className="p-4">User</th>
                  <th className="p-4">Risk Level</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Created</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {flags.map((flag) => (
                  <tr key={flag.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-white">{flag.entityType}</div>
                      <div className="text-sm text-white/40">{flag.entityId}</div>
                    </td>
                    <td className="p-4 text-white/60">
                      {flag.userId || 'N/A'}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getRiskBadgeColor(flag.riskLevel)}`}>
                        {flag.riskLevel}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-white/80 max-w-xs truncate" title={flag.reason}>
                      {flag.reason}
                    </td>
                    <td className="p-4 text-sm text-white/40">
                      {new Date(flag.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelected(flag)}>
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!selected}
        onClose={() => {
          setSelected(null);
          setNote('');
        }}
        title="Review Fraud Flag"
      >
        {selected && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-white/40 mb-1">Entity Type</div>
                <div className="text-white font-medium">{selected.entityType}</div>
              </div>
              <div>
                <div className="text-white/40 mb-1">Entity ID</div>
                <div className="text-white font-medium break-all">{selected.entityId}</div>
              </div>
              <div>
                <div className="text-white/40 mb-1">Risk Level</div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getRiskBadgeColor(selected.riskLevel)}`}>{selected.riskLevel}</span>
              </div>
              <div>
                <div className="text-white/40 mb-1">Created At</div>
                <div className="text-white/80">{new Date(selected.createdAt).toLocaleString()}</div>
              </div>
            </div>

            <div>
              <div className="text-white/40 mb-1 text-sm">Reason</div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm">
                {selected.reason}
              </div>
            </div>

            {selected.evidence && (
              <div>
                <div className="text-white/40 mb-1 text-sm">Evidence</div>
                <pre className="p-3 rounded-lg bg-black/50 border border-white/10 text-white/60 text-xs overflow-auto max-h-40">
                  {JSON.stringify(selected.evidence, null, 2)}
                </pre>
              </div>
            )}

            {selected.status !== 'CONFIRMED' && selected.status !== 'DISMISSED' && (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">Resolution Note (Optional)</label>
                  <textarea
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-brand-500"
                    rows={3}
                    placeholder="Add details about this decision..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  {selected.status === 'OPEN' && (
                    <Button variant="outline" onClick={() => handleAction('INVESTIGATING')} disabled={actioning}>
                      Mark Investigating
                    </Button>
                  )}
                  <Button variant="danger" onClick={() => handleAction('CONFIRMED')} disabled={actioning}>
                    Confirm Fraud
                  </Button>
                  <Button variant="primary" onClick={() => handleAction('DISMISSED')} disabled={actioning}>
                    Dismiss (Safe)
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {toast && (
        <div onClick={() => setToast(null)}>
          <Toast
            message={toast}
            type={toastType}
          />
        </div>
      )}
    </div>
  );
}
