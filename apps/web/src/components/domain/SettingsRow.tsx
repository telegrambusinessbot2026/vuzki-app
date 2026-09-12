import React from 'react';
import Link from 'next/link';
import { ChevronRightIcon } from '@/components/ui/Icons';

export function SettingsRow({
  icon,
  label,
  value,
  href,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  const content = (
    <>
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${danger ? 'bg-red-500/15 text-red-400' : 'bg-surface-overlay text-brand-300'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? 'text-red-400' : 'text-white'}`}>{label}</p>
        {value && <p className="text-xs text-white/40 truncate">{value}</p>}
      </div>
      <ChevronRightIcon size={18} className="text-white/30" />
    </>
  );

  if (href) {
    return (
      <Link href={href} className="flex items-center gap-3 w-full text-left px-4 py-3">
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 w-full text-left px-4 py-3">
      {content}
    </button>
  );
}
