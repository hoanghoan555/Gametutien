import React from 'react';
import { EQUIPMENT_SLOTS_LIST } from '../../data/equipment';
import { useGameStore } from '../../stores/gameStore';
import { EquipmentSlot } from './EquipmentSlot';

export const EquipmentPanel: React.FC = () => {
  const { player, setSelectedItem } = useGameStore();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-300 tracking-wide">
          Lục Đại Pháp Bảo Trang Bị
        </h4>
        <span className="text-[11px] text-slate-400">
          Chạm vào pháp bảo để xem chi tiết
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {EQUIPMENT_SLOTS_LIST.map((slotType) => (
          <EquipmentSlot
            key={slotType}
            slotType={slotType}
            item={player.equipment[slotType]}
            onSelectItem={(item) => setSelectedItem(item)}
          />
        ))}
      </div>
    </div>
  );
};
