'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, patch } from '@/lib/api';
import { Card, PageHeader, Tabs, Badge, Button, Modal, Toast, EmptyState, Loading } from '@/components/ui';

type Filter = 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';

interface Report {
  id: string;
  reporter: string;
  reported: string;
  reportedId: string;
  category: string;
  description: string;
  status: string;
  aiFlagged: boolean;
  createdAt: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('PENDING');
  const [selected, setSelected] = useState<Report | null>(null);
  const [confirm, setConfirm] = useState<{ report: Report; action: 'resolve' | 'dismiss' | 'suspend' } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('status', filter);
      params.set('limit', '50');
      const data = await api<{ items: Report[]; total: number }>(`/admin/reports?${params.toString()}`);
      setReports(data.items);
      setTotal(data.total);
    } catch (e: any) {
      setError(e?.message || 'Failed to load reports');
      setReports([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { PENDING: 0, REVIEWING: 0, RESOLVED: 0, DISMISSED: 0 };
    reports.forEach((r) => {
      if (r.status in c) c[r.status]++;
    });
    return c;
  }, [reports]);

  const runConfirm = async () => {
    if (!confirm) return;
    const { report, action } = confirm;
    try {
      if (action === 'resolve') {
        await patch(`/admin/reports/${report.id}`, { decision: 'resolve' });
      } else if (action === 'dismiss') {
        await patch(`/admin/reports/${report.id}`, { decision: 'dismiss' });
      } else {
        await patch(`/admin/reports/${report.id}`, { decision: 'action', actionType: 'SUSPEND' });
      }
      setToast(
        action === 'resolve'
          ? 'Report resolved'
          : action === 'dismiss'
            ? 'Report dismissed'
            : `Report actioned (${report.reported} suspended)`
      );
      setToastType('success');
      load();
    } catch (e: any) {
      setToast(e?.message || 'Action failed');
      setToastType('error');
    }
    setConfirm(null);
    setSelected(null);
  };

  return (
    <div>
      <PageHeader title="Reports" subtitle="Moderation queue for user-generated reports" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          tabs={[
            { key: 'PENDING', label: 'Pending', count: counts.PENDING },
            { key: 'REVIEWING', label: 'Reviewing', count: counts.REVIEWING },
            { key: 'RESOLVED', label: 'Resolved', count: counts.RESOLVED },
            { key: 'DISMISSED', label: 'Dismissed', count: counts.DISMISSED },
          ]}
          active={filter}
          onChange={(k) => setFilter(k as Filter)}
        />
        <span className="text-xs text-white/40">{total} reports in this view</span>
      </div>

      {loading ? (
        <Card>
          <Loading />
        </Card>
      ) : error ? (
        <Card>
          <div className="p-10 text-center text-sm text-rose-400">{error}</div>
        </Card>
      ) : reports.length === 0 ? (
        <Card>
          <EmptyState title="No reports" message="No reports match the current filter." />
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id} className="cursor-pointer p-5 hover:bg-[#1d1d27] transition-colors" >
              <div className="flex flex-wrap items-start justify-between gap-4" onClick={() => setSelected(r)}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-white/40 text-xs">{r.id}</span>
                    <Badge color="gray">{r.category}</Badge>
                    {r.aiFlagged && <Badge color="amber">AI flagged</Badge>}
                  </div>
                  <p className="mt-2 text-sm">
                    <span className="font-medium text-white">{r.reporter}</span>
                    <span className="mx-2 text-white/40">reported</span>
                    <span className="font-medium text-white">{r.reported}</span>
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-white/50">{r.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-white/30">{new Date(r.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setConfirm({ report: r, action: 'suspend' }); }}>
                    Suspend
                  </Button>
                  <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setConfirm({ report: r, action: 'resolve' }); }}>
                    Resolve
                  </Button>
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setConfirm({ report: r, action: 'dismiss' }); }}>
                    Dismiss
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <Modal open onClose={() => setSelected(null)} title="Report details">
          <div className="flex items-center gap-2 border-b border-[#2a2a37] pb-3">
            <Badge color="gray">{selected.category}</Badge>
            {selected.aiFlagged && <Badge color="amber">AI flagged</Badge>}
            <Badge color="gray">{new Date(selected.createdAt).toLocaleString()}</Badge>
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/40">Description</p>
              <p className="mt-1 text-sm text-white/70">{selected.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-[#111118] p-3">
                <p className="text-[11px] uppercase tracking-wider text-white/40">Reporter</p>
                <p className="mt-1 text-sm font-medium">{selected.reporter}</p>
              </div>
              <div className="rounded-lg bg-[#111118] p-3">
                <p className="text-[11px] uppercase tracking-wider text-white/40">Target</p>
                <p className="mt-1 text-sm font-medium">{selected.reported}</p>
                <p className="text-xs text-white/40">{selected.reportedId}</p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-white/40">Status</p>
              <p className="mt-1 text-sm font-medium text-white/70">{selected.status}</p>
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <Button variant="danger" size="sm" onClick={() => setConfirm({ report: selected, action: 'suspend' })}>
              Suspend target
            </Button>
            <Button variant="primary" size="sm" onClick={() => setConfirm({ report: selected, action: 'resolve' })}>
              Resolve
            </Button>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Close</Button>
          </div>
        </Modal>
      )}

      {confirm && (
        <Modal
          open
          onClose={() => setConfirm(null)}
          title={
            confirm.action === 'resolve' ? 'Resolve report' : confirm.action === 'dismiss' ? 'Dismiss report' : 'Suspend user'
          }
        >
          <p className="text-sm text-white/60">
            {confirm.action === 'resolve' && 'Mark this report as resolved? The reported content will be considered handled.'}
            {confirm.action === 'dismiss' && 'Dismiss this report as unfounded or non-violating?'}
            {confirm.action === 'suspend' &&
              `Suspend ${confirm.report.reported} and action this report?`}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button
              variant={confirm.action === 'resolve' ? 'primary' : 'danger'}
              onClick={runConfirm}
            >
              {confirm.action === 'resolve' ? 'Resolve' : confirm.action === 'dismiss' ? 'Dismiss' : 'Suspend'}
            </Button>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast} type={toastType} />}
    </div>
  );
}