'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, post } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, TextArea, Select } from '@/components/ui/Input';
import { ArrowLeftIcon, ShieldIcon, DocumentIcon, LockIcon } from '@/components/ui/Icons';

interface AppealItem {
  id: string;
  restrictionType: string;
  reason: string;
  message: string | null;
  status: string;
  reviewNote: string | null;
  createdAt: string;
  decidedAt: string | null;
}

const CATEGORIES = [
  { value: 'ACCOUNT_HELP', label: 'Account & Login Issue' },
  { value: 'PAYMENT_HELP', label: 'Billing, Coins & Payments' },
  { value: 'CALL_ISSUE', label: 'Audio & Video Call Quality' },
  { value: 'SAFETY_COMPLAINT', label: 'Safety, Harassment or Abuse' },
  { value: 'CREATOR_KYC', label: 'Creator Verification & Earnings' },
  { value: 'BUG_REPORT', label: 'Technical Bug or Glitch' },
  { value: 'OTHER', label: 'General Inquiry / Feedback' },
];

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<'NEW' | 'HISTORY' | 'FAQS'>('NEW');
  const [tickets, setTickets] = useState<AppealItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState('ACCOUNT_HELP');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submittedTicket, setSubmittedTicket] = useState<AppealItem | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await api<{ appeals: AppealItem[] }>('/users/me/appeals', { auth: true });
      setTickets(res.appeals || []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'HISTORY') {
      fetchTickets();
    }
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!message.trim()) {
      setError('Please provide details for your support request.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await post<AppealItem>('/users/me/appeals', {
        restrictionType: category,
        reason: subject.trim() || category,
        message: message.trim(),
      });
      setSubmittedTicket(res);
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setError(err?.message || 'Failed to submit support ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
      case 'PENDING':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">Under Review</span>;
      case 'APPROVED':
      case 'REDUCED':
      case 'RESOLVED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">Resolved</span>;
      case 'REJECTED':
      case 'UPHELD':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">Closed</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 text-white/70">{status}</span>;
    }
  };

  return (
    <div className="px-4 pt-safe pt-4 pb-12 min-h-dvh bg-[#0a0a0c] text-white max-w-2xl mx-auto">
      <header className="flex items-center justify-between mb-6 mt-2">
        <Link
          href="/app/settings"
          className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 active:scale-95 transition-all"
        >
          <ArrowLeftIcon size={18} />
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">Help Center & Support</h1>
        <div className="w-10" />
      </header>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-white/5 p-1 mb-6 border border-white/5">
        <button
          type="button"
          onClick={() => { setActiveTab('NEW'); setSubmittedTicket(null); }}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'NEW' ? 'bg-[#FF2D8F] text-white shadow-glow' : 'text-white/60 hover:text-white'
          }`}
        >
          New Request
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('HISTORY')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'HISTORY' ? 'bg-[#FF2D8F] text-white shadow-glow' : 'text-white/60 hover:text-white'
          }`}
        >
          My Tickets
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('FAQS')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'FAQS' ? 'bg-[#FF2D8F] text-white shadow-glow' : 'text-white/60 hover:text-white'
          }`}
        >
          Help Topics
        </button>
      </div>

      {activeTab === 'NEW' && (
        <>
          {submittedTicket ? (
            <Card className="p-8 text-center glass-panel border border-green-500/30 bg-green-500/5 shadow-float">
              <div className="h-16 w-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto mb-4 text-3xl shadow-glow">
                ✓
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Ticket Submitted Successfully</h3>
              <p className="text-sm text-white/70 max-w-md mx-auto mb-4 leading-relaxed">
                Your ticket has been recorded with Ticket ID <span className="font-mono text-white font-semibold">#{submittedTicket.id.slice(-6)}</span>.
                Our 24/7 Trust & Support team will review your case and update your status.
              </p>
              <div className="flex gap-3 justify-center pt-2">
                <Button
                  variant="secondary"
                  size="md"
                  className="glass-panel border-white/10"
                  onClick={() => setSubmittedTicket(null)}
                >
                  Submit Another
                </Button>
                <Button
                  size="md"
                  className="bg-brand-gradient text-white shadow-glow font-bold"
                  onClick={() => setActiveTab('HISTORY')}
                >
                  View My Tickets
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-6 glass-panel border border-white/10 shadow-float">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-2xl bg-[#FF2D8F]/15 text-[#FF2D8F] flex items-center justify-center shrink-0">
                  <ShieldIcon size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">How can we help?</h3>
                  <p className="text-xs text-white/50 font-medium">Select a topic and submit your question or complaint.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                  label="Category"
                  options={CATEGORIES}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />

                <Input
                  label="Subject (optional)"
                  placeholder="e.g. Question regarding recent coin purchase"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />

                <TextArea
                  label="Description & Details"
                  rows={4}
                  placeholder="Please describe what happened, including relevant dates or usernames..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium px-4 py-3 rounded-2xl">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  loading={submitting}
                  className="w-full h-12 bg-gradient-to-r from-[#FF2D8F] to-[#855CF6] text-white font-bold shadow-glow mt-4"
                >
                  Submit Support Ticket
                </Button>
              </form>
            </Card>
          )}
        </>
      )}

      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          {loading ? (
            <p className="text-center text-sm text-white/50 py-12">Loading your tickets...</p>
          ) : tickets.length === 0 ? (
            <Card className="p-10 text-center glass-panel border border-white/5 shadow-float">
              <div className="h-14 w-14 rounded-full bg-white/5 text-white/30 flex items-center justify-center mx-auto mb-4 text-2xl">
                ✓
              </div>
              <p className="font-bold text-lg text-white/90">No open tickets</p>
              <p className="text-sm font-medium text-white/50 mt-1 mb-6">You haven&apos;t submitted any support requests yet.</p>
              <Button
                size="md"
                className="bg-brand-gradient text-white font-bold shadow-glow"
                onClick={() => setActiveTab('NEW')}
              >
                Create a Ticket
              </Button>
            </Card>
          ) : (
            tickets.map((t) => (
              <Card key={t.id} className="p-5 glass-panel border border-white/10 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-white/40">#{t.id.slice(-6)}</span>
                  {getStatusBadge(t.status)}
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">{t.reason || t.restrictionType}</h4>
                  {t.message && <p className="text-sm text-white/70 mt-1 leading-relaxed">{t.message}</p>}
                </div>
                {t.reviewNote && (
                  <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-sm text-brand-200">
                    <span className="font-bold block text-xs uppercase tracking-wider mb-1 text-brand-300">Support Response:</span>
                    {t.reviewNote}
                  </div>
                )}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
                  <span>Category: {t.restrictionType}</span>
                  <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'FAQS' && (
        <div className="space-y-4">
          <Card className="p-5 glass-panel border border-white/5 space-y-4">
            <h3 className="font-bold text-white text-base">Quick Help Resources</h3>
            <div className="divide-y divide-white/5">
              <Link href="/app/safety" className="py-3 flex items-center justify-between text-sm text-white/80 hover:text-white">
                <span>Report Abuse or Inappropriate Behavior</span>
                <span className="text-white/40">&rarr;</span>
              </Link>
              <Link href="/app/settings/blocked" className="py-3 flex items-center justify-between text-sm text-white/80 hover:text-white">
                <span>Manage Blocked Users</span>
                <span className="text-white/40">&rarr;</span>
              </Link>
              <Link href="/safety" className="py-3 flex items-center justify-between text-sm text-white/80 hover:text-white">
                <span>Community Safety Guidelines</span>
                <span className="text-white/40">&rarr;</span>
              </Link>
              <Link href="/privacy" className="py-3 flex items-center justify-between text-sm text-white/80 hover:text-white">
                <span>Privacy Policy & Data Security</span>
                <span className="text-white/40">&rarr;</span>
              </Link>
              <Link href="/terms" className="py-3 flex items-center justify-between text-sm text-white/80 hover:text-white">
                <span>Terms of Service & Virtual Currency</span>
                <span className="text-white/40">&rarr;</span>
              </Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
