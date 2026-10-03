'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { CoinIcon } from '@/components/ui/Icons';

export function BoostProfile() {
  const [pricing, setPricing] = useState<any[]>([]);
  const [activeBoost, setActiveBoost] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>('');

  const loadBoosts = async () => {
    try {
      const [pricingRes, activeRes] = await Promise.all([
        api<any>('/boosts/pricing', { auth: true }),
        api<any>('/boosts/active', { auth: true })
      ]);
      setPricing(pricingRes.data?.options || []);
      
      const active = activeRes.data?.items?.[0];
      if (active && new Date(active.expiresAt) > new Date()) {
        setActiveBoost(active);
      } else {
        setActiveBoost(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoosts();
  }, []);

  useEffect(() => {
    if (!activeBoost) return;
    const interval = setInterval(() => {
      const remaining = new Date(activeBoost.expiresAt).getTime() - Date.now();
      if (remaining <= 0) {
        setActiveBoost(null);
        setCountdown('');
        clearInterval(interval);
      } else {
        const m = Math.floor(remaining / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        setCountdown(`${m}:${s.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeBoost]);

  const purchaseBoost = async (type: string) => {
    setPurchasing(type);
    setError(null);
    try {
      const res = await api<any>('/boosts', { method: 'POST', body: { type }, auth: true });
      if (res.data?.boost) {
        setActiveBoost(res.data.boost);
      }
    } catch (e: any) {
      if (e.code === 'INSUFFICIENT_BALANCE') {
        setError('Insufficient coins. Buy more coins to boost your profile.');
      } else {
        setError(e.message || 'Could not purchase boost.');
      }
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) return null;

  return (
    <div className="px-4 mt-6">
      <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/30 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <h3 className="font-bold text-lg text-purple-50">Boost Profile</h3>
        </div>
        
        {activeBoost ? (
          <div className="text-center py-2">
            <p className="text-purple-300 font-semibold mb-1">Your profile is boosted!</p>
            <p className="text-2xl font-black text-white">{countdown}</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-purple-200/70 mb-4">Be the top profile in your area for more matches.</p>
            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {pricing.map((opt) => (
                <div key={opt.type} className="flex-1 min-w-[100px] shrink-0 bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col items-center justify-between text-center gap-2">
                  <div className="text-sm font-bold">{opt.durationMinutes}m</div>
                  <Button
                    size="sm"
                    className="w-full text-[11px] h-8 bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center justify-center gap-1"
                    loading={purchasing === opt.type}
                    disabled={purchasing !== null}
                    onClick={() => purchaseBoost(opt.type)}
                  >
                    <CoinIcon size={12} /> {opt.costCoins}
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
