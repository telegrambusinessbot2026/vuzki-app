'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeftIcon, BellIcon, CoinIcon, GiftIcon, HeartIcon, MicIcon, PhoneIcon, RefreshIcon, UserIcon } from '@/components/ui/Icons';
import { api, post } from '@/lib/api';

interface Noti {
  id: string;
  type: string;
  title: string;
  body?: string;
  isRead: boolean;
  createdAt: string;
}

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  like: { icon: <HeartIcon size={17} />, color: 'bg-pink-500/15 text-pink-400' },
  gift: { icon: <GiftIcon size={17} />, color: 'bg-brand-600/20 text-brand-400' },
  match: { icon: <UserIcon size={17} />, color: 'bg-purple-500/15 text-purple-400' },
  call: { icon: <PhoneIcon size={17} />, color: 'bg-blue-500/15 text-blue-400' },
  follow: { icon: <UserIcon size={17} />, color: 'bg-amber-500/15 text-amber-400' },
  coins: { icon: <CoinIcon size={17} />, color: 'bg-amber-500/15 text-amber-400' },
  creator: { icon: <MicIcon size={17} />, color: 'bg-brand-600/20 text-brand-400' },
};

const TYPE_ALIAS: Record<string, string> = {
  LIKE: 'like',
  SUPER_LIKE: 'like',
  GIFT: 'gift',
  MATCH: 'match',
  INCOMING_CALL: 'call',
  MISSED_CALL: 'call',
  CREATOR_CALL: 'call',
  COIN_PURCHASE: 'coins',
  SUBSCRIPTION: 'coins',
  WITHDRAWAL: 'coins',
};

const iconKey = (type: string) => TYPE_ALIAS[type] || 'like';

const sections: { key: string; label: string }[] = [
  { key: 'Today', label: 'Today' },
  { key: 'Yesterday', label: 'Yesterday' },
  { key: 'Earlier', label: 'Earlier' },
];

function dayKey(iso: string): string {
  const d = new Date(iso);
  const t = new Date();
  const startToday = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  const startDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.floor((startToday - startDay) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return 'Earlier';
}

function relTime(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Noti[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api<{ items: Noti[] }>('/notifications', { auth: true })
      .then((data) => {
        if (!cancelled) setItems(data.items ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Could not load notifications');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = (key: string) => items.filter((n) => dayKey(n.createdAt) === key);

  const markAllRead = async () => {
    setItems((list) => list.map((n) => ({ ...n, isRead: true })));
    try {
      await post('/notifications/read-all');
    } catch {
      /* ignore */
    }
  };
  const markOne = async (id: string) => {
    setItems((list) => list.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await post('/notifications/read', { ids: [id] });
    } catch {
      /* ignore */
    }
  };
  const unread = items.filter((n) => !n.isRead).length;

  return (
    <div className="px-4 pt-4 pb-4">
      <header className="flex items-center justify-between mb-4">
        <Link href="/app/home" className="p-2 -ml-2 rounded-full hover:bg-surface-overlay text-white/80"><ArrowLeftIcon /></Link>
        <h1 className="font-bold text-lg">Notifications</h1>
        <button
          onClick={markAllRead}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-surface-overlay border border-surface-border text-white/70 text-xs hover:text-white"
        >
          <RefreshIcon size={13} /> Mark all read
        </button>
      </header>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
      {loading && <p className="text-center text-sm text-white/40 py-10">Loading notifications…</p>}

      {unread > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="flex items-center gap-1 text-xs text-white/50"><BellIcon size={13} /> {unread} new</span>
        </div>
      )}

      {sections.map((sec) => {
        const list = grouped(sec.key);
        if (list.length === 0) return null;
        return (
          <section key={sec.key} className="mb-5">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">{sec.label}</h2>
            <Card className="divide-y divide-surface-border">
              {list.map((n) => {
                const cfg = typeConfig[iconKey(n.type)] || typeConfig.like;
                return (
                  <button
                    key={n.id}
                    onClick={() => markOne(n.id)}
                    className={`flex items-center gap-3 p-3.5 text-left w-full ${n.isRead ? '' : 'bg-brand-600/5'}`}
                  >
                    <div className={`relative h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.color}`}>
                      {cfg.icon}
                      {!n.isRead && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-pink-500 border-2 border-surface" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${n.isRead ? 'text-white/70' : 'font-medium text-white'}`}>{n.title}</p>
                      <p className="text-xs text-white/40 mt-0.5">{relTime(n.createdAt)}</p>
                    </div>
                    {!n.isRead && <span className="h-2 w-2 rounded-full bg-brand-500 shrink-0" />}
                  </button>
                );
              })}
            </Card>
          </section>
        );
      })}
    </div>
  );
}
