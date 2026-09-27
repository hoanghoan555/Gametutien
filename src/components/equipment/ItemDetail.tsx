import { Hammer, ShieldCheck, Sparkles, Undo2 } from 'lucide-react';
import React from 'react';
import { EQUIPMENT_CONFIG } from '../../data/equipment';
import { RARITY_CONFIG } from '../../data/rarities';
import { useGameStore } from '../../stores/gameStore';
import { getDismantleReward } from '../../systems/equipment';
import { formatExactNumber } from '../../utils/number';
import { EquipmentIcon } from '../common/EquipmentIcon';
import { Modal } from '../common/Modal';
import { RarityBadge } from '../common/RarityBadge';

export const ItemDetail: React.FC = () => {
  const {
    player,
    selectedItem,
    setSelectedItem,
    equipItemFromInventory,
    unequipSlot,
    dismantleSingleItem,
  } = useGameStore();

  if (!selectedItem) return null;

  const rarityCfg = RARITY_CONFIG[selectedItem.rarity];
  const slotCfg = EQUIPMENT_CONFIG[selectedItem.type];
  const equippedInSlot = player.equipment[selectedItem.type];
  const isCurrentlyEquipped = equippedInSlot?.id === selectedItem.id;
  const powerDelta = equippedInSlot
    ? selectedItem.power - equippedInSlot.power
    : selectedItem.power;
  const dismantleReward = getDismantleReward(selectedItem);

  return (
    <Modal
      isOpen={Boolean(selectedItem)}
      onClose={() => setSelectedItem(null)}
      title="Chi Tiết Pháp Bảo"
    >
      <div className="space-y-4 text-sm">
        {/* Item Header */}
        <div
          className={`p-3 rounded-xl border ${rarityCfg.borderColor} ${rarityCfg.bgTint} flex items-center gap-3`}
        >
          <div
            className={`w-14 h-14 rounded-2xl bg-slate-950/90 border ${rarityCfg.borderColor} flex items-center justify-center shrink-0`}
          >
            <EquipmentIcon
              type={selectedItem.type}
              rarity={selectedItem.rarity}
              size={30}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h4
                className={`font-display text-lg font-bold truncate ${rarityCfg.textColor}`}
              >
                {selectedItem.name}
              </h4>
              <span className="font-mono-num text-xs font-semibold text-slate-200 shrink-0">
                Lv.{selectedItem.level}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <RarityBadge rarity={selectedItem.rarity} fullText />
              <span aria-hidden="true">·</span>
              <span>{slotCfg.label}</span>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-slate-300">
                Chiến Lực:{' '}
                <strong className="font-mono-num text-amber-300">
                  {formatExactNumber(selectedItem.power)}
                </strong>
              </span>
              {!isCurrentlyEquipped && powerDelta !== 0 && (
                <span
                  className={`text-xs font-mono-num font-semibold ${
                    powerDelta > 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {powerDelta > 0
                    ? `+${formatExactNumber(powerDelta)}`
                    : formatExactNumber(powerDelta)}{' '}
                  so với đang mặc
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Base Stats */}
        <div className="p-3 rounded-xl bg-slate-900/75 border border-slate-800 space-y-1.5">
          <div className="text-xs font-semibold text-slate-400 mb-1">
            Thuộc Tính Cơ Bản
          </div>
          {selectedItem.baseStats.atk !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Công Kích (ATK)</span>
              <span className="font-mono-num font-semibold text-slate-100">
                +{formatExactNumber(selectedItem.baseStats.atk)}
              </span>
            </div>
          )}
          {selectedItem.baseStats.hp !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Sinh Lực (HP)</span>
              <span className="font-mono-num font-semibold text-slate-100">
                +{formatExactNumber(selectedItem.baseStats.hp)}
              </span>
            </div>
          )}
          {selectedItem.baseStats.def !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Phòng Thủ (DEF)</span>
              <span className="font-mono-num font-semibold text-slate-100">
                +{formatExactNumber(selectedItem.baseStats.def)}
              </span>
            </div>
          )}
          {selectedItem.baseStats.critRate !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Tỷ Lệ Bạo Kích</span>
              <span className="font-mono-num font-semibold text-slate-100">
                +{selectedItem.baseStats.critRate}%
              </span>
            </div>
          )}
          {selectedItem.baseStats.attackSpeed !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Tốc Độ Xuất Chiêu</span>
              <span className="font-mono-num font-semibold text-slate-100">
                +{selectedItem.baseStats.attackSpeed}
              </span>
            </div>
          )}
          {selectedItem.baseStats.cultivationRate !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Tốc Độ Tu Luyện</span>
              <span className="font-mono-num font-semibold text-emerald-300">
                +{selectedItem.baseStats.cultivationRate}/giây
              </span>
            </div>
          )}
        </div>

        {/* Affixes (Section 10) */}
        {selectedItem.affixes.length > 0 && (
          <div className="p-3 rounded-xl bg-slate-900/75 border border-slate-800 space-y-1.5">
            <div className="text-xs font-semibold text-sky-300 mb-1">
              Dòng Thuộc Tính Cộng Thêm ({selectedItem.affixes.length})
            </div>
            {selectedItem.affixes.map((affix, index) => (
              <div key={index} className="flex justify-between text-xs">
                <span className="text-slate-300">{affix.label}</span>
                <span className="font-mono-num font-semibold text-sky-300">
                  +{affix.value}
                  {affix.isPercent ? '%' : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Special Effect (Section 11) */}
        {selectedItem.specialEffect && (
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Thần Thông: {selectedItem.specialEffect.name}</span>
            </div>
            <p className="text-xs text-amber-100/90 leading-relaxed">
              {selectedItem.specialEffect.description}
            </p>
          </div>
        )}

        {/* Dismantle Preview */}
        {!isCurrentlyEquipped && (
          <div className="px-3 py-2 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Nguyên liệu phân giải:</span>
            <div className="flex items-center gap-2 font-mono-num text-slate-200">
              {dismantleReward.basicMaterial > 0 && (
                <span>+{dismantleReward.basicMaterial} Linh Thiết</span>
              )}
              {dismantleReward.linhStone > 0 && (
                <span className="text-emerald-300">
                  +{dismantleReward.linhStone} Linh Thạch
                </span>
              )}
              {dismantleReward.advancedMaterial > 0 && (
                <span className="text-sky-300">
                  +{dismantleReward.advancedMaterial} Huyền Tinh
                </span>
              )}
              {dismantleReward.rareMaterial > 0 && (
                <span className="text-amber-300">
                  +{dismantleReward.rareMaterial} Tiên Ngọc
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {isCurrentlyEquipped ? (
            <button
              type="button"
              onClick={() => unequipSlot(selectedItem.type)}
              className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Undo2 className="w-4 h-4" />
              <span>Tháo Trang Bị</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => equipItemFromInventory(selectedItem.id)}
                className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Trang Bị Ngay</span>
              </button>
              <button
                type="button"
                onClick={() => dismantleSingleItem(selectedItem.id)}
                className="min-h-[44px] py-2.5 px-4 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 text-rose-200 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Hammer className="w-4 h-4" />
                <span>Phân Giải</span>
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
