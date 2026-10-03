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
  const isLootReady = lootPercent >= 100;

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
            <span className="text-xs text-slate-300 flex items-center gap-1.5">
              <span>Tiến Độ Cảm Ứng Pháp Bảo ({lootPercent}%)</span>
              {isLootReady && (
                <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-1 rounded animate-pulse">
                  SẮP XUẤT THẾ!
                </span>
              )}
            </span>
          }
          labelRight={
            <span className="text-xs font-mono-num text-slate-300">
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
          className="relative flex-1 min-h-[52px] py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-bold text-base tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 active:scale-[0.97] transition-all cursor-pointer select-none group overflow-hidden"
        >
          {/* Shimmer sweep effect */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          
          <Zap className="w-5 h-5 fill-slate-950" />
          <span className="font-display tracking-wider text-lg">KHAI ĐỈNH</span>
        </button>

        <button
          type="button"
          onClick={toggleAutoCultivation}
          className={`min-h-[52px] px-3.5 py-2 rounded-2xl border text-xs font-semibold flex flex-col items-center justify-center transition-all cursor-pointer whitespace-nowrap ${
            player.autoCultivation
              ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
              : 'bg-slate-900/90 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
          title="Bật/Tắt Tự Động Tu Luyện"
        >
          <div className="flex items-center gap-1">
            <Sparkles className={`w-3.5 h-3.5 ${player.autoCultivation ? 'animate-spin-slow text-emerald-400' : ''}`} />
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
