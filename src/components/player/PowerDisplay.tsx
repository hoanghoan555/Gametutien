import React from 'react';
import { usePlayerStore } from '../../stores/player.store';
import { formatExactNumber } from '../../utils/number';

export const PowerDisplay: React.FC = () => {
  const { player } = usePlayerStore();

  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-900/75 border border-amber-500/25">
      <div>
        <div className="text-xs text-slate-400">Tổng Chiến Lực Tu Tiên</div>
        <div className="font-mono-num text-2xl font-bold text-amber-300 tracking-tight mt-0.5">
          {formatExactNumber(player.power)}
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs text-slate-400">Tổng Cống Hiến Đỉnh</div>
        <div className="font-mono-num text-sm font-semibold text-emerald-400 mt-0.5">
          {formatExactNumber(player.contribution)} EXP
        </div>
      </div>
    </div>
  );
};
