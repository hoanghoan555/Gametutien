import { Trophy, Volume2, VolumeX } from 'lucide-react';
import React from 'react';
import { getRealmInfoForLevel } from '../../data/realms';
import { useGameStore } from '../../stores/gameStore';
import { formatExactNumber, formatNumber } from '../../utils/number';
import { ProgressBar } from '../common/ProgressBar';

export const TopStatusBar: React.FC = () => {
  const { player, settings, updateSettings, openLeaderboardModal } = useGameStore();
  const realmInfo = getRealmInfoForLevel(player.level);

  return (
    <header className="shrink-0 px-4 pt-3 pb-2.5 bg-[#0a0e18]/90 backdrop-blur-md border-b border-amber-500/20 z-20">
      <div className="flex items-center justify-between gap-2">
        {/* Left: Realm & Layer */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`font-display text-lg font-bold tracking-wide truncate ${realmInfo.realm.colorClass}`}
            >
              {realmInfo.fullName}
            </span>
            <span className="text-xs text-slate-500" aria-hidden="true">
              ·
            </span>
            <span className="text-xs text-slate-400 font-mono-num shrink-0">
              Cấp {player.level}
            </span>
          </div>
        </div>

        {/* Right: Leaderboard, Power & Sound Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openLeaderboardModal}
            className="min-h-[36px] px-2.5 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-500/40 text-amber-300 hover:border-amber-400 hover:text-amber-200 transition-all cursor-pointer shadow-sm"
            title="Bảng Phong Thần Tiên Giới"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold">Phong Thần</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          <div className="text-right pl-1">
            <div className="text-[10px] text-slate-400 leading-none">Chiến Lực</div>
            <div className="font-mono-num text-sm font-bold text-amber-300 tracking-tight">
              {formatExactNumber(player.power)}
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              updateSettings({ soundEnabled: !settings.soundEnabled })
            }
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
            aria-label={settings.soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            title={settings.soundEnabled ? 'Âm thanh: Bật' : 'Âm thanh: Tắt'}
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-amber-300/90" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>
        </div>
      </div>

      {/* Player Cultivation EXP Bar */}
      <div className="mt-2">
        <ProgressBar
          current={player.cultivationExp}
          max={player.cultivationExpToNext}
          heightClass="h-1.5"
          barColorClass="bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-300"
          labelLeft={
            <span className="text-[11px] text-slate-400">
              Tu Vi · Tốc độ {player.stats.cultivationRate}/giây
            </span>
          }
          labelRight={
            <span className="text-[11px] text-slate-400">
              {formatNumber(player.cultivationExp)} /{' '}
              {formatNumber(player.cultivationExpToNext)}
            </span>
          }
        />
      </div>
    </header>
  );
};
