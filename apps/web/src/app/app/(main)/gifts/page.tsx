'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, Chip, Divider } from '@/components/ui/Card';
import { ArrowLeftIcon, CoinIcon, GiftIcon, HeartIcon } from '@/components/ui/Icons';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Gift {
  id: string;
  name: string;
  imageUrl: string | null;
  animationUrl: string | null;
  priceCoins: number;
  category: string;
}

const FALLBACK_CATEGORIES = ['All', 'Romance', 'Luxury', 'Praise', 'Fun'];

export default function GiftsPage() {
  const { user, refresh } = useAuth();
  const [category, setCategory] = useState('All');
  const balance = user?.wallet?.balance ?? 0;
  const [selected, setSelected] = useState<Gift | null>(null);
  const [sent, setSent] = useState(false);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES);
  const [error, setError] = useState('');

  const searchParams = useSearchParams();
  const receiverId = searchParams.get('receiverId');

  useEffect(() => {
    let cancelled = false;
    api<{ items: Gift[] }>('/gifts', { auth: true })
      .then((data) => {
        if (cancelled) return;
        setGifts(data.items);
        setCategories(['All', ...Array.from(new Set(data.items.map((g) => g.category)))]);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error)?.message || 'Failed to load gifts');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleGifts = useMemo(
    () => (category === 'All' ? gifts : gifts.filter((g) => g.category === category)),
    [gifts, category]
  );

  const sendGift = async () => {
    if (!selected || balance < selected.priceCoins || !receiverId) return;
    try {
      await api('/gifts/send', {
        method: 'POST',
        auth: true,
        body: {
          receiverId,
          giftId: selected.id,
          contextType: 'profile',
        },
      });
      setSent(true);
      refresh();
      setTimeout(() => {
        setSent(false);
        setSelected(null);
      }, 1500);
    } catch (e) {
      setError((e as Error)?.message || 'Failed to send gift');
    }
  };

  return (
    <div className="px-4 pt-4 pb-4">
      <header className="flex items-center justify-between mb-4">
        <Link href="/app/home" className="p-2 -ml-2 rounded-full hover:bg-surface-overlay text-white/80"><ArrowLeftIcon /></Link>
        <h1 className="font-bold text-lg">Gift Shop</h1>
        <Link href="/app/wallet" className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-surface-overlay border border-surface-border text-amber-400 text-xs font-semibold">
          <CoinIcon size={14} /> {balance}
        </Link>
      </header>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 mb-4">
        {categories.map((cat) => (
          <Chip key={cat} selected={category === cat} onClick={() => setCategory(cat)}>{cat}</Chip>
        ))}
      </div>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <div className="grid grid-cols-3 gap-2.5 mb-4">
        {visibleGifts.map((gift) => (
          <button
            key={gift.id}
            onClick={() => setSelected(gift)}
            className={`rounded-2xl p-3 text-center transition-all active:scale-95 border ${
              selected?.id === gift.id
                ? 'bg-brand-600/20 border-brand-500 ring-1 ring-brand-500'
                : 'bg-surface-raised border-surface-border hover:border-brand-500'
            }`}
          >
            <div className="text-3xl mb-1.5">
              {gift.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={gift.imageUrl} alt={gift.name} className="w-10 h-10 mx-auto object-contain" />
              ) : (
                <GiftIcon size={24} />
              )}
            </div>
            <p className="text-xs font-medium truncate">{gift.name}</p>
            <p className={`flex items-center justify-center gap-1 text-[11px] font-semibold ${gift.priceCoins > balance ? 'text-white/30' : 'text-amber-400'}`}>
              <CoinIcon size={11} /> {gift.priceCoins}
            </p>
          </button>
        ))}
      </div>

      <Divider className="mb-4" />

      {selected ? (
        <Card className={`p-4 ${sent ? 'border-green-500' : ''}`}>
          {sent ? (
            <div className="flex flex-col items-center py-2 text-center">
              <div className="h-14 w-14 rounded-full bg-green-500/15 text-3xl flex items-center justify-center mb-2">
                {selected.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.imageUrl} alt={selected.name} className="w-10 h-10 object-contain" />
                ) : (
                  <GiftIcon size={24} />
                )}
              </div>
              <p className="font-bold text-green-400">Gift sent!</p>
              <p className="text-sm text-white/50">Your {selected.name} is on its way</p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-surface-overlay text-3xl flex items-center justify-center animate-bounce">
                {selected.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.imageUrl} alt={selected.name} className="w-9 h-9 object-contain" />
                ) : (
                  <GiftIcon size={24} />
                )}
              </div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <p className="font-bold">{selected.name}</p>
              {selected.animationUrl && <span className="text-sm">✨</span>}
            </div>
            <p className="flex items-center gap-1 text-xs text-amber-400 font-semibold"><CoinIcon size={13} /> {selected.priceCoins} coins</p>
            {balance < selected.priceCoins && <p className="text-xs text-red-400">Not enough coins</p>}
            {!receiverId && <p className="text-xs text-amber-400">Select a user profile first</p>}
          </div>
          <Button size="sm" variant="gradient" onClick={sendGift} disabled={balance < selected.priceCoins || !receiverId}>
            <HeartIcon size={14} /> Send
          </Button>
        </div>
      )}
        </Card>
      ) : (
        <Link href="/app/wallet" className="block">
          <Card className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center"><GiftIcon size={18} /></div>
              <p className="text-sm"><span className="font-semibold">Need more coins?</span> <span className="text-white/50">Top up your wallet</span></p>
            </div>
            <span className="text-brand-400 text-sm font-semibold">Buy</span>
          </Card>
        </Link>
      )}

      <Divider className="my-4" />
    </div>
  );
}
