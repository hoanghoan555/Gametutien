import React from 'react';
import { getRealmInfoForLevel } from '../../data/realms';
import { usePlayerStore } from '../../stores/player.store';
import { formatExactNumber } from '../../utils/number';
import { ProgressBar } from '../common/ProgressBar';

export const CultivationDisplay: React.FC = () => {
  const { player } = usePlayerStore();
  const realmInfo = getRealmInfoForLevel(player.level);

  return (
    <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/90 space-y-2.5">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-xs text-slate-400 block">Cảnh Giới Hiện Tại</span>
          <h3
            className={`font-display text-xl font-bold ${realmInfo.realm.colorClass}`}
          >
            {realmInfo.fullName}
          </h3>
        </div>
        <span className="text-xs font-mono-num text-slate-400">
          Tầng {realmInfo.layer} / 10
        </span>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        {realmInfo.realm.description}
      </p>

      <ProgressBar
        current={player.cultivationExp}
        max={player.cultivationExpToNext}
        heightClass="h-2"
        barColorClass="bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-300"
        labelLeft="Tu Vi Tích Lũy"
        labelRight={`${formatExactNumber(player.cultivationExp)} / ${formatExactNumber(
          player.cultivationExpToNext
        )}`}
      />
    </div>
  );
};
