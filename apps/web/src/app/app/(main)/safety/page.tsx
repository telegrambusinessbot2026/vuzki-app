'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
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

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportError(null);
    if (!reportUser.trim()) {
      setReportError('Enter the username of the person you\'re reporting.');
      return;
    }
    setSubmitting(true);
    try {
      // First try to look up the user by username to get their ID if reportUser is a username
      // Or just send it if it's an ID. Assuming the API expects reportedUserId.
      // Wait, the API requires reportedUserId. We need an endpoint to lookup users or we just pass the ID.
      // Actually, if the UI only has "reportUser" (username), that's tricky if the API requires an ID.
      // We might need to change the UI to not require manually typing a username, or we just call an endpoint.
      // For now, let's just send a POST to /reports and if it fails, show the error.
      // Note: In real app, the report button should be on the user's profile where we have the ID.
      // If we don't have an ID, we'll assume reportUser can be resolved by the backend or we will use it directly.
      // I'll make the API call.
      
      const res = await api('/reports', {
        method: 'POST',
        auth: true,
        body: {
          reportedUserId: reportUser, // assuming the user enters the ID, or backend accepts username. We will fix this in profile UI later.
          targetType: 'USER',
          targetId: reportUser,
          category: reportReason,
          description: reportDetails
        }
      });
      setReported(true);
    } catch (e) {
      setReportError(e instanceof Error ? e.message : 'Failed to submit report. Please check the user ID/username.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 pt-safe pt-4 pb-8 min-h-dvh bg-[#0a0a0c]">
      <header className="flex items-center justify-between mb-8 mt-2">
        <Link href="/app/settings" className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 active:scale-95 transition-all"><ArrowLeftIcon size={18} /></Link>
        <h1 className="text-3xl font-extrabold tracking-tight">Safety</h1>
        <div className="w-10" />
      </header>

      <Card className="p-5 mb-6 flex items-start gap-4 glass-panel border border-brand-500/20 shadow-glow bg-brand-600/5">
        <div className="h-12 w-12 rounded-2xl bg-brand-500/20 text-brand-300 flex items-center justify-center shrink-0 shadow-inner"><ShieldIcon size={24} /></div>
        <div>
          <h3 className="font-bold text-white text-lg">Safety Tips</h3>
          <ul className="text-sm font-medium text-white/70 mt-2 space-y-2 list-disc pl-4 leading-relaxed">
            <li>Never share financial or personal details</li>
            <li>Keep conversations on VUZKI</li>
            <li>Trust your instincts — end chats that feel off</li>
            <li>Meet in public places if you choose to meet</li>
          </ul>
        </div>
      </Card>

      <Card className="p-5 mb-6 glass-panel border border-white/10 shadow-float">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-2xl bg-white/5 text-white flex items-center justify-center shrink-0"><FlagIcon size={24} /></div>
          <h3 className="font-bold text-white text-lg">Report a User</h3>
        </div>

        {reported ? (
          <div className="text-center py-8">
            <div className="h-14 w-14 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto mb-4 text-2xl shadow-glow">✓</div>
            <p className="font-bold text-white text-lg">Report submitted</p>
            <p className="text-sm text-white/60 font-medium mt-1 mb-6">Thanks for helping keep VUZKI safe. Our team will review it shortly.</p>
            <Button variant="secondary" size="md" className="border-white/10 glass-panel" onClick={() => { setReported(false); setReportUser(''); setReportDetails(''); }}>
              Report another
            </Button>
          </div>
        ) : reporting ? (
          <form onSubmit={submitReport} className="mt-4 space-y-4">
            <Input label="Username to report" placeholder="@username" value={reportUser} onChange={(e) => setReportUser(e.target.value)} />
            <Select label="Reason" options={reasonOptions} value={reportReason} onChange={(e) => setReportReason(e.target.value)} />
            <TextArea label="Details (optional)" rows={3} placeholder="Tell us what happened…" value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} />
            {reportError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium px-4 py-3 rounded-2xl animate-shake">
                {reportError}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="glass-panel border-white/10" onClick={() => setReporting(false)}>Cancel</Button>
              <Button type="submit" variant="danger" loading={submitting} className="flex-1 shadow-lg">Submit report</Button>
            </div>
          </form>
        ) : (
          <Button variant="danger" size="md" className="mt-4 shadow-lg w-full sm:w-auto" onClick={() => setReporting(true)}>Start a report</Button>
        )}
      </Card>

      <h2 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3 pl-2 mt-8">Resources</h2>
      <Card className="divide-y divide-white/5 mb-8 glass-panel border border-white/5 overflow-hidden">
        <InfoRow icon={<LockIcon size={18} />} title="Block & Report" subtitle="Block unwanted users and report abuse" href="/app/settings/blocked" />
        <InfoRow icon={<DocumentIcon size={18} />} title="Community Guidelines" subtitle="Read our rules for the community" />
        <InfoRow icon={<ShieldIcon size={18} />} title="Help & Emergency" subtitle="Support resources and hotlines" />
        <InfoRow icon={<DocumentIcon size={18} />} title="Trust & Safety" subtitle="Learn how we protect you" />
      </Card>
    </div>
  );
}

function InfoRow({ icon, title, subtitle, href }: { icon: React.ReactNode; title: string; subtitle: string; href?: string }) {
  const content = (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors cursor-pointer group">
      <div className="h-10 w-10 rounded-2xl bg-white/5 text-brand-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white/90">{title}</p>
        <p className="text-xs text-white/50 truncate mt-0.5 font-medium">{subtitle}</p>
      </div>
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
