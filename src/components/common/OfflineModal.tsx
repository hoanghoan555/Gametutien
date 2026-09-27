import { Moon, Sparkles } from 'lucide-react';
import React from 'react';
import { useGameStore } from '../../stores/gameStore';
import { formatDuration, formatExactNumber } from '../../utils/number';
import { Modal } from './Modal';
import { RarityBadge } from './RarityBadge';

export const OfflineModal: React.FC = () => {
  const { offlineReward, claimOfflineReward } = useGameStore();

  if (!offlineReward) return null;

  return (
    <Modal
      isOpen={Boolean(offlineReward)}
      onClose={claimOfflineReward}
      title="Tu Luyện Bế Quan"
    >
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-300">
            <Moon className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Thời gian bế quan</span>
          </div>
          <span className="font-mono-num font-semibold text-amber-300">
            {formatDuration(offlineReward.elapsedSeconds)}
          </span>
        </div>

        <div className="space-y-2 px-3 py-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Tu Luyện EXP</span>
            <span className="font-mono-num font-semibold text-emerald-400">
              +{formatExactNumber(offlineReward.playerExpGained)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Đỉnh EXP đóng góp</span>
            <span className="font-mono-num font-semibold text-amber-400">
              +{formatExactNumber(offlineReward.towerExpGained)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Số lần Khai Đỉnh</span>
            <span className="font-mono-num text-slate-200">
              {formatExactNumber(offlineReward.actionsCount)} lần
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <span className="text-slate-300 font-medium">Pháp bảo thu hoạch</span>
            <span className="font-mono-num font-semibold text-sky-400">
              {offlineReward.itemsGenerated.length} trang bị
            </span>
          </div>
        </div>

        {offlineReward.itemsGenerated.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Pháp bảo tiêu biểu</span>
              <span>
                Tự trang bị: {offlineReward.autoEquippedCount} · Phân giải:{' '}
                {offlineReward.dismantledCount}
              </span>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {offlineReward.itemsGenerated.slice(-8).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800/70 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <RarityBadge rarity={item.rarity} />
                    <span className="text-slate-200 truncate">{item.name}</span>
                  </div>
                  <span className="font-mono-num text-slate-400 shrink-0">
                    Lv.{item.level}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={claimOfflineReward}
          className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-transform cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>NHẬN THU HOẠCH</span>
        </button>
      </div>
    </Modal>
  );
};
