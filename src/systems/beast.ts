import { BEAST_CONFIGS, BEAST_IDS } from '../data/beasts';
import { BeastId, PlayerBeastRecord, PlayerBeastState } from '../types/beast';
import { DismantleMaterials, ItemStats } from '../types/item';
import { PlayerState } from '../types/player';
import { calculateStatsAndPower } from './progression';

export const MAX_BEAST_LEVEL = 50;

export function createInitialBeastState(): PlayerBeastState {
  const beasts = {} as Record<BeastId, PlayerBeastRecord>;
  for (const id of BEAST_IDS) {
    beasts[id] = {
      unlocked: false,
      level: 0,
    };
  }
  return {
    activeBeastId: null,
    beasts,
  };
}

export function getBeastStats(id: BeastId, level: number): ItemStats {
  if (level <= 0) return {};
  const cfg = BEAST_CONFIGS[id];
  const stats: ItemStats = {};

  const keys: Array<keyof ItemStats> = [
    'atk',
    'hp',
    'def',
    'critRate',
    'critDamage',
    'attackSpeed',
    'cultivationRate',
  ];

  for (const key of keys) {
    const base = cfg.baseStats[key] ?? 0;
    const growth = cfg.growthPerLevel[key] ?? 0;
    const total = base + growth * (level - 1);
    if (total > 0) {
      stats[key] = Math.round(total * 100) / 100;
    }
  }

  return stats;
}

export interface BeastUpgradeCost {
  basicMaterial: number;
  linhStone: number;
  advancedMaterial: number;
}

export function getBeastUpgradeCost(currentLevel: number): BeastUpgradeCost {
  if (currentLevel >= MAX_BEAST_LEVEL) {
    return { basicMaterial: 0, linhStone: 0, advancedMaterial: 0 };
  }
  const lvl = currentLevel;
  return {
    basicMaterial: Math.floor(120 * Math.pow(lvl + 1, 1.35)),
    linhStone: Math.floor(50 * Math.pow(lvl + 1, 1.4)),
    advancedMaterial: lvl >= 10 && lvl % 5 === 0 ? Math.floor(lvl * 1.5) : 0,
  };
}

export interface HatchEggCost {
  basicMaterial: number;
  linhStone: number;
}

export const HATCH_EGG_COST: HatchEggCost = {
  basicMaterial: 800,
  linhStone: 300,
};

export function canAffordMaterials(
  materials: DismantleMaterials,
  cost: { basicMaterial?: number; linhStone?: number; advancedMaterial?: number }
): boolean {
  if (cost.basicMaterial && materials.basicMaterial < cost.basicMaterial) return false;
  if (cost.linhStone && materials.linhStone < cost.linhStone) return false;
  if (cost.advancedMaterial && materials.advancedMaterial < cost.advancedMaterial) return false;
  return true;
}

export interface HatchResult {
  beastId: BeastId;
  isFirstUnlock: boolean;
  player: PlayerState;
}

export function hatchSpiritEgg(player: PlayerState): HatchResult | { error: string } {
  if (!canAffordMaterials(player.materials, HATCH_EGG_COST)) {
    return { error: 'Không đủ Linh Thiết hoặc Linh Thạch để Ấp Trứng!' };
  }

  // Weight table
  // thien_ho (blue): 42%, ky_lan (purple): 28%, huyen_vu (purple): 18%, chu_tuoc (orange): 7%, bach_ho (orange): 4%, thanh_long (red): 1%
  const rand = Math.random() * 100;
  let targetId: BeastId = 'thien_ho';
  if (rand < 1) {
    targetId = 'thanh_long';
  } else if (rand < 5) {
    targetId = 'bach_ho';
  } else if (rand < 12) {
    targetId = 'chu_tuoc';
  } else if (rand < 30) {
    targetId = 'huyen_vu';
  } else if (rand < 58) {
    targetId = 'ky_lan';
  } else {
    targetId = 'thien_ho';
  }

  const currentBeastState = player.beastState ?? createInitialBeastState();
  const existingRecord = currentBeastState.beasts[targetId] ?? { unlocked: false, level: 0 };
  const isFirstUnlock = !existingRecord.unlocked;

  const nextLevel = isFirstUnlock
    ? 1
    : Math.min(MAX_BEAST_LEVEL, existingRecord.level + 1);

  const nextBeasts = {
    ...currentBeastState.beasts,
    [targetId]: {
      unlocked: true,
      level: nextLevel,
    },
  };

  // If player had no active beast and this is unlocked, automatically deploy
  const nextActive = currentBeastState.activeBeastId ?? targetId;

  const nextBeastState: PlayerBeastState = {
    activeBeastId: nextActive,
    beasts: nextBeasts,
  };

  const nextMaterials: DismantleMaterials = {
    ...player.materials,
    basicMaterial: Math.max(0, player.materials.basicMaterial - HATCH_EGG_COST.basicMaterial),
    linhStone: Math.max(0, player.materials.linhStone - HATCH_EGG_COST.linhStone),
  };

  const { stats, power } = calculateStatsAndPower(
    player.level,
    player.equipment,
    player.enhancements,
    nextBeastState
  );

  const updatedPlayer: PlayerState = {
    ...player,
    materials: nextMaterials,
    beastState: nextBeastState,
    stats,
    power,
  };

  return {
    beastId: targetId,
    isFirstUnlock,
    player: updatedPlayer,
  };
}

export function upgradeBeast(
  player: PlayerState,
  beastId: BeastId
): { player: PlayerState; success: boolean; error?: string } {
  const currentBeastState = player.beastState ?? createInitialBeastState();
  const record = currentBeastState.beasts[beastId];

  if (!record || !record.unlocked) {
    return { player, success: false, error: 'Chưa thức tỉnh Thần Thú này!' };
  }

  if (record.level >= MAX_BEAST_LEVEL) {
    return { player, success: false, error: 'Thần Thú đã đạt cấp tối đa!' };
  }

  const cost = getBeastUpgradeCost(record.level);
  if (!canAffordMaterials(player.materials, cost)) {
    return { player, success: false, error: 'Không đủ nguyên liệu để Bồi Dưỡng!' };
  }

  const nextMaterials: DismantleMaterials = {
    ...player.materials,
    basicMaterial: Math.max(0, player.materials.basicMaterial - cost.basicMaterial),
    linhStone: Math.max(0, player.materials.linhStone - cost.linhStone),
    advancedMaterial: Math.max(0, player.materials.advancedMaterial - cost.advancedMaterial),
  };

  const nextBeastState: PlayerBeastState = {
    ...currentBeastState,
    beasts: {
      ...currentBeastState.beasts,
      [beastId]: {
        ...record,
        level: record.level + 1,
      },
    },
  };

  const { stats, power } = calculateStatsAndPower(
    player.level,
    player.equipment,
    player.enhancements,
    nextBeastState
  );

  return {
    player: {
      ...player,
      materials: nextMaterials,
      beastState: nextBeastState,
      stats,
      power,
    },
    success: true,
  };
}

export function deployBeast(
  player: PlayerState,
  beastId: BeastId | null
): PlayerState {
  const currentBeastState = player.beastState ?? createInitialBeastState();
  const nextBeastState: PlayerBeastState = {
    ...currentBeastState,
    activeBeastId: beastId,
  };

  const { stats, power } = calculateStatsAndPower(
    player.level,
    player.equipment,
    player.enhancements,
    nextBeastState
  );

  return {
    ...player,
    beastState: nextBeastState,
    stats,
    power,
  };
}
