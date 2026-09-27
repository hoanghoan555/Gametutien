import React from 'react';
import { REALMS_CONFIG, getRealmInfoForLevel } from '../../data/realms';
import { usePlayerStore } from '../../stores/player.store';
import { formatExactNumber } from '../../utils/number';
import { EquipmentPanel } from '../equipment/EquipmentPanel';
import { CultivationDisplay } from './CultivationDisplay';
import { PowerDisplay } from './PowerDisplay';

export const CharacterSheet: React.FC = () => {
  const { player } = usePlayerStore();
  const currentRealmInfo = getRealmInfoForLevel(player.level);

  const statRows: Array<{ label: string; value: string; highlight?: boolean }> =
    [
      { label: 'Công Kích (ATK)', value: formatExactNumber(player.stats.atk) },
      { label: 'Sinh Lực (HP)', value: formatExactNumber(player.stats.hp) },
      { label: 'Phòng Thủ (DEF)', value: formatExactNumber(player.stats.def) },
      { label: 'Tỷ Lệ Bạo Kích', value: `${player.stats.critRate}%` },
      { label: 'Sát Thương Bạo', value: `${player.stats.critDamage}%` },
      { label: 'Tốc Độ Xuất Chiêu', value: `${player.stats.attackSpeed}x` },
      {
        label: 'Tốc Độ Tu Luyện Tự Động',
        value: `${player.stats.cultivationRate} lần/giây`,
        highlight: true,
      },
      {
        label: 'Tăng Cống Hiến Đỉnh EXP',
        value: `+${player.stats.towerExpBonus}%`,
        highlight: true,
      },
      {
        label: 'Cơ Duyên Cảm Ứng Bảo Vật',
        value: `+${player.stats.lootRate}%`,
        highlight: true,
      },
    ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3.5 custom-scrollbar">
      <PowerDisplay />
      <CultivationDisplay />
      <EquipmentPanel />

      {/* Detailed Stats Breakdown */}
      <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/90 space-y-2">
        <h4 className="text-xs font-semibold text-slate-300 tracking-wide">
          Thuộc Tính Bản Mệnh
        </h4>
        <div className="grid grid-cols-1 divide-y divide-slate-800/60">
          {statRows.map((row) => (
            <div
              key={row.label}
              className="py-1.5 flex items-center justify-between text-xs"
            >
              <span className="text-slate-400">{row.label}</span>
              <span
                className={`font-mono-num font-semibold ${
                  row.highlight ? 'text-amber-300' : 'text-slate-200'
                }`}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 6 Realms Roadmap (Section 16) */}
      <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/90 space-y-2">
        <h4 className="text-xs font-semibold text-slate-300 tracking-wide">
          Lục Đại Cảnh Giới Tu Tiên (MVP)
        </h4>
        <div className="grid grid-cols-2 gap-1.5">
          {REALMS_CONFIG.map((r) => {
            const isCurrent = r.id === currentRealmInfo.realm.id;
            const isUnlocked = player.level >= r.minLevel;
            return (
              <div
                key={r.id}
                className={`px-2.5 py-2 rounded-xl border text-xs flex items-center justify-between ${
                  isCurrent
                    ? 'bg-amber-500/15 border-amber-500/45 text-amber-200'
                    : isUnlocked
                    ? 'bg-slate-900/90 border-slate-700/70 text-slate-300'
                    : 'bg-slate-950/50 border-slate-800/50 text-slate-500'
                }`}
              >
                <span className="font-semibold">{r.name}</span>
                <span className="text-[10px] font-mono-num">
                  Cấp {r.minLevel}–{r.maxLevel > 100 ? '60+' : r.maxLevel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
