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
  const { socket, connected, joinRoom, leaveRoom, emit, on } = useRealtime();

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
  }, [on, conversationId, emit]);

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
    const localId = `optimistic_${Date.now()}`;
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
      { conversationId, content: t },
      (res: any) => {
        if (res?.ok && res.message) {
          const dto = res.message as ChatMessage;
          setMessages((m) => m.map((x) => (x.id === localId ? dto : x)));
        }
      }
    );
  };

  const sendGift = async (gift: Gift) => {
    if (!conversationId || giftSending) return;
    setGiftSending(true);
    try {
      await post('/gifts/send', { receiverId: id, giftId: gift.id, contextType: 'chat', contextId: conversationId });
      emit('message:send', { conversationId, type: 'GIFT', giftId: gift.id, content: '' });
      const localId = `optimistic_gift_${Date.now()}`;
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
    try {
      const up = await post<{ url: string; key: string }>('/upload', {
        type: 'message_image',
        filename: file.name,
        mime,
        data,
      });
      emit('message:send', { conversationId, type: 'IMAGE', mediaUrl: up.url, content: '' });
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
  const online = connected ? (other?.onlineStatus || true) : false;

  return (
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto w-full">
      {/* Header */}
      <header className="flex items-center gap-2 px-2 py-2.5 bg-surface-raised/95 backdrop-blur border-b border-surface-border">
        <Link href="/app/chat" className="p-2 rounded-full hover:bg-surface-overlay text-white/80">
          <ArrowLeftIcon />
        </Link>
        <Link href={`/app/profile/${id}`} className="flex items-center gap-2.5 flex-1 min-w-0">
          <Avatar src={other?.avatarUrl} name={displayName} size="sm" online={online} />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{displayName}</p>
            <p className="text-[11px] flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-white/30'}`} />
              {connected ? (otherTyping ? 'typing…' : 'Online') : 'Connecting…'}
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <Link href={`/app/call/${id}?type=video&name=${encodeURIComponent(displayName)}`} className="p-2 rounded-full hover:bg-surface-overlay text-white/80" aria-label="Video call">
            <VideoIcon />
          </Link>
          <Link href={`/app/call/${id}?type=audio&name=${encodeURIComponent(displayName)}`} className="p-2 rounded-full hover:bg-surface-overlay text-white/80" aria-label="Audio call">
            <PhoneIcon />
          </Link>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-4" onClick={() => setShowGifts(false)}>
        {loading && (
          <div className="text-center py-10 text-white/40 text-sm">Loading messages…</div>
        )}
        {!loading && (
          <>
            <div className="flex justify-center mb-4">
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-surface-overlay text-white/40">
                Messages are encrypted{other?.isVerified ? ` · ${displayName} is verified` : ''}
              </span>
            </div>
            <div className="space-y-2">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {otherTyping && (
                <div className="flex justify-start">
                  <div className="bg-surface-raised rounded-2xl rounded-bl-sm px-4 py-2.5 flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-1.5 w-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
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
        <div className="border-t border-surface-border bg-surface-raised p-3">
          <div className="grid grid-cols-6 gap-2 mb-2">
            {gifts.length === 0 && <p className="col-span-6 text-center text-white/40 text-xs py-2">No gifts available</p>}
            {gifts.slice(0, 18).map((g) => (
              <button
                key={g.id}
                onClick={() => sendGift(g)}
                className="flex flex-col items-center p-1.5 rounded-xl hover:bg-surface-overlay transition-colors"
                disabled={giftSending}
              >
                {g.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(g.imageUrl)} alt={g.name} className="h-7 w-7 object-contain" />
                ) : (
                  <span className="text-2xl">🎁</span>
                )}
                <span className="text-[9px] text-white/50 flex items-center gap-0.5 mt-0.5">
                  <CoinIcon size={8} /> {g.priceCoins}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-2.5 bg-surface-raised/95 backdrop-blur border-t border-surface-border pb-[calc(env(safe-area-inset-bottom)+10px)]">
        <div className="flex items-center gap-1.5">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFile} />
          <button className="p-2 text-white/60 hover:text-white" aria-label="Emoji">
            <EmojiIcon />
          </button>
          <button className="p-2 text-white/60 hover:text-white" aria-label="Attach" onClick={() => fileRef.current?.click()}>
            <PaperclipIcon />
          </button>
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              onTyping();
            }}
            onKeyDown={(e) => e.key === 'Enter' && send(input)}
            placeholder="Type a message…"
            className="flex-1 h-10 px-4 bg-surface-overlay rounded-full border border-surface-border text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={() => setShowGifts((s) => !s)}
            className={`p-2 rounded-full ${showGifts ? 'bg-brand-600 text-white' : 'text-white/60 hover:text-white'}`}
            aria-label="Send gift"
          >
            <GiftQuickIcon />
          </button>
          <Button size="icon" className="bg-brand-gradient" onClick={() => send(input)} disabled={!input.trim()} aria-label="Send">
            <SendIcon size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const mine = msg.isMine;

  if (msg.type === 'GIFT') {
    return (
      <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[75%] px-3 py-2 rounded-2xl flex items-center gap-1 ${mine ? 'bg-gradient-to-r from-brand-700 to-pink-700' : 'bg-surface-raised'}`}>
          <span className="text-2xl animate-heart-beat">🎁</span>
          <span className="text-xs text-white/80">sent a gift</span>
        </div>
      </div>
    );
  }

  if (msg.type === 'SYSTEM') {
    return (
      <div className="flex justify-center my-1">
        <span className="text-[10px] px-2.5 py-1 rounded-full bg-surface-overlay text-white/40">Message removed</span>
      </div>
    );
  }

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${mine ? 'bg-gradient-to-r from-brand-700 to-pink-700 rounded-br-sm' : 'bg-surface-raised border border-surface-border rounded-bl-sm'}`}>
        {msg.type === 'IMAGE' && msg.mediaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl(msg.mediaUrl)} alt="attachment" className="max-w-[220px] rounded-lg mb-1" />
        )}
        {msg.type === 'VOICE' && msg.mediaUrl && <audio controls src={mediaUrl(msg.mediaUrl)} className="w-52 h-9" />}
        {msg.content && <div>{msg.content}</div>}
        {Object.keys(msg.reactions ?? {}).length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {Object.entries(msg.reactions).map(([emoji, users]) => (
              <span key={emoji} className="text-[10px] px-2 py-0.5 rounded-full bg-black/30">
                {emoji} {users.length}
              </span>
            ))}
          </div>
        )}
        <div className={`mt-0.5 flex items-center justify-end gap-1 ${mine ? 'text-white/50' : 'text-white/30'}`}>
          <span className="text-[10px]">{fmtTime(msg.createdAt)}</span>
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
