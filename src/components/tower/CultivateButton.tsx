import { Sparkles, Zap } from 'lucide-react';
import React from 'react';
import { usePlayerStore } from '../../stores/player.store';
import { useTowerStore } from '../../stores/tower.store';
import { formatExactNumber } from '../../utils/number';
import { ProgressBar } from '../common/ProgressBar';

export const CultivateButton: React.FC = () => {
  const { tower, cultivate } = useTowerStore();
  const { player, toggleAutoCultivation } = usePlayerStore();

  const lootPercent = Math.min(
    100,
    Math.floor((tower.lootProgress / Math.max(1, tower.lootThreshold)) * 100)
  );

  return (
    <div className="w-full space-y-2.5 pt-1">
      {/* Loot Progress Bar (Section 19) */}
      <div className="px-1">
        <ProgressBar
          current={tower.lootProgress}
          max={tower.lootThreshold}
          heightClass="h-2"
          barColorClass="bg-gradient-to-r from-sky-500 via-indigo-400 to-purple-400"
          labelLeft={
            <span className="text-xs text-slate-300">
              Tiến Độ Cảm Ứng Pháp Bảo ({lootPercent}%)
            </span>
          }
          labelRight={
            <span className="text-xs text-slate-400">
              {Math.floor(tower.lootProgress)} / {tower.lootThreshold}
            </span>
          }
        />
      </div>

      {/* Primary KHAI ĐỈNH Button + Auto Toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={cultivate}
          className="flex-1 min-h-[52px] py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-bold text-base tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-[0.97] transition-transform cursor-pointer select-none"
        >
          <Zap className="w-5 h-5 fill-slate-950" />
          <span>KHAI ĐỈNH</span>
        </button>

        <button
          type="button"
          onClick={toggleAutoCultivation}
          className={`min-h-[52px] px-3.5 py-2 rounded-2xl border text-xs font-semibold flex flex-col items-center justify-center transition-colors cursor-pointer whitespace-nowrap ${
            player.autoCultivation
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
              : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
          title="Bật/Tắt Tự Động Tu Luyện"
        >
          <div className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tự Động</span>
          </div>
          <span className="text-[10px] font-mono-num mt-0.5">
            {player.autoCultivation
              ? `${formatExactNumber(player.stats.cultivationRate)}/s · BẬT`
              : 'ĐANG TẮT'}
          </span>
        </button>
      </div>
    </div>
  );
};
