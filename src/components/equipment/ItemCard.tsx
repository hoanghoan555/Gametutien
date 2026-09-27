import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import React from 'react';
import { EQUIPMENT_CONFIG } from '../../data/equipment';
import { RARITY_CONFIG } from '../../data/rarities';
import { Item } from '../../types/item';
import { formatExactNumber, formatNumber } from '../../utils/number';
import { EquipmentIcon } from '../common/EquipmentIcon';
import { RarityBadge } from '../common/RarityBadge';

interface ItemCardProps {
  item: Item;
  equippedItemInSlot?: Item | null;
  onClick: (item: Item) => void;
  compact?: boolean;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  equippedItemInSlot,
  onClick,
  compact = false,
}) => {
  const rarityCfg = RARITY_CONFIG[item.rarity];
  const slotCfg = EQUIPMENT_CONFIG[item.type];
  const powerDiff = equippedItemInSlot
    ? item.power - equippedItemInSlot.power
    : item.power;

  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      className={`w-full text-left rounded-xl p-2.5 border ${rarityCfg.borderColor} ${rarityCfg.bgTint} hover:brightness-110 transition-all flex items-center gap-2.5 cursor-pointer`}
    >
      <div
        className={`w-11 h-11 rounded-xl bg-slate-950/90 border ${rarityCfg.borderColor} flex items-center justify-center shrink-0`}
      >
        <EquipmentIcon type={item.type} rarity={item.rarity} size={22} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span
            className={`text-xs font-semibold truncate ${rarityCfg.textColor}`}
          >
            {item.name}
          </span>
          <span className="text-[11px] font-mono-num text-slate-300 shrink-0">
            Lv.{item.level}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
            <RarityBadge rarity={item.rarity} />
            <span aria-hidden="true">·</span>
            <span>{slotCfg.shortLabel}</span>
            {!compact && item.affixes.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-slate-300">{item.affixes.length} dòng</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs font-mono-num font-bold text-amber-200">
              {formatNumber(item.power)}
            </span>
            {equippedItemInSlot?.id !== item.id && powerDiff !== 0 && (
              <span
                className={`inline-flex items-center text-[10px] font-mono-num font-semibold ${
                  powerDiff > 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {powerDiff > 0 ? (
                  <>
                    <ArrowUpRight className="w-3 h-3" />+
                    {formatExactNumber(powerDiff)}
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="w-3 h-3" />
                    {formatExactNumber(powerDiff)}
                  </>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};
