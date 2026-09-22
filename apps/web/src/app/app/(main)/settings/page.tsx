'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SettingsRow } from '@/components/domain/SettingsRow';
import { Input } from '@/components/ui/Input';
import { UserIcon, LockIcon, BellIcon, ShieldIcon, DocumentIcon, PhoneIcon, FlagIcon, EyeIcon, SettingsIcon, WalletIcon, CloseIcon } from '@/components/ui/Icons';

type PrefModal = null | 'theme' | 'language' | 'region' | 'notifications' | 'privacy';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'bn', label: 'Bengali' },
  { value: 'te', label: 'Telugu' },
  { value: 'ta', label: 'Tamil' },
  { value: 'mr', label: 'Marathi' },
  { value: 'es', label: 'Spanish' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout, refresh } = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const [prefModal, setPrefModal] = useState<PrefModal>(null);
  const [saving, setSaving] = useState(false);
  const [targetTheme, setTargetTheme] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string | null>(null);
  const [regionCode, setRegionCode] = useState('');
  const [regionName, setRegionName] = useState('');
  const [pushOn, setPushOn] = useState(true);
  const [emailOn, setEmailOn] = useState(true);
  const [marketingOn, setMarketingOn] = useState(false);
  const [whoCanMessage, setWhoCanMessage] = useState('everyone');
  const [onlineVisible, setOnlineVisible] = useState(true);
  const [prefError, setPrefError] = useState<string | null>(null);

  const openModal = (m: Exclude<PrefModal, null>) => {
    if (!user) return;
    setPrefError(null);
    setTargetTheme(user.theme ?? 'dark');
    setTargetLanguage(user.language ?? 'en');
    setRegionCode(user.countryCode ?? '');
    setRegionName(user.region ?? '');
    setPushOn(user.preferences?.allowPushNotifications ?? true);
    setEmailOn(user.preferences?.allowEmailNotifications ?? true);
    setMarketingOn(user.preferences?.allowMarketing ?? false);
    setWhoCanMessage(user.preferences?.whoCanMessage ?? 'everyone');
    setOnlineVisible(user.preferences?.showOnlineStatus ?? true);
    setPrefModal(m);
  };

  const savePref = async (body: Record<string, unknown>) => {
    setSaving(true);
    setPrefError(null);
    try {
      await api('/users/me/profile', { method: 'PUT', auth: true, body });
      if (typeof body.theme === 'string') {
        document.documentElement.setAttribute('data-theme', body.theme);
        document.documentElement.style.colorScheme = body.theme;
      }
      await refresh();
      setPrefModal(null);
    } catch (err) {
      setPrefError(err instanceof ApiError ? err.message : 'Could not save this setting.');
    } finally {
      setSaving(false);
    }
  };

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

  const regionLabel = user?.region || user?.countryCode || 'Global';

  return (
    <div className="px-4 pt-safe pt-4 pb-8 min-h-dvh bg-[#0a0a0c]">
      <header className="flex items-center justify-between mb-8 mt-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
      </header>

      <SectionTitle>Account</SectionTitle>
      <Card className="divide-y divide-white/5 mb-8 bg-surface-raised border-transparent">
        <SettingsRow icon={<UserIcon size={18} />} label="Edit Profile" value={user?.displayName} href="/app/settings/profile" />
        <SettingsRow icon={<LockIcon size={18} />} label="Change Password" href="/app/settings/password" />
        <SettingsRow icon={<PhoneIcon size={18} />} label="Phone" value={user?.phone || 'Add phone'} href="/app/settings/identity" />
        <SettingsRow icon={<WalletIcon size={18} />} label="Email" value={user?.email || 'Add email'} href="/app/settings/identity" />
      </Card>

      <SectionTitle>Preferences</SectionTitle>
      <Card className="divide-y divide-white/5 mb-8 bg-surface-raised border-transparent">
        <SettingsRow icon={<SettingsIcon size={18} />} label="Theme" value={user?.theme === 'light' ? 'Light' : 'Dark'} onClick={() => openModal('theme')} />
        <SettingsRow icon={<BellIcon size={18} />} label="Notifications" value="Manage" onClick={() => openModal('notifications')} />
        <SettingsRow icon={<DocumentIcon size={18} />} label="Language" value={LANGUAGES.find((l) => l.value === (user?.language ?? 'en'))?.label ?? 'English'} onClick={() => openModal('language')} />
        <SettingsRow icon={<FlagIcon size={18} />} label="Region" value={regionLabel} onClick={() => openModal('region')} />
      </Card>

      <SectionTitle>Privacy</SectionTitle>
      <Card className="divide-y divide-white/5 mb-8 bg-surface-raised border-transparent">
        <SettingsRow icon={<UserIcon size={18} />} label="Who can message" value={whoCanLabel(user?.preferences?.whoCanMessage)} onClick={() => openModal('privacy')} />
        <SettingsRow icon={<EyeIcon size={18} />} label="Online status" value={user?.preferences?.showOnlineStatus === false ? 'Hidden' : 'Visible'} onClick={() => openModal('privacy')} />
        <SettingsRow icon={<ShieldIcon size={18} />} label="Blocked users" href="/app/settings/blocked" />
      </Card>

      <SectionTitle>Support</SectionTitle>
      <Card className="divide-y divide-white/5 mb-8 bg-surface-raised border-transparent">
        <SettingsRow icon={<DocumentIcon size={18} />} label="Help Center" href="/safety" />
        <SettingsRow icon={<ShieldIcon size={18} />} label="Safety" href="/app/safety" />
        <SettingsRow icon={<DocumentIcon size={18} />} label="Terms" href="/terms" />
        <SettingsRow icon={<DocumentIcon size={18} />} label="Privacy Policy" href="/privacy" />
      </Card>

      {logoutError && <p className="text-sm text-red-400 text-center mb-4">{logoutError}</p>}

      <Button variant="danger" size="lg" full loading={loggingOut} onClick={handleLogout} className="shadow-lg">
        Log out
      </Button>

      {prefModal && (
        <Modal title={modalTitle(prefModal)} onClose={() => setPrefModal(null)}>
          {prefError && <p className="text-sm text-red-400 mb-3">{prefError}</p>}

          {prefModal === 'theme' && (
            <div className="space-y-2">
              {[
                { value: 'dark', label: 'Dark' },
                { value: 'light', label: 'Light' },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => savePref({ theme: t.value })}
                  disabled={saving}
                  className={`w-full text-left px-5 py-4 rounded-2xl border text-sm font-bold transition-all active:scale-[0.98] ${
                    targetTheme === t.value ? 'border-brand-500 text-brand-300 bg-brand-600/10 shadow-glow' : 'border-white/5 text-white/80 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {prefModal === 'language' && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {LANGUAGES.map((l) => (
                <button
                  key={l.value}
                  onClick={() => savePref({ language: l.value })}
                  disabled={saving}
                  className={`w-full text-left px-5 py-4 rounded-2xl border text-sm font-bold transition-all active:scale-[0.98] ${
                    targetLanguage === l.value ? 'border-brand-500 text-brand-300 bg-brand-600/10 shadow-glow' : 'border-white/5 text-white/80 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}

          {prefModal === 'region' && (
            <div className="space-y-3">
              <Input
                label="Country code"
                value={regionCode}
                onChange={(e) => setRegionCode(e.target.value.toUpperCase())}
                placeholder="IN"
                maxLength={3}
              />
              <Input
                label="Region"
                value={regionName}
                onChange={(e) => setRegionName(e.target.value)}
                placeholder="City, state, etc."
              />
              <Button
                size="lg"
                full
                variant="gradient"
                loading={saving}
                onClick={() => savePref({ countryCode: regionCode || null, region: regionName || null })}
              >
                Save
              </Button>
            </div>
          )}

          {prefModal === 'notifications' && (
            <div className="space-y-3">
              {[
                { key: 'allowPushNotifications', label: 'Push notifications', value: pushOn, setter: setPushOn },
                { key: 'allowEmailNotifications', label: 'Email notifications', value: emailOn, setter: setEmailOn },
                { key: 'allowMarketing', label: 'Marketing & offers', value: marketingOn, setter: setMarketingOn },
              ].map((row) => (
                <ToggleRow
                  key={row.key}
                  label={row.label}
                  checked={row.value}
                  onChange={(v) => {
                    if (row.key === 'allowPushNotifications') setPushOn(v);
                    if (row.key === 'allowEmailNotifications') setEmailOn(v);
                    if (row.key === 'allowMarketing') setMarketingOn(v);
                  }}
                />
              ))}
              <Button
                size="lg"
                full
                variant="gradient"
                loading={saving}
                onClick={() => savePref({ preferences: { allowPushNotifications: pushOn, allowEmailNotifications: emailOn, allowMarketing: marketingOn } })}
              >
                Save
              </Button>
            </div>
          )}

          {prefModal === 'privacy' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-white/80 mb-1.5">Who can message me</p>
                <div className="space-y-2">
                  {[
                    { value: 'everyone', label: 'Everyone' },
                    { value: 'followers', label: 'Followers only' },
                    { value: 'nobody', label: 'Nobody' },
                  ].map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setWhoCanMessage(o.value)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                        whoCanMessage === o.value ? 'border-brand-500 text-brand-300 bg-brand-600/10' : 'border-surface-border text-white/80 bg-surface-overlay'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-white/80 mb-1.5">Online status</p>
                <div className="space-y-2">
                  {[
                    { value: true, label: 'Visible to everyone' },
                    { value: false, label: 'Hidden' },
                  ].map((o) => (
                    <button
                      key={String(o.value)}
                      onClick={() => setOnlineVisible(o.value)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                        onlineVisible === o.value ? 'border-brand-500 text-brand-300 bg-brand-600/10' : 'border-surface-border text-white/80 bg-surface-overlay'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                size="lg"
                full
                variant="gradient"
                loading={saving}
                onClick={() => savePref({ preferences: { whoCanMessage, showOnlineStatus: onlineVisible } })}
              >
                Save
              </Button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function whoCanLabel(v?: string): string {
  if (v === 'followers') return 'Followers only';
  if (v === 'nobody') return 'Nobody';
  return 'Everyone';
}

function modalTitle(m: PrefModal): string {
  switch (m) {
    case 'theme': return 'Theme';
    case 'language': return 'Language';
    case 'region': return 'Region';
    case 'notifications': return 'Notifications';
    case 'privacy': return 'Privacy';
    default: return '';
  }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3 pl-2">{children}</h2>;
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between px-4 py-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
    >
      <span className="text-sm font-bold text-white/90">{label}</span>
      <span className={`w-12 h-7 rounded-full transition-colors relative shadow-inner ${checked ? 'bg-brand-500 shadow-glow' : 'bg-white/10'}`}>
         <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </span>
    </button>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface-raised border border-surface-border rounded-3xl p-6 pb-8 shadow-float animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 active:scale-90 transition-transform" aria-label="Close">
            <CloseIcon size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}