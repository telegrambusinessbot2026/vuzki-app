import React from 'react';
import { BRAND_CONFIG } from '@/lib/brand.config';

export const BrandLogo = () => (
  <div className="flex flex-col items-center mb-8">
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4">
      <path d="M30 50C30 50 10 35 10 20C10 12 16 8 22 8C26 8 28 10 30 14C32 10 34 8 38 8C44 8 50 12 50 20C50 35 30 50 30 50Z" stroke="url(#paint0_linear)" strokeWidth="4" fill="none"/>
      <path d="M40 25C40 25 30 35 25 35C20 35 18 30 20 25C22 20 28 18 32 18C38 18 40 22 40 25Z" stroke="url(#paint1_linear)" strokeWidth="2" fill="none"/>
      <defs>
        <linearGradient id="paint0_linear" x1="10" y1="8" x2="50" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF2D8F"/>
          <stop offset="1" stopColor="#855CF6"/>
        </linearGradient>
        <linearGradient id="paint1_linear" x1="20" y1="18" x2="40" y2="35" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF006E"/>
          <stop offset="1" stopColor="#6C3BFF"/>
        </linearGradient>
      </defs>
    </svg>
    <h2 className="text-[28px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#FF2D8F] to-[#855CF6] leading-none mb-1">
      {BRAND_CONFIG.name}
    </h2>
    <p className="text-[11px] text-white/70 font-medium tracking-tight mb-8 uppercase tracking-widest">{BRAND_CONFIG.tagline}</p>
  </div>
);
