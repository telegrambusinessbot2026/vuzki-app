import React from 'react';
import { mediaUrl } from '@/lib/api';

export function Avatar({
  src,
  name,
  size = 'md',
  online,
  verified,
  className = '',
}: {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  online?: boolean;
  verified?: boolean;
  className?: string;
}) {
  const sizes: Record<string, string> = {
    xs: 'h-8 w-8 text-xs',
    sm: 'h-10 w-10 text-sm',
    md: 'h-12 w-12 text-base',
    lg: 'h-16 w-16 text-lg',
    xl: 'h-20 w-20 text-xl',
    '2xl': 'h-28 w-28 text-3xl',
  };
  const indicator = sizes[size] === 'h-8 w-8' ? 'h-2.5 w-2.5' : size === '2xl' ? 'h-4 w-4' : 'h-3 w-3';
  const initial = (name || '?').charAt(0).toUpperCase();

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={`${sizes[size]} rounded-full overflow-hidden border-2 border-surface-border bg-surface-overlay flex items-center justify-center font-bold text-brand-300`}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl(src) ?? undefined} alt={name || 'avatar'} className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </div>
      {online && (
        <span
          className={`absolute bottom-0 right-0 ${indicator} rounded-full bg-green-500 border-2 border-surface-DEFAULT`}
        />
      )}
      {verified && (
        <span
          className="absolute -bottom-1 -right-1 rounded-full bg-brand-600 p-0.5 text-white"
          title="Verified"
        >
          <VerifiedIcon size={size === 'xs' ? 10 : 14} />
        </span>
      )}
    </div>
  );
}

export function VerifiedIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1l2.6 2.1 3.3-.4 1 3.2 3 1.5-.8 3.2.8 3.2-3 1.5-1 3.2-3.3-.4L12 23l-2.6-2.1-3.3.4-1-3.2-3-1.5.8-3.2L0 9.6l3-1.5 1-3.2 3.3.4L12 1z" />
      <path d="M9.5 12.2l2.1 2.1 4.1-4.3" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PremiumBadge({ tier = 'PREMIUM', size = 'sm' }: { tier?: string; size?: 'sm' | 'md' }) {
  const colors: Record<string, string> = {
    PLUS: 'from-blue-500 to-cyan-400',
    PREMIUM: 'from-purple-500 to-fuchsia-400',
    VIP: 'from-amber-400 to-yellow-300',
  };
  const label = tier === 'FREE' ? '' : tier;
  if (tier === 'FREE') return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${colors[tier] || colors.PREMIUM} px-2 py-0.5 font-bold text-white shadow` + (size === 'sm' ? ' text-[10px]' : ' text-xs')}
    >
      {tier === 'VIP' ? '👑' : '✦'} {label}
    </span>
  );
}

export function CreatorBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-gradient px-2 py-0.5 text-[10px] font-bold text-white">
      <MicIcon size={10} /> Listener
    </span>
  );
}

export function MicIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0014 0" />
      <path d="M12 19v3" />
    </svg>
  );
}
