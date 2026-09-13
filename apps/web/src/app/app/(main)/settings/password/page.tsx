'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/Input';
import { ArrowLeftIcon, LockIcon } from '@/components/ui/Icons';
import { Card } from '@/components/ui/Card';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api('/auth/change-password', {
        method: 'POST',
        auth: true,
        body: { currentPassword, newPassword },
      });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pt-4 pb-8">
      <header className="flex items-center justify-between mb-5">
        <Link href="/app/settings" className="p-2 -ml-2 rounded-full hover:bg-surface-overlay text-white/80"><ArrowLeftIcon /></Link>
        <h1 className="font-bold text-lg">Change Password</h1>
        <div className="w-10" />
      </header>

      <Card className="p-4 mb-5 flex items-center gap-3">
        <div className="h-14 w-14 rounded-2xl bg-brand-500/15 text-brand-300 flex items-center justify-center">
          <LockIcon size={24} />
        </div>
        <p className="text-sm text-white/60">
          Use a strong password you don&apos;t use anywhere else. All other signed-in devices will be logged out.
        </p>
      </Card>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
      {success && (
        <p className="text-sm text-green-400 mb-4">
          Password changed. You may be asked to sign in again on other devices.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordInput
          label="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
        <PasswordInput
          label="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
        />
        <PasswordInput
          label="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat your new password"
          autoComplete="new-password"
          required
        />

        <div className="pt-2">
          <Button type="submit" variant="gradient" size="lg" full loading={loading}>
            Update password
          </Button>
        </div>
      </form>
    </div>
  );
}