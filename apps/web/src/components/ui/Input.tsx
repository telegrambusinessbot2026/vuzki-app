import React from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export function Input({ label, error, hint, prefix, suffix, className = '', id, ...props }: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-white/80 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && <div className="absolute left-4 text-white/50">{prefix}</div>}
        <input
          id={inputId}
          className={[
            'w-full h-[52px] px-4 bg-surface-raised border rounded-2xl text-white placeholder-white/30',
            'focus:outline-none focus:bg-surface-overlay transition-all',
            prefix ? 'pl-12' : '',
            suffix ? 'pr-12' : '',
            error ? 'border-red-500' : 'border-surface-border',
            className,
          ].join(' ')}
          {...props}
        />
        {suffix && <div className="absolute right-4 text-white/50">{suffix}</div>}
      </div>
      {error ? (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-sm text-white/40">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextArea({ label, error, className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-white/80 mb-1.5">{label}</label>
      )}
      <textarea
        className={[
          'w-full px-4 py-3 bg-surface-raised border rounded-2xl text-white placeholder-white/30',
          'focus:outline-none focus:bg-surface-overlay transition-all',
          error ? 'border-red-500' : 'border-surface-border',
          className,
        ].join(' ')}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}

export function PasswordInput(props: Omit<InputProps, 'type'>) {
  const [visible, setVisible] = React.useState(false);
  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      suffix={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="text-white/50 hover:text-white flex items-center justify-center"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      }
    />
  );
}

export function Select({ label, error, options, className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string; options: { value: string; label: string }[] }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-white/80 mb-1.5">{label}</label>
      )}
      <select
        className={[
          'w-full h-12 px-4 bg-surface-raised border rounded-2xl text-white focus:outline-none focus:bg-surface-overlay transition-all',
          error ? 'border-red-500' : 'border-transparent',
          className,
        ].join(' ')}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface-raised">
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}

export function EyeIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
