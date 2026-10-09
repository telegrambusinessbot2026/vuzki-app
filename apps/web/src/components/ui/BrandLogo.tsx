import React from 'react';
import { VuzkiLogoMark } from './VuzkiLogo';

export const BrandLogo = () => (
  <div className="flex flex-col items-center mb-6">
    <div className="mb-3">
      <VuzkiLogoMark size={64} />
    </div>
    <h2 className="text-[28px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#FF2D8F] to-[#855CF6] leading-none mb-1">
      VUZKI
    </h2>
    <p className="text-[10px] text-white/60 font-semibold uppercase tracking-widest">
      Real People. Real Connections.
    </p>
  </div>
);
