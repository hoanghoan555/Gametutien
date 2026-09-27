import React from 'react';
import { useTowerStore } from '../../stores/tower.store';
import { formatExactNumber } from '../../utils/number';
import { ProgressBar } from '../common/ProgressBar';

export const TowerExpBar: React.FC = () => {
  const { tower } = useTowerStore();
  const pct = Math.min(
    100,
    Math.floor((tower.currentExp / Math.max(1, tower.expToNextLevel)) * 100)
  );

  return (
    <div className="w-full px-1">
      <ProgressBar
        current={tower.currentExp}
        max={tower.expToNextLevel}
        heightClass="h-3"
        barColorClass="bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-200"
        labelLeft={
          <span className="text-xs font-semibold text-amber-200">
            Linh Lực Tiên Đỉnh ({pct}%)
          </span>
        }
        labelRight={
          <span className="text-xs text-slate-300">
            {formatExactNumber(tower.currentExp)} /{' '}
            {formatExactNumber(tower.expToNextLevel)}
          </span>
        }
      />
    </div>
  );
};
