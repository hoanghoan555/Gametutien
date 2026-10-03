import React from 'react';
import { EQUIPMENT_CONFIG } from '../../data/equipment';
import { RARITY_CONFIG } from '../../data/rarities';
import { getEnhancementTier } from '../../systems/enhancement';
import { EquipmentType, Item } from '../../types/item';
import { formatNumber } from '../../utils/number';
import { EquipmentIcon } from '../common/EquipmentIcon';
import { RarityBadge } from '../common/RarityBadge';

interface EquipmentSlotProps {
  slotType: EquipmentType;
  item: Item | null;
  enhancementLevel?: number;
  onSelectItem: (item: Item) => void;
  onEnhanceSlot?: (slot: EquipmentType) => void;
}

export const EquipmentSlot: React.FC<EquipmentSlotProps> = ({
  slotType,
  item,
  enhancementLevel = 0,
  onSelectItem,
}) => {
  const slotCfg = EQUIPMENT_CONFIG[slotType];
  const tier = getEnhancementTier(enhancementLevel);

  if (!item) {
    return (
      <div className="p-2.5 rounded-xl bg-slate-900/50 border border-dashed border-slate-800 flex items-center gap-2.5 min-h-[64px]">
        <div className="w-10 h-10 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-center opacity-40 shrink-0 relative">
          <EquipmentIcon type={slotType} rarity="white" size={20} />
          {enhancementLevel > 0 && (
            <span
              className={`absolute -top-1.5 -right-1.5 text-[9px] font-mono-num font-bold px-1 rounded-md border ${tier.badgeBg} ${tier.borderColor} ${tier.textColor}`}
            >
              +{enhancementLevel}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              {slotCfg.label}
            </span>
            {enhancementLevel > 0 && (
              <span className={`text-[10px] font-mono-num font-semibold ${tier.textColor}`}>
                Trận +{enhancementLevel}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Chưa trang bị</div>
        </div>
      </div>
    );
  }

  const rarityCfg = RARITY_CONFIG[item.rarity];

  return (
    <button
      type="button"
      onClick={() => onSelectItem(item)}
      className={`p-2.5 rounded-xl border ${rarityCfg.borderColor} ${rarityCfg.bgTint} hover:brightness-110 transition-all flex items-center gap-2.5 text-left min-h-[64px] cursor-pointer relative ${tier.glowClass}`}
    >
      <div
        className={`w-10 h-10 rounded-xl bg-slate-950/90 border ${rarityCfg.borderColor} flex items-center justify-center shrink-0 relative`}
      >
        <EquipmentIcon type={item.type} rarity={item.rarity} size={20} />
        {enhancementLevel > 0 && (
          <span
            className={`absolute -top-1.5 -right-1.5 text-[9px] font-mono-num font-bold px-1 rounded-md border ${tier.badgeBg} ${tier.borderColor} ${tier.textColor}`}
          >
            +{enhancementLevel}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span
            className={`text-xs font-semibold truncate ${rarityCfg.textColor}`}
          >
            {item.name}
          </span>
          <span className="text-[10px] font-mono-num text-slate-300 shrink-0">
            Lv.{item.level}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1 mt-1">
          <RarityBadge rarity={item.rarity} />
          <span className="text-xs font-mono-num font-bold text-amber-200">
            {formatNumber(item.power)}
          </span>
        </div>
      </div>
    </button>
  );
};
