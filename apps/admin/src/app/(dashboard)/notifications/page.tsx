'use client';

import { useState } from 'react';
import { post } from '@/lib/api';
import { Card, PageHeader, Toggle, Button, Toast, Badge } from '@/components/ui';
import { Bell, Send } from '@/components/icons';

const CHANNELS = [
  { id: 'cc', name: 'Community Chat' },
  { id: 'video', name: 'Video Calls' },
  { id: 'audio', name: 'Audio Calls' },
  { id: 'live', name: 'Live Rooms' },
  { id: 'gifts', name: 'Gifts' },
  { id: 'strangers', name: 'Random Matches' },
];

export default function NotificationsPage() {
  const [channels, setChannels] = useState(() => CHANNELS.map((c) => ({ ...c, active: true })));
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [userId, setUserId] = useState('');
  const [type, setType] = useState('SYSTEM');
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const toggleChannel = (id: string) => {
    setChannels((cs) => cs.map((c) => (c.id === id ? { ...c, active: !c.active } : c)));
  };

  const canSend = Boolean(userId.trim()) && Boolean(title.trim()) && Boolean(message.trim());

  const send = async () => {
    if (!canSend) return;
    try {
      await post('/admin/notify', { userId: userId.trim(), title, body: message, type });
      setTitle('');
      setMessage('');
      setUserId('');
      setType('SYSTEM');
      setToast('Notification sent');
      setToastType('success');
    } catch (e: any) {
      setToast(e?.message || 'Failed to send notification');
      setToastType('error');
    }
  };

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Push & in-app notification channels and broadcasts" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-1 font-semibold">Notification channels</h3>
          <p className="mb-4 text-xs text-white/40">UI preview only — channel preferences are stored on-device, not on the server</p>
          <div className="divide-y divide-[#2a2a37]/60">
            {channels.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-white/40">
                    {c.active ? 'Enabled' : 'Disabled'} · id: {c.id}
                  </p>
                </div>
                <Toggle checked={c.active} onChange={() => toggleChannel(c.id)} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-xl bg-brand-500/15 p-2.5 text-brand-300">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Send notification</h3>
              <p className="text-xs text-white/40">Deliver a push notification to a single user</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">User ID</label>
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Recipient user id"
                className="w-full rounded-lg border border-[#2a2a37] bg-[#111118] px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-brand-500/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New creator features are live"
                className="w-full rounded-lg border border-[#2a2a37] bg-[#111118] px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-brand-500/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Message body…"
                className="w-full resize-none rounded-lg border border-[#2a2a37] bg-[#111118] px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-brand-500/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border border-[#2a2a37] bg-[#111118] px-3 py-2 text-sm text-white outline-none focus:border-brand-500/50"
              >
                <option value="SYSTEM">System</option>
                <option value="PROMO">Promotional</option>
                <option value="MODERATION">Moderation</option>
              </select>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-[#111118] px-3 py-2 text-xs text-white/40">
              <span>Recipient</span>
              <Badge color="brand">{userId.trim() || '—'}</Badge>
            </div>

            <div className="flex justify-end">
              <Button onClick={send} disabled={!canSend}>
                <Send className="h-4 w-4" /> Send notification
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {toast && <Toast message={toast} type={toastType} />}
    </div>
  );
}