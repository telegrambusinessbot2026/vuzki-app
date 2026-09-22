import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'glass' | 'gradient';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm rounded-xl',
  md: 'h-11 px-5 text-sm rounded-2xl',
  lg: 'h-12 px-6 text-base rounded-2xl',
  xl: 'h-14 px-8 text-lg rounded-[1.25rem]',
  icon: 'h-11 w-11 rounded-full',
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-glow',
  secondary: 'bg-surface-overlay hover:bg-white/10 border border-white/5 text-white/90 font-medium',
  outline: 'border border-surface-border hover:border-brand-500 hover:bg-brand-500/10 text-white font-medium bg-transparent',
  ghost: 'hover:bg-white/5 text-white/80 font-medium bg-transparent',
  danger: 'bg-red-500/15 hover:bg-red-500/25 text-red-500 border border-red-500/20 font-semibold',
  glass: 'bg-white/10 backdrop-blur-md border border-white/15 text-white font-medium shadow-glass hover:bg-white/15',
  gradient: 'bg-brand-gradient text-white font-semibold shadow-glow hover:shadow-glow-pink',
};

export function Button({
  variant = 'primary',
  size = 'md',
  full,
  loading,
  icon,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        sizeClasses[size],
        variantClasses[variant],
        full ? 'w-full' : '',
        'inline-flex items-center justify-center gap-2 transition-all duration-200 ease-out active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        className,
      ].join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner className="h-4 w-4" /> : icon}
      {children}
    </button>
  );
}

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5" />
      <path className="opacity-80" fill="currentColor" strokeLinecap="round" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
