'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextArea, Input, Select } from '@/components/ui/Input';
import { ArrowLeftIcon, ShieldIcon, FlagIcon, LockIcon, DocumentIcon } from '@/components/ui/Icons';

export default function SafetyPage() {
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [reportUser, setReportUser] = useState('');
  const [reportReason, setReportReason] = useState('Harassment');
  const [reportDetails, setReportDetails] = useState('');
  const [reportError, setReportError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reasonOptions = [
    { value: 'Harassment', label: 'Harassment or abuse' },
    { value: 'Inappropriate', label: 'Inappropriate content' },
    { value: 'Impersonation', label: 'Fake or impersonation' },
    { value: 'Spam', label: 'Spam or scam' },
    { value: 'Other', label: 'Something else' },
  ];

  const submitReport = (e: React.FormEvent) => {
    e.preventDefault();
    setReportError(null);
    if (!reportUser.trim()) {
      setReportError('Enter the username of the person you\'re reporting.');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setReported(true);
    }, 700);
  };

  return (
    <div className="px-4 pt-4 pb-4">
      <header className="flex items-center justify-between mb-4">
        <Link href="/app/settings" className="p-2 -ml-2 rounded-full hover:bg-surface-overlay text-white/80"><ArrowLeftIcon /></Link>
        <h1 className="font-bold text-lg">Safety</h1>
        <div className="w-10" />
      </header>

      <Card className="p-4 mb-4 flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-brand-600/15 text-brand-300 flex items-center justify-center shrink-0"><ShieldIcon size={20} /></div>
        <div>
          <h3 className="font-semibold">Safety Tips</h3>
          <ul className="text-sm text-white/60 mt-1.5 space-y-1.5 list-disc pl-4">
            <li>Never share financial or personal details</li>
            <li>Keep conversations on VUZKI</li>
            <li>Trust your instincts — end chats that feel off</li>
            <li>Meet in public places if you choose to meet</li>
          </ul>
        </div>
      </Card>

      <Card className="p-4 mb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-11 w-11 rounded-xl bg-surface-overlay text-white/70 flex items-center justify-center shrink-0"><FlagIcon size={20} /></div>
          <h3 className="font-semibold">Report a User</h3>
        </div>

        {reported ? (
          <div className="text-center py-6">
            <div className="h-12 w-12 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center mx-auto mb-3 text-2xl">✓</div>
            <p className="font-semibold">Report submitted</p>
            <p className="text-sm text-white/50 mt-1">Thanks for helping keep VUZKI safe. Our team will review it shortly.</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => { setReported(false); setReportUser(''); setReportDetails(''); }}>
              Report another
            </Button>
          </div>
        ) : reporting ? (
          <form onSubmit={submitReport} className="mt-3 space-y-3">
            <Input label="Username to report" placeholder="@username" value={reportUser} onChange={(e) => setReportUser(e.target.value)} />
            <Select label="Reason" options={reasonOptions} value={reportReason} onChange={(e) => setReportReason(e.target.value)} />
            <TextArea label="Details (optional)" rows={3} placeholder="Tell us what happened…" value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} />
            {reportError && <p className="text-sm text-red-400">{reportError}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setReporting(false)}>Cancel</Button>
              <Button type="submit" variant="danger" loading={submitting} className="flex-1">Submit report</Button>
            </div>
          </form>
        ) : (
          <Button variant="danger" size="sm" className="mt-3" onClick={() => setReporting(true)}>Start a report</Button>
        )}
      </Card>

      <Card className="divide-y divide-surface-border mb-4 overflow-hidden">
        <InfoRow icon={<LockIcon size={18} />} title="Block & Report" subtitle="Block unwanted users and report abuse" href="/app/settings/blocked" />
        <InfoRow icon={<DocumentIcon size={18} />} title="Community Guidelines" subtitle="Read our rules for the community" />
        <InfoRow icon={<ShieldIcon size={18} />} title="Help & Emergency" subtitle="Support resources and hotlines" />
        <InfoRow icon={<DocumentIcon size={18} />} title="Trust & Safety Resources" subtitle="Learn how we protect you" />
      </Card>
    </div>
  );
}

function InfoRow({ icon, title, subtitle, href }: { icon: React.ReactNode; title: string; subtitle: string; href?: string }) {
  const content = (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="h-10 w-10 rounded-xl bg-surface-overlay text-brand-300 flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-white/50 truncate">{subtitle}</p>
      </div>
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
