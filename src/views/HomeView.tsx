import { Anvil } from 'lucide-react';
import React from 'react';
import { EquipmentIcon } from '../components/common/EquipmentIcon';
import { CultivateButton } from '../components/tower/CultivateButton';
import { TowerExpBar } from '../components/tower/TowerExpBar';
import { TowerHeader } from '../components/tower/TowerHeader';
import { TowerScene } from '../components/tower/TowerScene';
import { EQUIPMENT_CONFIG, EQUIPMENT_SLOTS_LIST } from '../data/equipment';
import { RARITY_CONFIG } from '../data/rarities';
import { useGameStore } from '../stores/gameStore';
import { getEnhancementTier } from '../systems/enhancement';

export const HomeView: React.FC = () => {
  const { player, setSelectedItem, setActiveTab, openEnhanceModal } = useGameStore();

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
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">
              Pháp Bảo Hộ Thân (6 Ô)
            </span>
            <button
              type="button"
              onClick={() => openEnhanceModal()}
              className="text-[10px] text-amber-300 font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Anvil className="w-3 h-3" />
              <span>Cường Hóa</span>
            </button>
          </div>
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
            const enhLevel = player.enhancements?.[slotType] ?? 0;
            const tier = getEnhancementTier(enhLevel);

            return (
              <button
                key={slotType}
                type="button"
                onClick={() => {
                  if (equipped) {
                    setSelectedItem(equipped);
                  } else {
                    openEnhanceModal(slotType);
                  }
                }}
                title={
                  equipped
                    ? `${equipped.name} (Lv.${equipped.level}) • Trận +${enhLevel}`
                    : `${slotCfg.label}: Trống • Trận +${enhLevel}`
                }
                className={`h-12 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                  equipped && rarityCfg
                    ? `${rarityCfg.borderColor} ${rarityCfg.bgTint} hover:brightness-110 ${tier.glowClass}`
                    : 'border-slate-800/80 bg-slate-900/40 opacity-50 hover:opacity-80'
                }`}
              >
                <div className="relative">
                  <EquipmentIcon
                    type={slotType}
                    rarity={equipped ? equipped.rarity : 'white'}
                    size={18}
                  />
                  {enhLevel > 0 && (
                    <span
                      className={`absolute -top-1.5 -right-3 text-[8px] font-mono-num font-bold px-1 rounded-sm border ${tier.badgeBg} ${tier.borderColor} ${tier.textColor}`}
                    >
                      +{enhLevel}
                    </span>
                  )}
                </div>
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
