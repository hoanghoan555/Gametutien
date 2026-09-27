import React from 'react';

interface ProgressBarProps {
  current: number;
  max: number;
  barColorClass?: string;
  heightClass?: string;
  showPercentage?: boolean;
  labelLeft?: React.ReactNode;
  labelRight?: React.ReactNode;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  max,
  barColorClass = 'bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300',
  heightClass = 'h-2.5',
  labelLeft,
  labelRight,
}) => {
  const safeMax = Math.max(1, max);
  const ratio = Math.min(100, Math.max(0, (current / safeMax) * 100));

  return (
    <div className="w-full">
      {(labelLeft || labelRight) && (
        <div className="flex items-center justify-between text-xs mb-1">
          <div className="text-slate-300 font-medium">{labelLeft}</div>
          <div className="text-slate-400 font-mono-num">{labelRight}</div>
        </div>
      )}
      <div
        className={`w-full ${heightClass} bg-slate-900/90 border border-slate-700/60 rounded-full overflow-hidden p-0.5`}
      >
        <div
          className={`h-full rounded-full transition-transform duration-200 origin-left ${barColorClass}`}
          style={{ transform: `scaleX(${ratio / 100})` }}
        />
      </div>
    </div>
  );
};
