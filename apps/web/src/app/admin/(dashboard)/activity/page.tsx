'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/admin/api';
import { Card, PageHeader, EmptyState, Th, Td, Badge, Loading, Button } from '@/components/admin/ui';

interface ActivityLog {
  id: string;
  createdAt: string;
  actorId: string | null;
  actorType: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: any | null;
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ data: ActivityLog[]; meta: { total: number } }>('/admin/activity');
      setLogs(data.data);
      setTotal(data.meta.total);
    } catch (e: any) {
      setError(e?.message || 'Failed to load activity logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader title="Activity Logs" subtitle="Live metadata of user actions" />

      {error ? (
        <Card className="p-10">
          <EmptyState title="Error" message={error} />
        </Card>
      ) : loading && logs.length === 0 ? (
        <Loading label="Loading activity logs..." />
      ) : logs.length === 0 ? (
        <Card>
          <EmptyState title="No activity" message="No user activity records found." />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#16161d] text-xs uppercase text-white/40">
                <tr>
                  <Th>Date</Th>
                  <Th>User ID</Th>
                  <Th>Event</Th>
                  <Th>Target</Th>
                  <Th>Metadata</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a37]">
                {logs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-white/5">
                    <Td className="whitespace-nowrap text-white/60">
                      {new Date(log.createdAt).toLocaleString()}
                    </Td>
                    <Td>
                      <span className="font-mono text-xs text-white/40">{log.actorId}</span>
                    </Td>
                    <Td className="font-medium text-white/90">
                      <Badge color="brand">{log.action}</Badge>
                    </Td>
                    <Td>
                      {log.entityType ? (
                        <div className="flex items-center gap-2">
                          <span className="text-white/60">{log.entityType}</span>
                          {log.entityId && <span className="font-mono text-xs text-white/40">{log.entityId}</span>}
                        </div>
                      ) : (
                        <span className="text-white/30">-</span>
                      )}
                    </Td>
                    <Td className="max-w-[200px] truncate text-xs text-white/40">
                      {log.metadata ? JSON.stringify(log.metadata) : '-'}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
