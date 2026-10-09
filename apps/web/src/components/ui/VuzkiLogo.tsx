import React from 'react';
import Link from 'next/link';

interface VuzkiLogoProps {
  size?: number;
  showWordmark?: boolean;
  showTagline?: boolean;
  className?: string;
  href?: string;
}

export function VuzkiLogoMark({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-[0_0_12px_rgba(255,45,143,0.35)] ${className}`}
    >
      <path
        d="M30 50C30 50 10 35 10 20C10 12 16 8 22 8C26 8 28 10 30 14C32 10 34 8 38 8C44 8 50 12 50 20C50 35 30 50 30 50Z"
        stroke="url(#vuzki_grad_0)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M40 25C40 25 30 35 25 35C20 35 18 30 20 25C22 20 28 18 32 18C38 18 40 22 40 25Z"
        stroke="url(#vuzki_grad_1)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <defs>
        <linearGradient id="vuzki_grad_0" x1="10" y1="8" x2="50" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF2D8F" />
          <stop offset="1" stopColor="#855CF6" />
        </linearGradient>
        <linearGradient id="vuzki_grad_1" x1="20" y1="18" x2="40" y2="35" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF006E" />
          <stop offset="1" stopColor="#6C3BFF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function VuzkiLogo({
  size = 36,
  showWordmark = true,
  showTagline = false,
  className = '',
  href,
}: VuzkiLogoProps) {
  const content = (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <VuzkiLogoMark size={size} />
      {showWordmark && (
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-r from-[#FF2D8F] via-[#FF4DBD] to-[#855CF6]">
            VUZKI
          </span>
          {showTagline && (
            <span className="text-[9px] font-medium tracking-widest uppercase text-white/60 mt-0.5">
              Real People. Real Connections.
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex hover:opacity-95 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
