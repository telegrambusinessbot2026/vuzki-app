import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';

export interface PaymentPayload {
  merchantId?: string;
  transactionId?: string;
  amount?: number;
  qrString?: string;
  expiresIn?: number;
}

interface PaymentModalProps {
  orderId: string;
  provider: string;
  amount: number;
  currency: string;
  paymentPayload: PaymentPayload;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PaymentModal({
  orderId,
  provider,
  amount,
  currency,
  paymentPayload,
  onSuccess,
  onCancel,
}: PaymentModalProps) {
  const [status, setStatus] = useState<'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED'>('PENDING');
  const [timeLeft, setTimeLeft] = useState(paymentPayload.expiresIn || 1800);

  // Countdown timer
  useEffect(() => {
    if (status !== 'PENDING' || timeLeft <= 0) return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setStatus('EXPIRED');
          clearInterval(t);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [status, timeLeft]);

  // Polling for status
  useEffect(() => {
    if (status !== 'PENDING' || timeLeft <= 0) return;
    
    let cancelled = false;
    let timerId: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const res = await api<{ status: string; reason?: string }>(`/payments/${orderId}/status`, { auth: true });
        if (cancelled) return;

        if (res.status === 'COMPLETED') {
          setStatus('SUCCESS');
        } else if (res.status === 'FAILED' || res.status === 'CANCELLED') {
          setStatus('FAILED');
        } else {
          // PENDING or CREATED => Poll again
          timerId = setTimeout(checkStatus, 3000);
        }
      } catch (err) {
        if (!cancelled) {
          timerId = setTimeout(checkStatus, 5000);
        }
      }
    };

    // start immediately
    checkStatus();

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [orderId, status, timeLeft]);

  // UPI mobile deep links support
  const upiIntent = paymentPayload.qrString || '';
  const isMobile = typeof window !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <Card className="w-full max-w-sm overflow-hidden bg-surface flex flex-col p-6 items-center text-center">
        {status === 'SUCCESS' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 className="text-xl font-bold">Payment Successful</h2>
            <p className="text-white/60">Your payment has been securely verified.</p>
            <Button variant="primary" className="mt-4 w-full" onClick={onSuccess}>Done</Button>
          </div>
        )}

        {status === 'FAILED' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </div>
            <h2 className="text-xl font-bold">Payment Failed</h2>
            <p className="text-white/60">Your payment could not be processed.</p>
            <Button variant="outline" className="mt-4 w-full" onClick={onCancel}>Close</Button>
          </div>
        )}

        {status === 'EXPIRED' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <h2 className="text-xl font-bold">Session Expired</h2>
            <p className="text-white/60">This payment session has expired.</p>
            <Button variant="outline" className="mt-4 w-full" onClick={onCancel}>Try Again</Button>
          </div>
        )}

        {status === 'PENDING' && (
          <>
            <h2 className="text-lg font-bold mb-1">Pay VUZKI</h2>
            <p className="text-xs text-white/50 mb-6 uppercase tracking-wider font-semibold">Verified Merchant</p>
            
            <div className="text-3xl font-bold text-white mb-6">
              {currency === 'INR' ? '₹' : currency} {amount}
            </div>
            
            <div className="bg-white p-4 rounded-xl mb-6 flex-shrink-0">
              <QRCodeSVG value={paymentPayload.qrString || ''} size={180} />
            </div>

            <p className="font-semibold text-sm mb-2 text-white/80">Scan with any UPI app to pay</p>
            
            <div className="text-xs font-mono text-white/50 bg-surface-overlay px-3 py-1.5 rounded-full mb-6">
              EXPIRES IN {formatTime(timeLeft)}
            </div>

            {isMobile && upiIntent && (
              <div className="flex flex-col gap-2 w-full mb-4">
                <a href={upiIntent} className="flex w-full items-center justify-center h-11 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-full shadow-lg">
                  Pay with UPI App
                </a>
              </div>
            )}

            <Button variant="ghost" className="w-full text-white/50 text-sm" onClick={onCancel}>
              Cancel Payment
            </Button>
            
            <div className="mt-4 text-[10px] text-white/30 flex items-center justify-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Secured by PhonePe
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
