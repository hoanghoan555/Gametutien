import { EQUIPMENT_SLOTS_LIST } from '../src/data/equipment';
import { RARITY_ORDER } from '../src/data/rarities';
import { cultivateTowerSystem } from '../src/systems/cultivation';
import { generateLootItem, rollRarity } from '../src/systems/loot';
import { createInitialPlayerState } from '../src/systems/progression';
import { createInitialTowerState } from '../src/systems/tower';
import { SettingsState } from '../src/types/game';
import { Item, Rarity } from '../src/types/item';
import { PlayerState } from '../src/types/player';
import { TowerState } from '../src/types/tower';

/**
 * GOLDEN SCENARIO (P5.1) — Khoá "draw-order" của loot trước/sau refactor RNG.
 *
 * Fixture `tests/fixtures/loot-golden.json` được sinh từ code TRƯỚC refactor bằng
 * `npm run gen:golden`; test `tests/loot-parity.test.ts` chạy lại đúng scenario này và
 * deep-compare. Bất kỳ thay đổi nào về thứ tự tiêu thụ RNG, công thức, hay hành vi mặc định
 * (client path dùng Math.random/Date.now) đều làm test đỏ — bảo vệ gate "không đổi balance".
 *
 * Lưu ý: các trường `id`/`createdAt` bị loại khỏi canonical (phụ thuộc Date.now());
 * mọi trường còn lại đều tất định khi cùng seed.
 */

export const GOLDEN_SEED_CULTIVATE = 20260928;
export const GOLDEN_SEED_ROLLS = 31415926;

const GOLDEN_SETTINGS: SettingsState = {
  autoEquip: true,
  autoDismantle: true,
  autoDismantleMaxRarity: 'green',
  soundEnabled: false,
};

function withSeededRandom<T>(seed: number, fn: () => T): T {
  const original = Math.random;
  let state = seed >>> 0;
  Math.random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

export function canonicalItem(item: Item) {
  return {
    name: item.name,
    type: item.type,
    level: item.level,
    rarity: item.rarity,
    power: item.power,
    baseStats: { ...item.baseStats },
    affixes: item.affixes.map((affix) => ({ ...affix })),
    specialEffect: item.specialEffect ? { ...item.specialEffect } : null,
  };
}

function canonicalPlayer(player: PlayerState) {
  return {
    level: player.level,
    cultivationExp: player.cultivationExp,
    cultivationExpToNext: player.cultivationExpToNext,
    power: player.power,
    stats: { ...player.stats },
    contribution: player.contribution,
    materials: { ...player.materials },
    equipment: Object.fromEntries(
      EQUIPMENT_SLOTS_LIST.map((slot) => [
        slot,
        player.equipment[slot] ? canonicalItem(player.equipment[slot]) : null,
      ])
    ),
    inventory: player.inventory.map(canonicalItem),
  };
}

function canonicalTower(tower: TowerState) {
  return {
    level: tower.level,
    currentExp: tower.currentExp,
    expToNextLevel: tower.expToNextLevel,
    lootProgress: tower.lootProgress,
    lootThreshold: tower.lootThreshold,
    totalCultivations: tower.totalCultivations,
  };
}

export function runGoldenScenario() {
  const cultivate = withSeededRandom(GOLDEN_SEED_CULTIVATE, () => {
    const player0 = createInitialPlayerState();
    const tower0: TowerState = { ...createInitialTowerState(), lootProgress: 90 };
    const result = cultivateTowerSystem(player0, tower0, GOLDEN_SETTINGS, 400);
    return {
      towerExpGain: result.towerExpGain,
      playerExpGain: result.playerExpGain,
      towerLevelsGained: result.towerLevelsGained,
      playerLevelsGained: result.playerLevelsGained,
      isBurst: result.isBurst,
      tower: canonicalTower(result.tower),
      player: canonicalPlayer(result.player),
      generated: result.generatedItems.map((entry) => ({
        item: canonicalItem(entry.item),
        autoEquipped: entry.autoEquipped,
        dismantled: entry.dismantled,
        powerDelta: entry.powerDelta,
      })),
    };
  });

  const rolls = withSeededRandom(GOLDEN_SEED_ROLLS, () => {
    const natural = Array.from({ length: 60 }, () => canonicalItem(generateLootItem(50)));
    const forcedType = EQUIPMENT_SLOTS_LIST.flatMap((slot) =>
      Array.from({ length: 4 }, () => canonicalItem(generateLootItem(80, undefined, slot)))
    );
    const forcedRarity = (['orange', 'red'] as Rarity[]).flatMap((rarity) =>
      Array.from({ length: 10 }, () => canonicalItem(generateLootItem(80, rarity)))
    );
    const rarityCounts = Object.fromEntries(
      RARITY_ORDER.map((rarity) => [rarity, 0])
    ) as Record<Rarity, number>;
    for (let i = 0; i < 2000; i += 1) rarityCounts[rollRarity()] += 1;
    return { natural, forcedType, forcedRarity, rarityCounts };
  });

  return {
    seedCultivate: GOLDEN_SEED_CULTIVATE,
    seedRolls: GOLDEN_SEED_ROLLS,
    cultivate,
    rolls,
  };
}
