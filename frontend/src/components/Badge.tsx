import React from 'react';
import type { WasRightStatus } from '../features/predictions/types';

interface BadgeProps {
  status: WasRightStatus;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  switch (status) {
    case 1:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          ACERTADO
        </span>
      );
    case 0:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          FALLADO
        </span>
      );
    case 2:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          PENDIENTE
        </span>
      );
    case 3:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">
          ANULADO
        </span>
      );
    default:
      return null;
  }
};
