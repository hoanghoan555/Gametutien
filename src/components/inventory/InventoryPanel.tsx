import { Hammer } from 'lucide-react';
import React from 'react';
import { EQUIPMENT_CONFIG, EQUIPMENT_SLOTS_LIST } from '../../data/equipment';
import { RARITY_CONFIG, RARITY_ORDER } from '../../data/rarities';
import { useInventoryStore } from '../../stores/inventory.store';
import { useSettingsStore } from '../../stores/settings.store';
import { MAX_INVENTORY_SLOTS } from '../../systems/equipment';
import { EquipmentType, Rarity } from '../../types/item';
import { formatExactNumber } from '../../utils/number';
import { InventoryGrid } from './InventoryGrid';

export const InventoryPanel: React.FC = () => {
  const {
    inventory,
    materials,
    inventoryFilter,
    setInventoryFilter,
    dismantleBulkByRarity,
  } = useInventoryStore();
  const { settings, updateSettings } = useSettingsStore();

  const rarityFilters: Array<{ id: Rarity | 'all'; label: string }> = [
    { id: 'all', label: 'Tất cả' },
    ...RARITY_ORDER.map((r) => ({ id: r, label: RARITY_CONFIG[r].name })),
  ];

  const typeFilters: Array<{ id: EquipmentType | 'all'; label: string }> = [
    { id: 'all', label: 'Mọi Loại' },
    ...EQUIPMENT_SLOTS_LIST.map((t) => ({
      id: t,
      label: EQUIPMENT_CONFIG[t].shortLabel,
    })),
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col px-4 py-3 space-y-3 overflow-y-auto custom-scrollbar">
      {/* Header & Capacity */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-amber-100">
            Túi Càn Khôn
          </h2>
          <p className="text-xs text-slate-400">
            Sức chứa trang bị:{' '}
            <span className="font-mono-num text-slate-200 font-semibold">
              {inventory.length} / {MAX_INVENTORY_SLOTS}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => dismantleBulkByRarity('blue')}
          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <Hammer className="w-3.5 h-3.5" />
          <span>Phân Giải ≤ Huyền</span>
        </button>
      </div>

      {/* Materials Summary Bar */}
      <div className="grid grid-cols-4 gap-1.5 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-center">
        <div>
          <div className="text-[10px] text-slate-400">Linh Thiết</div>
          <div className="font-mono-num text-xs font-semibold text-slate-200">
            {formatExactNumber(materials.basicMaterial)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400">Linh Thạch</div>
          <div className="font-mono-num text-xs font-semibold text-emerald-300">
            {formatExactNumber(materials.linhStone)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400">Huyền Tinh</div>
          <div className="font-mono-num text-xs font-semibold text-sky-300">
            {formatExactNumber(materials.advancedMaterial)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400">Tiên Ngọc</div>
          <div className="font-mono-num text-xs font-semibold text-amber-300">
            {formatExactNumber(materials.rareMaterial)}
          </div>
        </div>
      </div>

      {/* Auto-Equip & Auto-Dismantle Controls */}
      <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-300">
            Tự động mặc trang bị Chiến Lực cao hơn
          </span>
          <button
            type="button"
            onClick={() => updateSettings({ autoEquip: !settings.autoEquip })}
            className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
              settings.autoEquip
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {settings.autoEquip ? 'ĐANG BẬT' : 'TẮT'}
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-300">
            Tự động phân giải đồ yếu (Trừ Tiên Phẩm):
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                updateSettings({ autoDismantle: !settings.autoDismantle })
              }
              className={`px-2 py-1 rounded-lg font-semibold cursor-pointer ${
                settings.autoDismantle
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {settings.autoDismantle ? 'BẬT' : 'TẮT'}
            </button>
            {settings.autoDismantle && (
              <select
                value={settings.autoDismantleMaxRarity}
                onChange={(e) =>
                  updateSettings({
                    autoDismantleMaxRarity: e.target.value as Rarity,
                  })
                }
                aria-label="Phẩm chất phân giải tự động tối đa"
                className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs"
              >
                <option value="white">≤ Phàm (Trắng)</option>
                <option value="green">≤ Linh (Xanh lá)</option>
                <option value="blue">≤ Huyền (Xanh dương)</option>
                <option value="purple">≤ Địa (Tím)</option>
                <option value="orange">≤ Thiên (Cam)</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Filter Controls */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
          {rarityFilters.map((rf) => {
            const active = inventoryFilter.rarity === rf.id;
            return (
              <button
                key={rf.id}
                type="button"
                onClick={() =>
                  setInventoryFilter((prev) => ({ ...prev, rarity: rf.id }))
                }
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                {rf.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
          {typeFilters.map((tf) => {
            const active = inventoryFilter.type === tf.id;
            return (
              <button
                key={tf.id}
                type="button"
                onClick={() =>
                  setInventoryFilter((prev) => ({ ...prev, type: tf.id }))
                }
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-slate-200 text-slate-950 font-semibold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Item List */}
      <div className="flex-1">
        <InventoryGrid />
      </div>
    </div>
  );
};
