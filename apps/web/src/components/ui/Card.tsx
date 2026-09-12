import React from 'react';

export function Card({ children, className = '', onClick, interactive }: { children: React.ReactNode; className?: string; onClick?: () => void; interactive?: boolean }) {
  return (
    <div
      onClick={onClick}
      className={[
        'bg-surface-raised border border-surface-border rounded-2xl',
        interactive ? 'cursor-pointer hover:border-brand-500 transition-all' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-surface-overlay animate-pulse rounded-xl ${className}`}
    />
  );
}

export function Badge({ children, color = 'default', className = '' }: { children: React.ReactNode; color?: 'default' | 'brand' | 'green' | 'red' | 'amber' | 'blue'; className?: string }) {
  const colors: Record<string, string> = {
    default: 'bg-surface-overlay text-white/70',
    brand: 'bg-brand-600/20 text-brand-300 border border-brand-500/30',
    green: 'bg-green-500/15 text-green-400',
    red: 'bg-red-500/15 text-red-400',
    amber: 'bg-amber-500/15 text-amber-400',
    blue: 'bg-blue-500/15 text-blue-400',
  };
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${colors[color]} ${className}`}>{children}</span>;
}

export function Chip({ selected, onClick, children }: { selected?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-4 py-2 rounded-full text-sm font-medium border transition-all active:scale-95',
        selected ? 'bg-brand-600 border-brand-500 text-white shadow-glow' : 'bg-surface-overlay border-surface-border text-white/70 hover:border-brand-500',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export function Divider({ className = '' }: { className?: string }) {
  return <div className={`h-px w-full bg-surface-border ${className}`} />;
}
