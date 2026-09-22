'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useRealtime } from '@/lib/realtime-context';
import { Avatar, VerifiedIcon } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Button';
import { SearchIcon, VideoIcon, PhoneIcon } from '@/components/ui/Icons';

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

interface CallHistoryItem {
  id: string;
  other: { id: string; displayName: string; username: string; avatarUrl: string | null; isVerified: boolean };
  type: 'AUDIO' | 'VIDEO';
  status: string;
  role: 'CALLER' | 'RECEIVER';
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  costCoins: number;
}

function timeAgo(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(iso).toLocaleDateString();
}

function callTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
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
  const [tab, setTab] = useState<'chats' | 'calls' | 'requests'>('chats');
  const [callFilter, setCallFilter] = useState<'all' | 'missed' | 'incoming' | 'outgoing'>('all');
  
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [calls, setCalls] = useState<CallHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChats = useCallback(async () => {
    try {
      const data = await api<{ items: ChatConversation[] }>('/chat/conversations', { auth: true });
      setConversations(data.items ?? []);
    } catch {}
  }, []);

  const loadCalls = useCallback(async () => {
    try {
      const data = await api<{ items: CallHistoryItem[] }>('/calls/history', { auth: true });
      setCalls(data.items ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    loadChats();
    loadCalls();
    setLoading(false);
  }, [loadChats, loadCalls]);

  useEffect(() => {
    if (!on) return;
    const off = on('message:received', () => loadChats());
    return off;
  }, [on, connected, loadChats]);

  const isOnline = (id: string) => (presence[id] ? presence[id] !== 'OFFLINE' : false);

  const filteredCalls = calls.filter(c => {
    if (callFilter === 'missed') return c.status === 'MISSED' || c.status === 'REJECTED' || c.status === 'CANCELLED';
    if (callFilter === 'incoming') return c.role === 'RECEIVER';
    if (callFilter === 'outgoing') return c.role === 'CALLER';
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] min-h-dvh">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-6 pb-2">
        <div className="flex items-center gap-2">
          <div className="text-[#FF4DBD]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </div>
          <span className="text-xl font-bold tracking-tight">VUZKI</span>
        </div>
        <div className="flex items-center gap-4 text-white/90">
          {tab === 'chats' ? (
            <>
              <SearchIcon size={24} />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex px-4 gap-6 border-b border-white/10 mb-2 mt-4">
        {(['chats', 'calls', 'requests'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 text-[15px] font-semibold transition-colors relative ${tab === t ? 'text-white' : 'text-white/50'}`}
          >
            {t === 'chats' ? 'Chats' : t === 'calls' ? 'Calls' : 'Requests (3)'}
            {tab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF4DBD] rounded-t-full" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'chats' && (
          <div className="px-4 py-2 space-y-4">
            {conversations.map(c => (
              <Link key={c.id} href={`/app/chat/${c.otherUser.id}`} className="flex items-center gap-3">
                <div className="relative">
                  <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#FF4DBD] to-[#A855F7]">
                    <Avatar src={c.otherUser.avatarUrl} name={c.otherUser.displayName} size="lg" className="border-2 border-[#0a0a0c]" />
                  </div>
                  {isOnline(c.otherUser.id) && (
                    <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0a0a0c]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-base truncate">{c.otherUser.displayName}</span>
                      {c.otherUser.isVerified && <VerifiedIcon size={14} />}
                    </div>
                    <span className="text-xs text-white/40 shrink-0">{timeAgo(c.updatedAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm truncate ${c.unreadCount > 0 ? 'text-white font-medium' : 'text-white/50'}`}>
                      {preview(c.lastMessage)}
                    </span>
                    {c.unreadCount > 0 && (
                      <span className="h-5 min-w-5 px-1.5 rounded-full bg-[#FF4DBD] text-[11px] font-bold flex items-center justify-center shrink-0 ml-2">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {tab === 'calls' && (
          <div className="px-4 py-2 flex flex-col h-full">
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar">
              {['all', 'missed', 'incoming', 'outgoing'].map(f => (
                <button
                  key={f}
                  onClick={() => setCallFilter(f as any)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${callFilter === f ? 'bg-[#FF4DBD] text-white' : 'bg-white/5 text-white/70'}`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <div className="space-y-4 flex-1">
              {filteredCalls.map(c => {
                const missed = c.status === 'MISSED' || c.status === 'REJECTED' || c.status === 'CANCELLED';
                const incoming = c.role === 'RECEIVER';
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#FF4DBD] to-[#A855F7]">
                      <Avatar src={c.other.avatarUrl} name={c.other.displayName} size="lg" className="border-2 border-[#0a0a0c]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-base truncate">{c.other.displayName}</span>
                          {c.other.isVerified && <VerifiedIcon size={14} />}
                        </div>
                        <span className="text-xs text-white/40 shrink-0">{callTime(c.startedAt)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-white/50">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={missed ? '#ef4444' : '#22c55e'} strokeWidth="2" className={incoming ? 'rotate-45' : '-rotate-45'}>
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                        <span>{incoming ? 'Incoming' : 'Outgoing'}</span>
                        {c.durationSeconds > 0 && <span>· {Math.floor(c.durationSeconds / 60)}m</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <button className="w-10 h-10 rounded-full bg-[#FF4DBD]/10 text-[#FF4DBD] flex items-center justify-center">
                        {c.type === 'VIDEO' ? <VideoIcon size={18} /> : <PhoneIcon size={18} />}
                      </button>
                      <button className="text-white/40">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 mb-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-amber-500">Go Premium</h4>
                <p className="text-xs text-amber-500/80">Unlimited video calls</p>
              </div>
              <button className="px-4 py-2 bg-amber-500 text-black text-sm font-bold rounded-full">
                Upgrade
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
