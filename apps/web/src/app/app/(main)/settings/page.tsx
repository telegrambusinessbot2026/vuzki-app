'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, del, ApiError } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { SettingsRow } from '@/components/domain/SettingsRow';
import { UserIcon, LockIcon, BellIcon, ShieldIcon, DocumentIcon, PhoneIcon, EyeIcon, SettingsIcon, WalletIcon } from '@/components/ui/Icons';
import { VuzkiLogo } from '@/components/ui/VuzkiLogo';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  // Push notifications state
  const [pushEnabled, setPushEnabled] = useState(user?.preferences?.allowPushNotifications ?? true);
  const [savingPush, setSavingPush] = useState(false);

  // Account deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleLogout = async () => {
    setLogoutError(null);
    setLoggingOut(true);
    try {
      await logout();
      router.push('/auth/login');
    } catch (err) {
      setLogoutError(err instanceof ApiError ? err.message : 'Failed to log out.');
      setLoggingOut(false);
    }
  };

  const togglePushNotifications = async () => {
    if (savingPush) return;
    const nextVal = !pushEnabled;
    setPushEnabled(nextVal);
    setSavingPush(true);
    try {
      await api('/users/me/preferences', {
        method: 'PUT',
        auth: true,
        body: { allowPushNotifications: nextVal },
      });
    } catch {
      // Revert on failure
      setPushEnabled(!nextVal);
    } finally {
      setSavingPush(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toUpperCase() !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm.');
      return;
    }

    setDeleteError(null);
    setDeleting(true);
    try {
      await api('/users/me', { method: 'DELETE', body: { reason: 'User self-service deletion' }, auth: true });
      await logout();
      router.push('/');
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete account. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-[#0a0a0c] text-white pb-14">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-6 pb-2">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-white/80 hover:text-white" aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <VuzkiLogo size={28} showTagline={false} />
        <div className="w-10" />
      </header>

      {/* Title */}
      <div className="px-4 mt-6 mb-6">
        <h1 className="text-3xl font-extrabold mb-1">Settings</h1>
        <p className="text-white/50 text-sm">Customize your preferences and account security</p>
      </div>

      {/* User Banner */}
      {user && (
        <div className="px-4 mb-8">
          <div className="bg-[#141416] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
            <Avatar src={user.avatarUrl} name={user.displayName} size="xl" />
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg truncate">{user.displayName}</h2>
              <p className="text-white/50 text-sm truncate">@{user.username}</p>
            </div>
            <Link href="/app/settings/profile">
              <button className="px-4 py-2 rounded-full bg-white/10 text-sm font-semibold hover:bg-white/20 transition-colors">
                Edit
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Grouped Settings Lists */}
      <div className="px-4 space-y-6">
        <div>
          <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3 pl-2">Account</h3>
          <div className="bg-[#141416] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
            <SettingsRow icon={<UserIcon size={18} />} label="Personal Information" href="/app/settings/profile" />
            <SettingsRow icon={<LockIcon size={18} />} label="Password & Security" href="/app/settings/password" />
            <SettingsRow icon={<PhoneIcon size={18} />} label="Phone & Email Verification" href="/app/settings/identity" />
            <SettingsRow icon={<WalletIcon size={18} />} label="Wallet & Balances" href="/app/wallet" />
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3 pl-2">Preferences</h3>
          <div className="bg-[#141416] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
            <SettingsRow
              icon={<BellIcon size={18} />}
              label="Push Notifications"
              value={pushEnabled ? 'Enabled' : 'Disabled'}
              onClick={togglePushNotifications}
            />
            <SettingsRow icon={<DocumentIcon size={18} />} label="Language" value={user?.language || 'English'} />
            <SettingsRow icon={<SettingsIcon size={18} />} label="Theme" value="Dark (OLED)" />
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3 pl-2">Safety</h3>
          <div className="bg-[#141416] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
            <SettingsRow icon={<ShieldIcon size={18} />} label="Privacy & Safety" href="/app/safety" />
            <SettingsRow icon={<EyeIcon size={18} />} label="Blocked Users" href="/app/settings/blocked" />
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3 pl-2">Support & Legal</h3>
          <div className="bg-[#141416] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
            <SettingsRow icon={<DocumentIcon size={18} />} label="Help Center & Support Tickets" href="/app/support" />
            <SettingsRow icon={<DocumentIcon size={18} />} label="Community Guidelines" href="/safety" />
            <SettingsRow icon={<DocumentIcon size={18} />} label="Terms of Service" href="/terms" />
            <SettingsRow icon={<DocumentIcon size={18} />} label="Privacy Policy" href="/privacy" />
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="px-4 mt-8 space-y-3">
        {logoutError && <p className="text-sm text-red-400 text-center mb-2">{logoutError}</p>}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full py-4 rounded-2xl border border-white/10 text-white/90 font-bold hover:bg-white/5 transition-colors disabled:opacity-50"
        >
          {loggingOut ? 'Logging out...' : 'Log Out'}
        </button>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full py-3.5 rounded-2xl border border-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition-colors"
        >
          Delete Account
        </button>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141416] border border-red-500/30 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-float">
            <div className="h-12 w-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto text-xl">
              ⚠️
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-white">Delete Account</h3>
              <p className="text-xs text-white/60 mt-1 leading-relaxed">
                This action will deactivate your profile and schedule all your data for permanent deletion.
                Type <span className="font-mono text-red-400 font-bold">DELETE</span> below to confirm.
              </p>
            </div>

            <input
              type="text"
              placeholder="Type DELETE"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-white text-center font-mono tracking-widest text-sm focus:border-red-500/50 focus:outline-none"
            />

            {deleteError && (
              <p className="text-xs text-red-400 text-center font-medium">{deleteError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); setDeleteError(null); }}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}