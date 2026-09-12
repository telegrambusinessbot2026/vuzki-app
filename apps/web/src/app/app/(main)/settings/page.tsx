'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SettingsRow } from '@/components/domain/SettingsRow';
import { UserIcon, LockIcon, BellIcon, ShieldIcon, DocumentIcon, PhoneIcon, FlagIcon, EyeIcon, SettingsIcon, WalletIcon } from '@/components/ui/Icons';

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

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
    <div className="px-4 pt-4 pb-4">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Settings</h1>
      </header>

      <SectionTitle>Account</SectionTitle>
      <Card className="divide-y divide-surface-border mb-5 overflow-hidden">
        <SettingsRow icon={<UserIcon size={18} />} label="Edit Profile" value={user?.displayName} href="/app/settings" />
        <SettingsRow icon={<LockIcon size={18} />} label="Change Password" href="/app/settings" />
        <SettingsRow icon={<PhoneIcon size={18} />} label="Phone" value={user?.email || 'Add phone'} href="/app/settings" />
        <SettingsRow icon={<WalletIcon size={18} />} label="Email" value={user?.email || 'Add email'} href="/app/settings" />
      </Card>

      <SectionTitle>Preferences</SectionTitle>
      <Card className="divide-y divide-surface-border mb-5 overflow-hidden">
        <SettingsRow icon={<SettingsIcon size={18} />} label="Theme" value="Dark" onClick={() => {}} />
        <SettingsRow icon={<BellIcon size={18} />} label="Notifications" value="On" onClick={() => {}} />
        <SettingsRow icon={<ShieldIcon size={18} />} label="Language" value="English" onClick={() => {}} />
        <SettingsRow icon={<FlagIcon size={18} />} label="Region" value={user?.countryCode || 'Global'} onClick={() => {}} />
      </Card>

      <SectionTitle>Privacy</SectionTitle>
      <Card className="divide-y divide-surface-border mb-5 overflow-hidden">
        <SettingsRow icon={<UserIcon size={18} />} label="Who can message" value="Everyone" onClick={() => {}} />
        <SettingsRow icon={<EyeIcon size={18} />} label="Online status" value="Visible" onClick={() => {}} />
        <SettingsRow icon={<LockIcon size={18} />} label="Blocked users" href="/app/settings/blocked" />
      </Card>

      <SectionTitle>Support</SectionTitle>
      <Card className="divide-y divide-surface-border mb-6 overflow-hidden">
        <SettingsRow icon={<DocumentIcon size={18} />} label="Help Center" href="/app/safety" />
        <SettingsRow icon={<ShieldIcon size={18} />} label="Safety" href="/app/safety" />
        <SettingsRow icon={<DocumentIcon size={18} />} label="Terms" href="/app/safety" />
        <SettingsRow icon={<DocumentIcon size={18} />} label="Privacy Policy" href="/app/safety" />
      </Card>

      {logoutError && <p className="text-sm text-red-400 text-center mb-3">{logoutError}</p>}

      <Button variant="danger" size="lg" full loading={loggingOut} onClick={handleLogout}>
        Log out
      </Button>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[11px] font-semibold text-white/40 uppercase tracking-wide mb-2">{children}</h2>;
}
