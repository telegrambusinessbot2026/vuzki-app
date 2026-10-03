'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { CoinIcon } from '@/components/ui/Icons';

export function SuperLikesSection() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      const res = await api<any>('/super-likes/status', { auth: true });
      setStatus(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const purchase = async (quantity: number) => {
    setPurchasing(quantity);
    setError(null);
    try {
      await api('/super-likes/purchase', { method: 'POST', body: { quantity }, auth: true });
      await loadStatus();
    } catch (e: any) {
      if (e.code === 'INSUFFICIENT_FUNDS') {
        setError('Insufficient coins to buy Super Likes.');
      } else {
        setError(e.message || 'Could not purchase Super Likes.');
      }
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) return null;
  if (!status) return null;

  return (
    <div className="mt-8">
      <h2 className="font-bold mb-3 px-4 text-lg">Super Likes</h2>
      <div className="mx-4 bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border border-blue-500/30 rounded-2xl p-4 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
          <h3 className="font-bold text-blue-50 text-xl">Stand out</h3>
        </div>
        
        <div className="flex items-center justify-between bg-black/40 rounded-xl p-3 mb-4">
          <div>
            <p className="text-xs text-blue-200/70 uppercase font-bold tracking-wider mb-1">Your balance</p>
            <p className="text-2xl font-black text-white">{status.remaining} <span className="text-sm font-medium text-white/50">remaining</span></p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/40">Free daily: {status.freeRemaining}/{status.pool}</p>
            <p className="text-[10px] text-white/40">Purchased: {status.purchasedRemaining}</p>
          </div>
        </div>

        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
        
        <p className="text-sm text-blue-200/70 mb-3">Get up to 3x more matches with Super Likes.</p>
        
        <div className="flex gap-2">
          {[3, 15, 30].map(qty => (
            <div key={qty} className="flex-1 bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col items-center gap-2">
              <span className="text-lg font-bold">{qty}</span>
              <Button
                size="sm"
                className="w-full text-[11px] h-8 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center gap-1 px-0"
                loading={purchasing === qty}
                disabled={purchasing !== null}
                onClick={() => purchase(qty)}
              >
                <CoinIcon size={12} /> {qty * status.costCoins}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
