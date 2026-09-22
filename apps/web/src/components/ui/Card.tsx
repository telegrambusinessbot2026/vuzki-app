import React from 'react';

export function Card({ children, className = '', onClick, interactive }: { children: React.ReactNode; className?: string; onClick?: () => void; interactive?: boolean }) {
  return (
    <div
      onClick={onClick}
      className={[
        'bg-surface-raised border border-transparent rounded-3xl',
        interactive ? 'cursor-pointer hover:border-brand-500/50 transition-all' : '',
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
      className={`bg-surface-overlay overflow-hidden relative rounded-xl ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer w-[200%]" />
    </div>
  );
}

export function Badge({ children, color = 'default', className = '' }: { children: React.ReactNode; color?: 'default' | 'brand' | 'green' | 'red' | 'amber' | 'blue'; className?: string }) {
  const colors: Record<string, string> = {
    default: 'bg-white/5 border border-white/10 text-white/80',
    brand: 'bg-brand-500/10 text-brand-300 border border-brand-500/20 shadow-glow',
    green: 'bg-green-500/10 text-green-400 border border-green-500/20',
    red: 'bg-red-500/10 text-red-400 border border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  };
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold backdrop-blur-md ${colors[color]} ${className}`}>{children}</span>;
}

export function Chip({ selected, onClick, children }: { selected?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-4 py-2 rounded-full text-sm font-medium border transition-all active:scale-95',
        selected ? 'bg-brand-gradient border-transparent text-white shadow-glow' : 'bg-surface-raised border-transparent text-white/70 hover:text-white',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export function Divider({ className = '' }: { className?: string }) {
  return <div className={`h-px w-full bg-surface-border ${className}`} />;
}
