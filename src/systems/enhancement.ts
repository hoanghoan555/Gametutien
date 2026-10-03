import { EQUIPMENT_SLOTS_LIST } from '../data/equipment';
import { DismantleMaterials, EquipmentType, ItemStats } from '../types/item';
import { PlayerState } from '../types/player';
import { calculateStatsAndPower } from './progression';

export const MAX_ENHANCEMENT_LEVEL = 50;

export function createEmptyEnhancements(): Record<EquipmentType, number> {
  return {
    weapon: 0,
    helmet: 0,
    armor: 0,
    boots: 0,
    ring: 0,
    artifact: 0,
  };
}

export interface EnhancementCost {
  basicMaterial: number;
  linhStone: number;
  advancedMaterial: number;
  rareMaterial: number;
}

export interface EnhancementTier {
  tierName: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  glowClass: string;
  glowShadow: string;
}

export function getEnhancementTier(level: number): EnhancementTier {
  if (level <= 0) {
    return {
      tierName: 'Phàm Trận',
      badgeBg: 'bg-slate-800/80',
      textColor: 'text-slate-400',
      borderColor: 'border-slate-700/60',
      glowClass: '',
      glowShadow: '',
    };
  }
  if (level <= 10) {
    return {
      tierName: 'Khí Linh',
      badgeBg: 'bg-emerald-950/80',
      textColor: 'text-emerald-300',
      borderColor: 'border-emerald-500/60',
      glowClass: 'shadow-[0_0_10px_rgba(16,185,129,0.25)]',
      glowShadow: 'rgba(16,185,129,0.3)',
    };
  }
  if (level <= 20) {
    return {
      tierName: 'Huyền Linh',
      badgeBg: 'bg-sky-950/80',
      textColor: 'text-sky-300',
      borderColor: 'border-sky-500/60',
      glowClass: 'shadow-[0_0_12px_rgba(14,165,233,0.35)]',
      glowShadow: 'rgba(14,165,233,0.4)',
    };
  }
  if (level <= 30) {
    return {
      tierName: 'Địa Linh',
      badgeBg: 'bg-purple-950/80',
      textColor: 'text-purple-300',
      borderColor: 'border-purple-500/60',
      glowClass: 'shadow-[0_0_14px_rgba(168,85,247,0.4)]',
      glowShadow: 'rgba(168,85,247,0.45)',
    };
  }
  if (level <= 40) {
    return {
      tierName: 'Thiên Linh',
      badgeBg: 'bg-amber-950/80',
      textColor: 'text-amber-300',
      borderColor: 'border-amber-400/70',
      glowClass: 'shadow-[0_0_16px_rgba(251,191,36,0.5)]',
      glowShadow: 'rgba(251,191,36,0.55)',
    };
  }
  return {
    tierName: 'Thần Tiên',
    badgeBg: 'bg-rose-950/90',
    textColor: 'text-rose-300',
    borderColor: 'border-rose-500/80',
    glowClass: 'shadow-[0_0_20px_rgba(244,63,94,0.65)] animate-pulse',
    glowShadow: 'rgba(244,63,94,0.7)',
  };
}

export function getSlotEnhancementStats(
  slot: EquipmentType,
  level: number
): ItemStats {
  if (level <= 0) return {};

  const stats: ItemStats = {};
  switch (slot) {
    case 'weapon':
      stats.atk = level * 25;
      if (level >= 10) stats.critRate = Math.round((level - 9) * 0.2 * 10) / 10;
      if (level >= 25) stats.critDamage = Math.round((level - 24) * 0.5 * 10) / 10;
      break;
    case 'helmet':
      stats.hp = level * 160;
      stats.def = level * 12;
      break;
    case 'armor':
      stats.hp = level * 220;
      stats.def = level * 18;
      break;
    case 'boots':
      stats.def = level * 14;
      stats.attackSpeed = Math.round(level * 0.02 * 100) / 100;
      break;
    case 'ring':
      stats.atk = level * 16;
      stats.critRate = Math.round(level * 0.2 * 10) / 10;
      if (level >= 15) stats.critDamage = Math.round((level - 14) * 0.5 * 10) / 10;
      break;
    case 'artifact':
      stats.atk = level * 14;
      stats.hp = level * 90;
      stats.cultivationRate = Math.round(level * 0.05 * 10) / 10;
      break;
  }
  return stats;
}

export function getEnhancementCost(currentLevel: number): EnhancementCost {
  if (currentLevel >= MAX_ENHANCEMENT_LEVEL) {
    return { basicMaterial: 0, linhStone: 0, advancedMaterial: 0, rareMaterial: 0 };
  }

  const lvl = currentLevel;
  return {
    basicMaterial: Math.floor(80 * Math.pow(lvl + 1, 1.4)),
    linhStone: lvl >= 3 ? Math.floor(20 * Math.pow(lvl - 2, 1.35)) : 0,
    advancedMaterial: lvl >= 8 ? Math.floor(6 * Math.pow(lvl - 7, 1.3)) : 0,
    rareMaterial: lvl >= 15 ? Math.floor(2 * Math.pow(lvl - 14, 1.25)) : 0,
  };
}

export function canAffordEnhancement(
  materials: DismantleMaterials,
  cost: EnhancementCost
): boolean {
  return (
    materials.basicMaterial >= cost.basicMaterial &&
    materials.linhStone >= cost.linhStone &&
    materials.advancedMaterial >= cost.advancedMaterial &&
    materials.rareMaterial >= cost.rareMaterial
  );
}

export function deductEnhancementCost(
  materials: DismantleMaterials,
  cost: EnhancementCost
): DismantleMaterials {
  return {
    basicMaterial: Math.max(0, materials.basicMaterial - cost.basicMaterial),
    linhStone: Math.max(0, materials.linhStone - cost.linhStone),
    advancedMaterial: Math.max(0, materials.advancedMaterial - cost.advancedMaterial),
    rareMaterial: Math.max(0, materials.rareMaterial - cost.rareMaterial),
  };
}

export interface EnhanceSlotResult {
  player: PlayerState;
  success: boolean;
  levelsGained: number;
  costSpent: EnhancementCost;
  error?: string;
}

export function enhanceSlotOnce(
  player: PlayerState,
  slot: EquipmentType
): EnhanceSlotResult {
  const currentEnhancements = player.enhancements ?? createEmptyEnhancements();
  const currentLevel = currentEnhancements[slot] ?? 0;

  if (currentLevel >= MAX_ENHANCEMENT_LEVEL) {
    return {
      player,
      success: false,
      levelsGained: 0,
      costSpent: { basicMaterial: 0, linhStone: 0, advancedMaterial: 0, rareMaterial: 0 },
      error: `Ô này đã đạt cấp tối đa (+${MAX_ENHANCEMENT_LEVEL})!`,
    };
  }

  const cost = getEnhancementCost(currentLevel);
  if (!canAffordEnhancement(player.materials, cost)) {
    return {
      player,
      success: false,
      levelsGained: 0,
      costSpent: { basicMaterial: 0, linhStone: 0, advancedMaterial: 0, rareMaterial: 0 },
      error: 'Không đủ nguyên liệu để Cường Hóa!',
    };
  }

  const nextMaterials = deductEnhancementCost(player.materials, cost);
  const nextEnhancements = {
    ...currentEnhancements,
    [slot]: currentLevel + 1,
  };

  const { stats, power } = calculateStatsAndPower(
    player.level,
    player.equipment,
    nextEnhancements
  );

  const updatedPlayer: PlayerState = {
    ...player,
    materials: nextMaterials,
    enhancements: nextEnhancements,
    stats,
    power,
  };

  return {
    player: updatedPlayer,
    success: true,
    levelsGained: 1,
    costSpent: cost,
  };
}

export function enhanceSlotMax(
  player: PlayerState,
  slot: EquipmentType
): EnhanceSlotResult {
  let curPlayer = player;
  let levelsGained = 0;
  const totalCost: EnhancementCost = {
    basicMaterial: 0,
    linhStone: 0,
    advancedMaterial: 0,
    rareMaterial: 0,
  };

  while (true) {
    const currentEnhancements = curPlayer.enhancements ?? createEmptyEnhancements();
    const currentLevel = currentEnhancements[slot] ?? 0;
    if (currentLevel >= MAX_ENHANCEMENT_LEVEL) break;

    const cost = getEnhancementCost(currentLevel);
    if (!canAffordEnhancement(curPlayer.materials, cost)) break;

    const res = enhanceSlotOnce(curPlayer, slot);
    if (!res.success) break;

    curPlayer = res.player;
    levelsGained += 1;
    totalCost.basicMaterial += res.costSpent.basicMaterial;
    totalCost.linhStone += res.costSpent.linhStone;
    totalCost.advancedMaterial += res.costSpent.advancedMaterial;
    totalCost.rareMaterial += res.costSpent.rareMaterial;
  }

  return {
    player: curPlayer,
    success: levelsGained > 0,
    levelsGained,
    costSpent: totalCost,
    error: levelsGained === 0 ? 'Không đủ nguyên liệu để Cường Hóa!' : undefined,
  };
}

export function enhanceAllBalanced(player: PlayerState): {
  player: PlayerState;
  totalLevelsGained: number;
} {
  let curPlayer = player;
  let totalLevelsGained = 0;

  // Thuật toán: Luôn tìm ô có cấp cường hóa thấp nhất để nâng trước, tạo sự đồng đều 6 ô
  while (true) {
    const currentEnhancements = curPlayer.enhancements ?? createEmptyEnhancements();
    let minSlot: EquipmentType | null = null;
    let minLevel = Infinity;

    for (const slot of EQUIPMENT_SLOTS_LIST) {
      const lvl = currentEnhancements[slot] ?? 0;
      if (lvl < MAX_ENHANCEMENT_LEVEL && lvl < minLevel) {
        minLevel = lvl;
        minSlot = slot;
      }
    }

    if (!minSlot) break; // All maxed

    const cost = getEnhancementCost(minLevel);
    if (!canAffordEnhancement(curPlayer.materials, cost)) break;

    const res = enhanceSlotOnce(curPlayer, minSlot);
    if (!res.success) break;

    curPlayer = res.player;
    totalLevelsGained += 1;
  }

  return { player: curPlayer, totalLevelsGained };
}
