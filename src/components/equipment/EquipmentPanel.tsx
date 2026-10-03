import { Anvil } from 'lucide-react';
import React from 'react';
import { EQUIPMENT_SLOTS_LIST } from '../../data/equipment';
import { useGameStore } from '../../stores/gameStore';
import { EquipmentSlot } from './EquipmentSlot';

export const EquipmentPanel: React.FC = () => {
  const { player, setSelectedItem, openEnhanceModal } = useGameStore();

  const totalEnhancement = EQUIPMENT_SLOTS_LIST.reduce(
    (sum, slot) => sum + (player.enhancements?.[slot] ?? 0),
    0
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-300 tracking-wide">
          Lục Đại Pháp Bảo Trang Bị
        </h4>
        <button
          type="button"
          onClick={() => openEnhanceModal()}
          className="text-xs text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1 cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-lg transition-colors"
        >
          <Anvil className="w-3.5 h-3.5" />
          <span>Luyện Trận {totalEnhancement > 0 ? `(+${totalEnhancement})` : ''}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {EQUIPMENT_SLOTS_LIST.map((slotType) => (
          <EquipmentSlot
            key={slotType}
            slotType={slotType}
            item={player.equipment[slotType]}
            enhancementLevel={player.enhancements?.[slotType] ?? 0}
            onSelectItem={(item) => setSelectedItem(item)}
          />
        ))}
      </div>
    </div>
  );
};
