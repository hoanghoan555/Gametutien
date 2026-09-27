import React from 'react';
import { useTowerStore } from '../../stores/tower.store';
import { formatExactNumber } from '../../utils/number';

export const ContributionFloat: React.FC = () => {
  const { floatingContributions } = useTowerStore();

  if (floatingContributions.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-14 flex items-center justify-center z-20">
      {floatingContributions.map((item) => (
        <div
          key={item.id}
          className="absolute animate-float-up-fade flex flex-col items-center whitespace-nowrap"
          style={{
            transform: `translateX(${item.xOffset}px)`,
          }}
        >
          <span
            className={`font-mono-num font-bold tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] ${
              item.isBurst
                ? 'text-base text-rose-300'
                : 'text-sm text-amber-300'
            }`}
          >
            +{formatExactNumber(item.towerExp)} Đỉnh EXP
            {item.isBurst ? ' (Tiên Đạo!)' : ''}
          </span>
          <span className="font-mono-num text-[11px] text-emerald-300/90 drop-shadow">
            +{formatExactNumber(item.playerExp)} Tu Vi
          </span>
        </div>
      ))}
    </div>
  );
};
