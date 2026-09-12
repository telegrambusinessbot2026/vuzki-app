'use client';

import { Card, PageHeader, EmptyState } from '@/components/ui';

export default function AuditPage() {
  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Immutable trail of all admin actions" />

      <Card>
        <EmptyState title="No audit logs" message="Audit logs are recorded server-side." />
      </Card>
    </div>
  );
}