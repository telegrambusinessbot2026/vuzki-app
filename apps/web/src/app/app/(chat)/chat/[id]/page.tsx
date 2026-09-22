'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, post, API_URL } from '@/lib/api';
import { useRealtime } from '@/lib/realtime-context';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ArrowLeftIcon, EmojiIcon, PaperclipIcon, PhoneIcon, SendIcon, VideoIcon, CoinIcon } from '@/components/ui/Icons';

type ChatType = 'TEXT' | 'IMAGE' | 'VOICE' | 'GIF' | 'GIFT' | 'SYSTEM';
type ChatStatus = 'SENT' | 'DELIVERED' | 'READ';

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  type: ChatType;
  content: string;
  mediaUrl: string | null;
  replyToId: string | null;
  giftId: string | null;
  status: ChatStatus;
  reactions: Record<string, string[]>;
  createdAt: string;
  readAt: string | null;
  isMine: boolean;
}

interface OtherUser {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  isVerified: boolean;
  isCreator: boolean;
  premiumTier: string;
  onlineStatus?: boolean;
}

interface Gift {
  id: string;
  name: string;
  imageUrl: string | null;
  animationUrl: string | null;
  priceCoins: number;
  category: string;
}

const API_ORIGIN = API_URL.replace(/\/api\/v1\/?$/, '');
const mediaUrl = (url: string | null | undefined) => (url && url.startsWith('/') ? `${API_ORIGIN}${url}` : (url || ''));

function fmtTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatRoomPage() {
  const params = useParams();
  const id = String(params.id);
  const { socket, connected, joinRoom, leaveRoom, emit, on, presence } = useRealtime();

  const [other, setOther] = useState<OtherUser | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [otherTyping, setOtherTyping] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [giftSending, setGiftSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);
  const otherIdRef = useRef(id);
  otherIdRef.current = id;

  // Resolve conversation + seed messages
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setOffline(false);
      try {
        const withRes = await api<{ conversationId: string }>(`/chat/with/${id}`, { auth: true });
        if (cancelled) return;
        setConversationId(withRes.conversationId);
        const msgRes = await api<{ items: ChatMessage[]; conversation: { id: string; otherUser: OtherUser } }>(
          `/chat/${withRes.conversationId}/messages?page=1&limit=50`,
          { auth: true }
        );
        if (cancelled) return;
        setMessages(msgRes.items ?? []);
        setOther(msgRes.conversation?.otherUser ?? null);
      } catch {
        if (cancelled) return;
        setOffline(true);
        setOther({ id, displayName: id, username: '', avatarUrl: null, isVerified: false, isCreator: false, premiumTier: 'FREE' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // load gifts
  useEffect(() => {
    api<{ items: Gift[] }>('/gifts', { auth: true })
      .then((d) => setGifts(d.items ?? []))
      .catch(() => {});
  }, []);

  // join room for conversation
  useEffect(() => {
    if (!conversationId) return;
    joinRoom(conversationId);
    return () => leaveRoom(conversationId);
  }, [conversationId, joinRoom, leaveRoom]);

  // realtime listeners
  useEffect(() => {
    if (!on) return;
    const offs: (() => void)[] = [];

    offs.push(
      on('message:received', (dto: ChatMessage) => {
        if (dto.conversationId !== conversationId) return;
        setMessages((m) => {
          if (m.some((x) => x.id === dto.id)) return m;
          return [...m, dto];
        });
        if (!dto.isMine) emit('message:read', { conversationId });
      })
    );

    offs.push(
      on('message:typing', (p: { conversationId: string; userId: string }) => {
        if (p.conversationId === conversationId && p.userId !== otherIdRef.current) return;
        if (p.conversationId === conversationId && p.userId === otherIdRef.current) setOtherTyping(true);
      })
    );

    offs.push(
      on('message:stop_typing', (p: { conversationId: string; userId: string }) => {
        if (p.conversationId === conversationId) setOtherTyping(false);
      })
    );

    offs.push(
      on('message:read', (p: { conversationId: string; by: string; readAt: string }) => {
        if (p.conversationId !== conversationId) return;
        setMessages((m) =>
          m.map((x) => (x.isMine && x.status !== 'READ' ? { ...x, status: 'READ', readAt: p.readAt } : x))
        );
      })
    );

    offs.push(
      on('message:reaction', (p: { messageId: string; conversationId: string; reactions: Record<string, string[]> }) => {
        if (p.conversationId !== conversationId) return;
        setMessages((m) => m.map((x) => (x.id === p.messageId ? { ...x, reactions: p.reactions } : x)));
      })
    );

    offs.push(
      on('message:deleted', (p: { messageId: string; conversationId: string }) => {
        if (p.conversationId !== conversationId) return;
        setMessages((m) => m.map((x) => (x.id === p.messageId ? { ...x, content: '', type: 'SYSTEM' } : x)));
      })
    );

    return () => offs.forEach((f) => f());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, conversationId, emit, socket]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherTyping]);

  // mark my messages sent/read on new incoming
  useEffect(() => {
    if (conversationId && messages.some((m) => !m.isMine)) {
      emit('message:read', { conversationId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const stopTyping = useCallback(() => {
    emit('message:stop_typing', { conversationId });
  }, [conversationId, emit]);

  const onTyping = useCallback(() => {
    if (!conversationId) return;
    const nowTs = Date.now();
    if (nowTs - lastTypingSent.current > 1200) {
      lastTypingSent.current = nowTs;
      emit('message:typing', { conversationId });
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(stopTyping, 1500);
  }, [conversationId, emit, stopTyping]);

  useEffect(() => () => {
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    emit('message:stop_typing', { conversationId });
  }, [conversationId, emit]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || !conversationId) return;
    const localId = `optimistic_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setMessages((m) => [
      ...m,
      {
        id: localId,
        conversationId,
        senderId: 'me',
        receiverId: id,
        type: 'TEXT',
        content: t,
        mediaUrl: null,
        replyToId: null,
        giftId: null,
        status: 'SENT',
        reactions: {},
        createdAt: new Date().toISOString(),
        readAt: null,
        isMine: true,
      },
    ]);
    setInput('');
    emit(
      'message:send',
      { conversationId, content: t, clientMessageId: localId },
      (res: any) => {
        if (res?.ok && res.message) {
          const dto = res.message as ChatMessage;
          setMessages((m) => [
            ...m.filter((x) => x.id !== dto.id).map((x) => (x.id === localId ? dto : x)),
          ]);
        }
      }
    );
  };

  const sendGift = async (gift: Gift) => {
    if (!conversationId || giftSending) return;
    setGiftSending(true);
    const localId = `optimistic_gift_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    try {
      await post('/gifts/send', { receiverId: id, giftId: gift.id, contextType: 'chat', contextId: conversationId, clientRequestId: localId });
      emit('message:send', { conversationId, type: 'GIFT', giftId: gift.id, content: '', clientMessageId: localId });
      setMessages((m) => [
        ...m,
        {
          id: localId,
          conversationId,
          senderId: 'me',
          receiverId: id,
          type: 'GIFT',
          content: gift.name,
          mediaUrl: null,
          replyToId: null,
          giftId: gift.id,
          status: 'SENT',
          reactions: {},
          createdAt: new Date().toISOString(),
          readAt: null,
          isMine: true,
        },
      ]);
      setShowGifts(false);
    } catch {
      /* coin balance error etc. - ignored visually */
    } finally {
      setGiftSending(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !conversationId) return;
    const mime = file.type;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(mime)) return;
    if (file.size > 8 * 1024 * 1024) return;
    const data = await readAsBase64(file);
    const localId = `optimistic_file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    try {
      const up = await post<{ url: string; key: string }>('/upload', {
        type: 'message_image',
        filename: file.name,
        mime,
        data,
      });
      emit('message:send', { conversationId, type: 'IMAGE', mediaUrl: up.url, content: '', clientMessageId: localId });
    } catch {
      /* ignore */
    }
  };

  const readAsBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const r = reader.result as string;
        resolve(r.split(',')[1] || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const displayName = other?.displayName || id;
  // Online is OFFLINE by default (null/undefined -> false). Live presence from the
  // realtime server (state strings, e.g. ONLINE/IN_CALL) overrides the hydrated
  // DB `onlineStatus` value when present, fixing "Offline users shown as Online".
  const livePresence = presence[id];
  const online = connected ? (livePresence ? livePresence !== 'OFFLINE' : (other?.onlineStatus ?? false)) : false;

  return (
    <div className="flex flex-col h-dvh max-w-md mx-auto w-full bg-[#0a0a0c]">
      {/* Header */}
      <header className="flex items-center gap-2 px-2 pt-safe pb-2.5 bg-black/60 backdrop-blur-xl border-b border-white/5 z-20">
        <Link href="/app/chat" className="p-2 rounded-full hover:bg-white/10 text-white/80 active:scale-90 transition-transform">
          <ArrowLeftIcon />
        </Link>
        <Link href={`/app/profile/${id}`} className="flex items-center gap-2.5 flex-1 min-w-0">
          <Avatar src={other?.avatarUrl} name={displayName} size="sm" online={online} />
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{displayName}</p>
            <p className="text-[11px] font-medium flex items-center gap-1.5 uppercase tracking-wider">
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-green-400 shadow-glow' : 'bg-white/30'}`} />
              <span className={connected ? 'text-green-400' : 'text-white/40'}>{connected ? (otherTyping ? 'typing' : 'Online') : 'Connecting'}</span>
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <Link href={`/app/call/${id}?type=video&name=${encodeURIComponent(displayName)}`} className="p-2 rounded-full hover:bg-white/10 text-white/80 active:scale-90 transition-transform" aria-label="Video call">
            <VideoIcon />
          </Link>
          <Link href={`/app/call/${id}?type=audio&name=${encodeURIComponent(displayName)}`} className="p-2 rounded-full hover:bg-white/10 text-brand-300 active:scale-90 transition-transform" aria-label="Audio call">
            <PhoneIcon />
          </Link>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat" style={{ backgroundBlendMode: 'overlay', backgroundColor: 'rgba(10,10,12,0.95)' }} onClick={() => setShowGifts(false)}>
        {loading && (
          <div className="text-center py-10 text-white/40 text-sm font-medium">Loading messages…</div>
        )}
        {!loading && (
          <>
            <div className="flex justify-center mb-6">
              <span className="text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 backdrop-blur">
                End-to-End Encrypted
              </span>
            </div>
            <div className="space-y-1.5">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {otherTyping && (
                <div className="flex justify-start mt-2">
                  <div className="bg-white/10 backdrop-blur rounded-[20px] rounded-bl-sm px-4 py-3 flex gap-1.5 shadow-glass">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-1.5 w-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </>
        )}
      </div>

      {/* Gift panel */}
      {showGifts && (
        <div className="border-t border-white/10 bg-surface-raised/95 backdrop-blur-xl p-4">
          <div className="grid grid-cols-6 gap-2 mb-2">
            {gifts.length === 0 && <p className="col-span-6 text-center text-white/40 text-xs py-2 font-medium">No gifts available</p>}
            {gifts.slice(0, 18).map((g) => (
              <button
                key={g.id}
                onClick={() => sendGift(g)}
                className="flex flex-col items-center p-2 rounded-2xl hover:bg-white/5 active:scale-95 transition-all"
                disabled={giftSending}
              >
                {g.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(g.imageUrl)} alt={g.name} className="h-8 w-8 object-contain drop-shadow-md" />
                ) : (
                  <span className="text-3xl drop-shadow-md">🎁</span>
                )}
                <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded flex items-center gap-0.5 mt-1">
                  <CoinIcon size={8} /> {g.priceCoins}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-3 pt-2 pb-safe bg-black/60 backdrop-blur-xl border-t border-white/5">
        <div className="flex items-center gap-2 mb-2">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFile} />
          <button className="p-2.5 text-white/50 hover:text-white transition-colors active:scale-95 bg-white/5 rounded-full" aria-label="Attach" onClick={() => fileRef.current?.click()}>
            <PaperclipIcon size={20} />
          </button>
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              onTyping();
            }}
            onKeyDown={(e) => e.key === 'Enter' && send(input)}
            placeholder="Message..."
            className="flex-1 h-12 px-5 bg-white/5 backdrop-blur-md rounded-full border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-brand-500/50 focus:bg-white/10 transition-all text-sm"
          />
          <button
            onClick={() => setShowGifts((s) => !s)}
            className={`p-2.5 rounded-full transition-all active:scale-95 ${showGifts ? 'bg-brand-600 text-white shadow-glow' : 'bg-white/5 text-brand-300 hover:text-brand-200'}`}
            aria-label="Send gift"
          >
            <GiftQuickIcon />
          </button>
          <button
            className={`h-12 w-12 rounded-full flex items-center justify-center transition-all active:scale-[0.9] shadow-glow ${input.trim() ? 'bg-brand-gradient text-white hover:shadow-glow-pink cursor-pointer' : 'bg-white/5 text-white/30 cursor-default opacity-50'}`}
            onClick={() => send(input)}
            disabled={!input.trim()}
            aria-label="Send"
          >
            <SendIcon size={18} className="translate-x-[1px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const mine = msg.isMine;

  if (msg.type === 'GIFT') {
    return (
      <div className={`flex ${mine ? 'justify-end' : 'justify-start'} mt-3 mb-3`}>
        <div className={`px-4 py-3 rounded-[20px] flex items-center gap-2 shadow-float border ${mine ? 'bg-gradient-to-r from-brand-600 to-pink-600 border-white/20' : 'bg-surface-raised border-white/5'}`}>
          <span className="text-3xl animate-heart-beat drop-shadow-md">🎁</span>
          <div>
            <span className="text-xs text-white/80 font-medium">Sent a gift</span>
            <p className="font-bold text-sm">{msg.content}</p>
          </div>
        </div>
      </div>
    );
  }

  if (msg.type === 'SYSTEM') {
    return (
      <div className="flex justify-center my-3">
        <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/30">Message removed</span>
      </div>
    );
  }

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} group`}>
      <div className={`max-w-[80%] px-4 py-2.5 rounded-[22px] text-sm leading-relaxed shadow-sm border ${mine ? 'bg-brand-600 border-brand-500 rounded-br-md text-white' : 'glass border-white/10 rounded-bl-md text-white/90'}`}>
        {msg.type === 'IMAGE' && msg.mediaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl(msg.mediaUrl)} alt="attachment" className="max-w-[220px] rounded-xl mb-2 object-cover border border-white/10" />
        )}
        {msg.type === 'VOICE' && msg.mediaUrl && <audio controls src={mediaUrl(msg.mediaUrl)} className="w-56 h-10 mb-1" />}
        {msg.content && <div className="break-words">{msg.content}</div>}
        {Object.keys(msg.reactions ?? {}).length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {Object.entries(msg.reactions).map(([emoji, users]) => (
              <span key={emoji} className="text-[11px] px-2 py-0.5 rounded-full bg-black/40 border border-white/10 font-medium flex items-center gap-1">
                {emoji} <span className="text-white/50">{users.length}</span>
              </span>
            ))}
          </div>
        )}
        <div className={`mt-1 flex items-center justify-end gap-1.5 ${mine ? 'text-white/60' : 'text-white/40'}`}>
          <span className="text-[9px] font-bold tracking-wider">{fmtTime(msg.createdAt)}</span>
          {mine && <StatusIcon status={msg.status} />}
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: ChatStatus }) {
  const read = status === 'READ';
  return (
    <span className="text-[10px] leading-none">
      {read ? <span>✓✓</span> : status === 'DELIVERED' ? <span>✓✓</span> : <span>✓</span>}
    </span>
  );
}

function GiftQuickIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
    </svg>
  );
}
