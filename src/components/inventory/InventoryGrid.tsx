import React from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useInventoryStore } from '../../stores/inventory.store';
import { ItemCard } from '../equipment/ItemCard';

export const InventoryGrid: React.FC = () => {
  const { filteredItems, setSelectedItem } = useInventoryStore();
  const { player } = useGameStore();

  if (filteredItems.length === 0) {
    return (
      <div className="py-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80">
        <p className="text-sm text-slate-400">
          Chưa có pháp bảo nào phù hợp bộ lọc.
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Hãy tiếp tục Khai Đỉnh ở màn hình chính để thu thập trang bị!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filteredItems.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          equippedItemInSlot={player.equipment[item.type]}
          onClick={(clicked) => setSelectedItem(clicked)}
        />
      ))}
    </div>
  );
};
