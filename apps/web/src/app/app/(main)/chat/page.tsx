'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useRealtime } from '@/lib/realtime-context';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Button';
import { SearchIcon, VideoIcon } from '@/components/ui/Icons';

interface ChatUser {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  isVerified: boolean;
  isCreator: boolean;
  premiumTier: string;
}

interface ChatConversation {
  id: string;
  otherUser: ChatUser;
  lastMessage: { id: string; type: string; content: string; mediaUrl: string | null; createdAt: string; status: string; isMine: boolean } | null;
  unreadCount: number;
  updatedAt: string;
}

function timeAgo(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

function preview(msg: ChatConversation['lastMessage']): string {
  if (!msg) return '';
  if (msg.type === 'IMAGE') return '📷 Photo';
  if (msg.type === 'VOICE') return '🎤 Voice message';
  if (msg.type === 'GIFT') return '🎁 Sent a gift';
  return msg.content;
}

export default function ChatPage() {
  const { connected, on, presence } = useRealtime();
  const [filter, setFilter] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: ChatConversation[] }>('/chat/conversations', { auth: true });
      setConversations(data.items ?? []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!on) return;
    const off = on('message:received', () => load());
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, connected]);

  const isOnline = (u: ChatUser) => (presence[u.id] ? presence[u.id] !== 'OFFLINE' : false);

  const unreadTotal = conversations.reduce((a, c) => a + c.unreadCount, 0);

  const filtered = conversations.filter((c) => {
    if (filter === 'online' && !isOnline(c.otherUser)) return false;
    if (filter === 'unread' && c.unreadCount <= 0) return false;
    if (query && !c.otherUser.displayName.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="px-4 pt-4 pb-4">
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Messages</h1>
          {unreadTotal > 0 && (
            <span className="h-5 min-w-5 px-1.5 rounded-full bg-pink-500 text-[10px] font-bold flex items-center justify-center">
              {unreadTotal}
            </span>
          )}
          {!connected && <span className="h-2 w-2 rounded-full bg-white/30" />}
        </div>
        <Link href="/app/discover" className="p-2 rounded-full bg-surface-overlay border border-surface-border text-white/70 hover:text-white" aria-label="Start chat">
          <VideoIcon size={20} />
        </Link>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        {[
          { key: 'all', label: 'All' },
          { key: 'online', label: 'Online' },
          { key: 'unread', label: 'Unread' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filter === t.key ? 'bg-brand-600 text-white shadow-glow' : 'bg-surface-overlay text-white/60 border border-surface-border'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
          <SearchIcon size={18} />
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations"
          className="w-full h-11 pl-10 pr-4 bg-surface-overlay rounded-xl border border-surface-border text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Conversation list */}
      <div className="space-y-1">
        {loading && !error && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Spinner className="h-6 w-6 text-white/40" />
            <p className="text-sm text-white/40">Loading conversations…</p>
          </div>
        )}
        {!loading && error && (
          <div className="text-center py-12">
            <p className="font-semibold text-white/80 mb-1">Can&apos;t reach the server</p>
            <p className="text-sm text-white/40 mb-4">Check that the backend is running, then try again.</p>
            <button
              onClick={() => { setLoading(true); load(); }}
              className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold"
            >
              Retry
            </button>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-center text-white/40 text-sm py-12">No conversations found</p>
        )}
        {filtered.map((c) => (
          <Link
            key={c.id}
            href={`/app/chat/${c.otherUser.id}`}
            className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-surface-raised transition-colors"
          >
            <Avatar src={c.otherUser.avatarUrl} name={c.otherUser.displayName} size="lg" online={isOnline(c.otherUser)} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm truncate">{c.otherUser.displayName}</span>
                <span className="text-[10px] text-white/40 shrink-0">{timeAgo(c.updatedAt)}</span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className={`text-xs truncate ${c.unreadCount > 0 ? 'text-white font-medium' : 'text-white/50'}`}>
                  {preview(c.lastMessage)}
                </span>
                {c.unreadCount > 0 && (
                  <span className="h-5 min-w-5 px-1.5 rounded-full bg-brand-600 text-[10px] font-bold flex items-center justify-center shrink-0 ml-2">
                    {c.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
