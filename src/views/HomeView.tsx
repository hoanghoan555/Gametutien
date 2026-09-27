import React from 'react';
import { EQUIPMENT_CONFIG, EQUIPMENT_SLOTS_LIST } from '../data/equipment';
import { RARITY_CONFIG } from '../data/rarities';
import { useGameStore } from '../stores/gameStore';
import { EquipmentIcon } from '../components/common/EquipmentIcon';
import { CultivateButton } from '../components/tower/CultivateButton';
import { TowerExpBar } from '../components/tower/TowerExpBar';
import { TowerHeader } from '../components/tower/TowerHeader';
import { TowerScene } from '../components/tower/TowerScene';

export const HomeView: React.FC = () => {
  const { player, setSelectedItem, setActiveTab } = useGameStore();

  return (
    <div className="flex-1 min-h-0 flex flex-col justify-between px-4 py-2.5 overflow-hidden">
      {/* Top: Tower Title & Tower EXP Bar */}
      <div className="space-y-2 shrink-0">
        <TowerHeader />
        <TowerExpBar />
      </div>

      {/* Center: Interactive Sacred Peak & Cultivator */}
      <TowerScene />

      {/* Quick 6-Slot Equipped Gear Strip */}
      <div className="shrink-0 py-1.5">
        <div className="flex items-center justify-between mb-1 px-0.5">
          <span className="text-[11px] text-slate-400">
            Pháp Bảo Hộ Thân (6 Ô)
          </span>
          <button
            type="button"
            onClick={() => setActiveTab('character')}
            className="text-[11px] text-amber-300 hover:underline cursor-pointer"
          >
            Xem thuộc tính →
          </button>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {EQUIPMENT_SLOTS_LIST.map((slotType) => {
            const equipped = player.equipment[slotType];
            const slotCfg = EQUIPMENT_CONFIG[slotType];
            const rarityCfg = equipped ? RARITY_CONFIG[equipped.rarity] : null;

            return (
              <button
                key={slotType}
                type="button"
                onClick={() => {
                  if (equipped) {
                    setSelectedItem(equipped);
                  } else {
                    setActiveTab('character');
                  }
                }}
                title={
                  equipped
                    ? `${equipped.name} (Lv.${equipped.level})`
                    : `${slotCfg.label}: Trống`
                }
                className={`h-12 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                  equipped && rarityCfg
                    ? `${rarityCfg.borderColor} ${rarityCfg.bgTint} hover:brightness-110`
                    : 'border-slate-800/80 bg-slate-900/40 opacity-50 hover:opacity-80'
                }`}
              >
                <EquipmentIcon
                  type={slotType}
                  rarity={equipped ? equipped.rarity : 'white'}
                  size={18}
                />
                <span className="text-[9px] font-mono-num text-slate-300 mt-0.5">
                  {equipped ? `Lv.${equipped.level}` : slotCfg.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom: Loot Progress & KHAI ĐỈNH Button */}
      <div className="shrink-0">
        <CultivateButton />
      </div>
    </div>
  );
};
