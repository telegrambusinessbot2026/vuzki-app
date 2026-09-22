'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { SettingsRow } from '@/components/domain/SettingsRow';
import { UserIcon, LockIcon, BellIcon, ShieldIcon, DocumentIcon, PhoneIcon, FlagIcon, EyeIcon, SettingsIcon, WalletIcon, ChevronRightIcon } from '@/components/ui/Icons';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col min-h-dvh bg-[#0a0a0c] text-white pb-10">
      {/* Header */}
      <header className="flex items-center px-4 pt-6 pb-2">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-white/80 hover:text-white">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-1.5">
            <div className="text-[#FF4DBD]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </div>
            <span className="text-lg font-bold tracking-tight">VUZKI</span>
          </div>
        </div>
        <div className="w-10" /> {/* Spacer for centering */}
      </header>

      {/* Title */}
      <div className="px-4 mt-6 mb-6">
        <h1 className="text-3xl font-extrabold mb-1">Settings</h1>
        <p className="text-white/50 text-sm">Customize your experience</p>
      </div>

      {/* User Banner */}
      {user && (
        <div className="px-4 mb-8">
          <div className="bg-[#141416] rounded-2xl p-4 flex items-center gap-4">
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

      {/* Lists */}
      <div className="px-4 space-y-6">
        
        <div>
          <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3 pl-2">Account</h3>
          <div className="bg-[#141416] rounded-2xl overflow-hidden divide-y divide-white/5">
            <SettingsRow icon={<UserIcon size={18} />} label="Personal Information" href="/app/settings/profile" />
            <SettingsRow icon={<LockIcon size={18} />} label="Password & Security" href="/app/settings/password" />
            <SettingsRow icon={<PhoneIcon size={18} />} label="Phone Number" href="/app/settings/identity" />
            <SettingsRow icon={<WalletIcon size={18} />} label="Email Address" href="/app/settings/identity" />
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3 pl-2">Preferences</h3>
          <div className="bg-[#141416] rounded-2xl overflow-hidden divide-y divide-white/5">
            <SettingsRow icon={<BellIcon size={18} />} label="Push Notifications" />
            <SettingsRow icon={<DocumentIcon size={18} />} label="Language" value="English" />
            <SettingsRow icon={<SettingsIcon size={18} />} label="Theme" value="Dark" />
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3 pl-2">Safety</h3>
          <div className="bg-[#141416] rounded-2xl overflow-hidden divide-y divide-white/5">
            <SettingsRow icon={<ShieldIcon size={18} />} label="Privacy & Safety" />
            <SettingsRow icon={<EyeIcon size={18} />} label="Blocked Users" href="/app/settings/blocked" />
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3 pl-2">Support</h3>
          <div className="bg-[#141416] rounded-2xl overflow-hidden divide-y divide-white/5">
            <SettingsRow icon={<DocumentIcon size={18} />} label="Help & Support" href="/safety" />
            <SettingsRow icon={<DocumentIcon size={18} />} label="Terms of Service" href="/terms" />
            <SettingsRow icon={<DocumentIcon size={18} />} label="Privacy Policy" href="/privacy" />
          </div>
        </div>

      </div>

      <div className="px-4 mt-8">
        {logoutError && <p className="text-sm text-red-400 text-center mb-4">{logoutError}</p>}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full py-4 rounded-2xl border border-red-500/30 text-red-500 font-bold hover:bg-red-500/10 transition-colors disabled:opacity-50"
        >
          {loggingOut ? 'Logging out...' : 'Log Out'}
        </button>
      </div>
      
    </div>
  );
}