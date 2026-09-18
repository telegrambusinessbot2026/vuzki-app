'use client';

import React, { useState, useEffect } from 'react';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-[#16161d] border border-[#2a2a37] rounded-xl ${className}`}>{children}</div>;
}

const badgeColors: Record<string, string> = {
  green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  red: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  brand: 'bg-brand-500/15 text-brand-300 border-brand-500/30',
  blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  gray: 'bg-white/5 text-white/60 border-white/10',
};

export function Badge({ children, color = 'gray', title }: { children: React.ReactNode; color?: string; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeColors[color] || badgeColors.gray}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    ACTIVE: { color: 'green', label: 'Active' },
    SUSPENDED: { color: 'amber', label: 'Suspended' },
    BANNED: { color: 'red', label: 'Banned' },
    PENDING: { color: 'amber', label: 'Pending' },
    REVIEWING: { color: 'blue', label: 'Reviewing' },
    RESOLVED: { color: 'green', label: 'Resolved' },
    DISMISSED: { color: 'gray', label: 'Dismissed' },
    APPROVED: { color: 'green', label: 'Approved' },
    PAID: { color: 'green', label: 'Paid' },
    REJECTED: { color: 'red', label: 'Rejected' },
    success: { color: 'green', label: 'Success' },
    pending: { color: 'amber', label: 'Pending' },
    failed: { color: 'red', label: 'Failed' },
    refunded: { color: 'blue', label: 'Refunded' },
    low: { color: 'gray', label: 'Low' },
    medium: { color: 'amber', label: 'Medium' },
    high: { color: 'red', label: 'High' },
    critical: { color: 'red', label: 'Critical' },
    APPROVED_KYC: { color: 'green', label: 'Approved' },
    PENDING_KYC: { color: 'amber', label: 'Pending' },
    REJECTED_KYC: { color: 'red', label: 'Rejected' },
    NONE: { color: 'gray', label: 'None' },
  };
  const conf = map[status] || { color: 'gray', label: status };
  return <Badge color={conf.color}>{conf.label}</Badge>;
}

const buttonVariants: Record<string, string> = {
  primary: 'bg-brand-600 hover:bg-brand-500 text-white',
  secondary: 'bg-[#23232e] hover:bg-[#2c2c39] text-white',
  outline: 'border border-[#2a2a37] hover:bg-white/5 text-white/80',
  danger: 'bg-rose-600 hover:bg-rose-500 text-white',
  ghost: 'hover:bg-white/5 text-white/70',
};
const buttonSizes: Record<string, string> = {
  sm: 'text-xs px-2.5 py-1.5',
  md: 'text-sm px-3.5 py-2',
  lg: 'text-sm px-5 py-2.5',
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
};

export function Button({ variant = 'primary', size = 'md', className = '', ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
    />
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className={`bg-[#16161d] border border-[#2a2a37] rounded-2xl p-5 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/50 hover:bg-white/5 hover:text-white transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[#2a2a37] bg-[#16161d] py-2 pl-9 pr-3 text-sm text-white placeholder-white/30 outline-none focus:border-brand-500/50"
      />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  delta,
  color = 'brand',
  icon,
}: {
  label: string;
  value: string | number;
  delta?: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  const iconColors: Record<string, string> = {
    brand: 'bg-brand-500/15 text-brand-300',
    green: 'bg-emerald-500/15 text-emerald-400',
    blue: 'bg-blue-500/15 text-blue-400',
    amber: 'bg-amber-500/15 text-amber-400',
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-white/50">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          {delta && (
            <div className="mt-2 flex items-center gap-1">
              <span className={`text-xs font-medium ${delta.startsWith('-') ? 'text-rose-400' : 'text-emerald-400'}`}>
                {delta.startsWith('-') ? '↓' : '↑'} {delta.replace('-', '')}
              </span>
              <span className="text-xs text-white/40">vs last period</span>
            </div>
          )}
        </div>
        {icon && <div className={`rounded-xl p-3 ${iconColors[color] || iconColors.brand}`}>{icon}</div>}
      </div>
    </Card>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[#2a2a37] bg-[#111118] p-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            active === t.key ? 'bg-brand-600 text-white' : 'text-white/50 hover:text-white'
          }`}
        >
          {t.label}
          {typeof t.count === 'number' && (
            <span
              className={`rounded-full px-1.5 text-xs ${active === t.key ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'}`}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <div className="flex items-center justify-center py-16 text-sm text-white/50">{label}</div>;
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-white/30">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-7 w-7">
          <path d="M12 8v4M12 16h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
        </svg>
      </div>
      <p className="text-base font-semibold">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-white/40">{message}</p>}
    </div>
  );
}

export function Th({ children, className = '', ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & { children?: React.ReactNode }) {
  return <th className={`text-left text-xs uppercase tracking-wider text-white/40 py-3 px-3 font-medium ${className}`} {...props}>{children}</th>;
}

export function Td({ children, className = '', ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { children?: React.ReactNode }) {
  return <td className={`py-3 px-3 border-b border-[#2a2a37]/60 ${className}`} {...props}>{children}</td>;
}

export function Toast({ message, type = 'success' }: { message: string; type?: 'success' | 'error' }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 2500);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-lg border border-[#2a2a37] bg-[#1d1d27] px-4 py-3 text-sm shadow-glow">
      <span className={`h-2 w-2 rounded-full ${type === 'success' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
      {message}
    </div>
  );
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-brand-600' : 'bg-[#2a2a37]'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
      />
    </button>
  );
}

export function Avatar({ src, name, size = 8 }: { src: string; name: string; size?: number }) {
  const [error, setError] = useState(false);
  if (error || !src) {
    return (
      <div
        className="flex items-center justify-center rounded-full bg-brand-600/25 text-sm font-semibold text-brand-300"
        style={{ width: size * 4, height: size * 4 }}
      >
        {name?.[0]?.toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      onError={() => setError(true)}
      className="rounded-full object-cover"
      style={{ width: size * 4, height: size * 4 }}
    />
  );
}
