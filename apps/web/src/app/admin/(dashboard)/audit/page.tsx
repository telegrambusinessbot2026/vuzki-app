'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/admin/api';
import { Card, PageHeader, EmptyState, Th, Td, Badge, Loading, Button } from '@/components/admin/ui';

interface AuditLog {
  id: string;
  createdAt: string;
  actorId: string | null;
  actorType: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: any | null;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ items: AuditLog[]; total: number; page: number }>(`/admin/audit-logs?page=${p}&limit=50`);
      setLogs(data.items);
      setTotal(data.total);
      setPage(data.page);
    } catch (e: any) {
      setError(e?.message || 'Failed to load audit logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  const maxPage = Math.ceil(total / 50);

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Immutable trail of all admin actions" />

      {error ? (
        <Card className="p-10">
          <EmptyState title="Error" message={error} />
        </Card>
      ) : loading && logs.length === 0 ? (
        <Loading label="Loading audit logs..." />
      ) : logs.length === 0 ? (
        <Card>
          <EmptyState title="No audit logs" message="No audit records found." />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#16161d] text-xs uppercase text-white/40">
                <tr>
                  <Th>Date</Th>
                  <Th>Actor</Th>
                  <Th>Action</Th>
                  <Th>Target Entity</Th>
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
                      <div className="flex items-center gap-2">
                        <Badge color={log.actorType === 'ADMIN' ? 'brand' : 'gray'}>
                          {log.actorType}
                        </Badge>
                        <span className="font-mono text-xs text-white/40">{log.actorId || 'SYSTEM'}</span>
                      </div>
                    </Td>
                    <Td className="font-medium text-white/90">
                      {log.action}
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
          
          <div className="flex items-center justify-between border-t border-[#2a2a37] p-4">
            <p className="text-sm text-white/40">
              Showing <span className="font-medium text-white">{logs.length}</span> of{' '}
              <span className="font-medium text-white">{total}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => load(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= maxPage || loading}
                onClick={() => load(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}