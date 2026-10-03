import { Anvil, CheckCircle2, ChevronRight, Sparkles, Zap } from 'lucide-react';
import React, { useState } from 'react';
import { EQUIPMENT_CONFIG, EQUIPMENT_SLOTS_LIST } from '../../data/equipment';
import { useGameStore } from '../../stores/gameStore';
import {
  canAffordEnhancement,
  getEnhancementCost,
  getEnhancementTier,
  getSlotEnhancementStats,
  MAX_ENHANCEMENT_LEVEL,
} from '../../systems/enhancement';
import { EquipmentType, ItemStats } from '../../types/item';
import { formatExactNumber } from '../../utils/number';
import { EquipmentIcon } from '../common/EquipmentIcon';
import { Modal } from '../common/Modal';

interface EnhanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSlot?: EquipmentType;
}

export const EnhanceModal: React.FC<EnhanceModalProps> = ({
  isOpen,
  onClose,
  defaultSlot = 'weapon',
}) => {
  const {
    player,
    enhanceSlot,
    enhanceSlotMax,
    enhanceAllBalanced,
  } = useGameStore();

  const [selectedSlot, setSelectedSlot] = useState<EquipmentType>(defaultSlot);

  // Sync defaultSlot if changed when modal opens
  React.useEffect(() => {
    if (isOpen && defaultSlot) {
      setSelectedSlot(defaultSlot);
    }
  }, [isOpen, defaultSlot]);

  if (!isOpen) return null;

  const enhancements = player.enhancements ?? {
    weapon: 0,
    helmet: 0,
    armor: 0,
    boots: 0,
    ring: 0,
    artifact: 0,
  };

  const currentLevel = enhancements[selectedSlot] ?? 0;
  const isMaxLevel = currentLevel >= MAX_ENHANCEMENT_LEVEL;
  const currentTier = getEnhancementTier(currentLevel);
  const nextTier = getEnhancementTier(currentLevel + 1);
  const cost = getEnhancementCost(currentLevel);
  const canAfford = canAffordEnhancement(player.materials, cost);

  const currentStats = getSlotEnhancementStats(selectedSlot, currentLevel);
  const nextStats = getSlotEnhancementStats(selectedSlot, currentLevel + 1);

  const slotCfg = EQUIPMENT_CONFIG[selectedSlot];

  // Helper to render stats comparison
  const renderStatDiff = (
    label: string,
    currentVal?: number,
    nextVal?: number,
    suffix = ''
  ) => {
    if (currentVal === undefined && nextVal === undefined) return null;
    const cur = currentVal ?? 0;
    const nxt = nextVal ?? 0;
    const diff = nxt - cur;
    return (
      <div className="flex items-center justify-between text-xs py-1">
        <span className="text-slate-400">{label}</span>
        <div className="flex items-center gap-2 font-mono-num">
          <span className="text-slate-300">
            +{cur}
            {suffix}
          </span>
          <ChevronRight className="w-3 h-3 text-slate-500" />
          <span className="font-semibold text-amber-300">
            +{nxt}
            {suffix}
          </span>
          {diff > 0 && (
            <span className="text-[10px] text-emerald-400 font-medium">
              (+{diff}
              {suffix})
            </span>
          )}
        </div>
      </div>
    );
  };

  // Materials cost item component
  const renderCostItem = (
    label: string,
    needed: number,
    owned: number,
    colorClass: string
  ) => {
    if (needed <= 0) return null;
    const hasEnough = owned >= needed;
    return (
      <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col items-center text-center">
        <span className="text-[10px] text-slate-400">{label}</span>
        <div className="mt-0.5 text-xs font-mono-num font-semibold">
          <span className={hasEnough ? colorClass : 'text-rose-400'}>
            {formatExactNumber(needed)}
          </span>
        </div>
        <span className="text-[9px] text-slate-500 font-mono-num mt-0.5">
          Có: {formatExactNumber(owned)}
        </span>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Luyện Trận Bổn Mệnh"
    >
      <div className="space-y-3.5 text-sm">
        {/* Intro notice */}
        <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            Cường hóa trực tiếp vào <strong>6 Ô Trận Pháp</strong>. Khi thay đổi
            trang bị mới, cấp cường hóa <strong>giữ nguyên vĩnh viễn</strong>.
          </p>
        </div>

        {/* 6 Slot Selector Strip */}
        <div className="grid grid-cols-6 gap-1.5">
          {EQUIPMENT_SLOTS_LIST.map((slot) => {
            const lvl = enhancements[slot] ?? 0;
            const isSelected = slot === selectedSlot;
            const tier = getEnhancementTier(lvl);
            const slotInfo = EQUIPMENT_CONFIG[slot];

            return (
              <button
                key={slot}
                type="button"
                onClick={() => setSelectedSlot(slot)}
                className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <EquipmentIcon type={slot} rarity="white" size={18} />
                <span className="text-[10px] font-medium mt-0.5 truncate w-full text-center">
                  {slotInfo.shortLabel}
                </span>
                <span
                  className={`text-[9px] font-mono-num font-bold px-1 rounded ${
                    lvl > 0 ? tier.textColor : 'text-slate-500'
                  }`}
                >
                  +{lvl}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Slot Enhancement Card */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          {/* Slot Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-10 h-10 rounded-xl bg-slate-950 border ${currentTier.borderColor} ${currentTier.glowClass} flex items-center justify-center`}
              >
                <EquipmentIcon type={selectedSlot} rarity="white" size={22} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">
                  {slotCfg.label}
                </h4>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className={`font-semibold ${currentTier.textColor}`}>
                    {currentTier.tierName}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="font-mono-num font-bold text-amber-300">
                    Cấp +{currentLevel} / {MAX_ENHANCEMENT_LEVEL}
                  </span>
                </div>
              </div>
            </div>

            {!isMaxLevel && (
              <div className="text-right">
                <span className="text-[10px] text-slate-400">Tiếp theo</span>
                <div className={`text-xs font-bold ${nextTier.textColor}`}>
                  +{currentLevel + 1}
                </div>
              </div>
            )}
          </div>

          {/* Stats Preview */}
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 divide-y divide-slate-800/60">
            <div className="text-[11px] font-semibold text-slate-300 pb-1 flex items-center justify-between">
              <span>Thuộc Tính Trận Pháp Gia Trì</span>
              {!isMaxLevel && (
                <span className="text-[10px] text-emerald-400 font-normal">
                  Tăng theo cấp cường hóa
                </span>
              )}
            </div>

            {renderStatDiff(
              'Công Kích (ATK)',
              currentStats.atk,
              nextStats.atk
            )}
            {renderStatDiff(
              'Sinh Lực (HP)',
              currentStats.hp,
              nextStats.hp
            )}
            {renderStatDiff(
              'Phòng Thủ (DEF)',
              currentStats.def,
              nextStats.def
            )}
            {renderStatDiff(
              'Tỷ Lệ Bạo Kích',
              currentStats.critRate,
              nextStats.critRate,
              '%'
            )}
            {renderStatDiff(
              'Sát Thương Bạo Kích',
              currentStats.critDamage,
              nextStats.critDamage,
              '%'
            )}
            {renderStatDiff(
              'Tốc Độ Xuất Chiêu',
              currentStats.attackSpeed,
              nextStats.attackSpeed
            )}
            {renderStatDiff(
              'Tốc Độ Tu Luyện',
              currentStats.cultivationRate,
              nextStats.cultivationRate,
              '/s'
            )}
          </div>

          {/* Material Cost Breakdown */}
          {!isMaxLevel ? (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400">
                Nguyên Liệu Cần Tiêu Hao (+1 Cấp):
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {renderCostItem(
                  'Linh Thiết',
                  cost.basicMaterial,
                  player.materials.basicMaterial,
                  'text-slate-200'
                )}
                {renderCostItem(
                  'Linh Thạch',
                  cost.linhStone,
                  player.materials.linhStone,
                  'text-emerald-300'
                )}
                {renderCostItem(
                  'Huyền Tinh',
                  cost.advancedMaterial,
                  player.materials.advancedMaterial,
                  'text-sky-300'
                )}
                {renderCostItem(
                  'Tiên Ngọc',
                  cost.rareMaterial,
                  player.materials.rareMaterial,
                  'text-amber-300'
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center text-xs text-amber-200 font-semibold flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-300" />
              <span>Đã đạt cảnh giới Cường Hóa tối đa (+50)!</span>
            </div>
          )}

          {/* Enhancement Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={isMaxLevel || !canAfford}
              onClick={() => enhanceSlot(selectedSlot)}
              className={`min-h-[44px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isMaxLevel
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : canAfford
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  : 'bg-slate-800 text-slate-400 border border-slate-700/60 opacity-60'
              }`}
            >
              <Anvil className="w-4 h-4" />
              <span>Cường Hóa +1</span>
            </button>

            <button
              type="button"
              disabled={isMaxLevel || !canAfford}
              onClick={() => enhanceSlotMax(selectedSlot)}
              className={`min-h-[44px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isMaxLevel || !canAfford
                  ? 'bg-slate-800/80 text-slate-500 border border-slate-800 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 hover:border-amber-400'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Cường Hóa Max</span>
            </button>
          </div>
        </div>

        {/* Global Auto-Balance 6 Slots Action */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-slate-200">
              Cường Hóa Cân Bằng 6 Ô
            </div>
            <div className="text-[10px] text-slate-400">
              Tự động nâng ô cấp thấp nhất trước
            </div>
          </div>
          <button
            type="button"
            onClick={() => enhanceAllBalanced()}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Nâng Đều 6 Ô</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
