import React from 'react';
import { BRAND_CONFIG } from '@/config/assets/assets.config';

export const BrandLogo = () => (
  <div className="flex flex-col items-center mb-8">
    <img 
      src={BRAND_CONFIG.logo.mark} 
      alt={`${BRAND_CONFIG.name} Logo`} 
      className="w-[60px] h-[60px] mb-4 object-contain"
    />
    <h2 className="text-[28px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#FF2D8F] to-[#855CF6] leading-none mb-1">
      {BRAND_CONFIG.name}
    </h2>
    <p className="text-[11px] text-white/70 font-medium tracking-tight mb-8 uppercase tracking-widest">{BRAND_CONFIG.tagline}</p>
  </div>
);
