import React from 'react';
import { Cloud, ShieldCheck } from 'lucide-react';

export const NuageBadge: React.FC<{ variant?: 'light' | 'dark', className?: string }> = ({ variant = 'light', className = '' }) => {
  return (
    <div className={`flex items-center gap-2 sm:gap-3 px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm ${className}`}>
      <Cloud className="w-6 h-6 text-sky-500" />
      <div className="flex flex-col justify-center">
         <div className="flex items-center gap-1 sm:gap-1.5">
           <span className="text-xs sm:text-sm font-bold tracking-wide text-slate-800 uppercase">Nuage</span>
           <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
         </div>
         <span className="text-[9px] sm:text-[10px] font-medium tracking-wider text-slate-500 uppercase">Données sécurisées</span>
      </div>
    </div>
  );
};
