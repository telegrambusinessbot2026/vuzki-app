'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeftIcon, PhoneIcon } from '@/components/ui/Icons';
import { Card } from '@/components/ui/Card';

function MailIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 6L2 7" />
    </svg>
  );
}

type Kind = 'email' | 'phone' | null;

export default function IdentitySettingsPage() {
  const router = useRouter();
  const { user, refresh } = useAuth();

  const [editing, setEditing] = useState<Kind>(null);
  const [newValue, setNewValue] = useState('');
  const [otp, setOtp] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const startEdit = (kind: Exclude<Kind, null>) => {
    setEditing(kind);
    setNewValue('');
    setOtp('');
    setCodeSent(false);
    setError(null);
    setSuccess(null);
  };

  const sendCode = async () => {
    if (!editing) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await api('/auth/send-otp', {
        method: 'POST',
        auth: false,
        body: { identifier: newValue.trim(), purpose: 'registration' },
      });
      setCodeSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send a code.');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!editing) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const field = editing === 'email' ? 'email' : 'phone';
      await api(`/users/me/${field}`, {
        method: 'PUT',
        auth: true,
        body: { [field]: newValue.trim(), otp },
      });
      await refresh();
      setSuccess(editing === 'email' ? `Email updated to ${newValue.trim()}` : `Phone updated to ${newValue.trim()}`);
      setEditing(null);
      setNewValue('');
      setOtp('');
      setCodeSent(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update your contact details.');
    } finally {
      setLoading(false);
    }
  };

  const currentValue = (kind: 'email' | 'phone') => (kind === 'email' ? user?.email : user?.phone);

  return (
    <div className="px-4 pt-4 pb-8">
      <header className="flex items-center justify-between mb-5">
        <Link href="/app/settings" className="p-2 -ml-2 rounded-full hover:bg-surface-overlay text-white/80"><ArrowLeftIcon /></Link>
        <h1 className="font-bold text-lg">Email & Phone</h1>
        <div className="w-10" />
      </header>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
      {success && <p className="text-sm text-green-400 mb-4">{success}</p>}

      <Card className="divide-y divide-surface-border overflow-hidden mb-5">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-lg bg-surface-overlay text-brand-300 flex items-center justify-center">
              <MailIcon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Email</p>
              <p className="text-xs text-white/40 truncate">{currentValue('email') || 'No email set'}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => startEdit('email')}>
              {currentValue('email') ? 'Change' : 'Add'}
            </Button>
          </div>

          {editing === 'email' && (
            <div className="mt-3 space-y-3 border-t border-surface-border pt-3">
              <Input
                label="New email"
                type="email"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="you@example.com"
                required
              />
              {codeSent && (
                <Input
                  label="Verification code"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit code"
                  required
                />
              )}
              <div className="flex gap-2">
                <Button size="md" variant="secondary" onClick={sendCode} loading={loading && !codeSent} disabled={!newValue || codeSent}>
                  Send code
                </Button>
                {codeSent && (
                  <Button size="md" variant="gradient" onClick={save} loading={loading && codeSent} disabled={!otp}>
                    Verify & save
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-lg bg-surface-overlay text-brand-300 flex items-center justify-center">
              <PhoneIcon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Phone</p>
              <p className="text-xs text-white/40 truncate">{currentValue('phone') || 'No phone set'}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => startEdit('phone')}>
              {currentValue('phone') ? 'Change' : 'Add'}
            </Button>
          </div>

          {editing === 'phone' && (
            <div className="mt-3 space-y-3 border-t border-surface-border pt-3">
              <Input
                label="New phone"
                type="tel"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="+1 555 000 1234"
                required
              />
              {codeSent && (
                <Input
                  label="Verification code"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit code"
                  required
                />
              )}
              <div className="flex gap-2">
                <Button size="md" variant="secondary" onClick={sendCode} loading={loading && !codeSent} disabled={!newValue || codeSent}>
                  Send code
                </Button>
                {codeSent && (
                  <Button size="md" variant="gradient" onClick={save} loading={loading && codeSent} disabled={!otp}>
                    Verify & save
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      <p className="text-xs text-white/40">
        A one-time code is sent to the new address before it is added to your account, so a stray email or phone can never be attached to your account without proof of access.
      </p>
    </div>
  );
}