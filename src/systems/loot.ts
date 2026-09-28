import { AFFIX_CONFIGS } from '../data/affixes';
import {
  EQUIPMENT_CONFIG,
  EQUIPMENT_SLOTS_LIST,
  ITEM_PREFIXES_BY_RARITY,
  SPECIAL_EFFECTS_POOL,
} from '../data/equipment';
import { LOOT_DROP_TABLE } from '../data/lootTables';
import { RARITY_CONFIG } from '../data/rarities';
import {
  Affix,
  EquipmentType,
  Item,
  ItemStats,
  Rarity,
  SpecialEffect,
} from '../types/item';
import {
  createUniqueId,
  pickRandom,
  pickUniqueRandom,
  randomFloat,
} from '../utils/random';

export function rollRarity(): Rarity {
  const totalWeight = LOOT_DROP_TABLE.reduce((sum, entry) => sum + entry.probability, 0);
  let roll = randomFloat(0, totalWeight);

  for (const entry of LOOT_DROP_TABLE) {
    if (roll < entry.probability) {
      return entry.rarity;
    }
    roll -= entry.probability;
  }

  return 'white';
}

export function rollEquipmentType(): EquipmentType {
  return pickRandom(EQUIPMENT_SLOTS_LIST);
}

export function rollAffixes(rarity: Rarity, level: number): Affix[] {
  const count = RARITY_CONFIG[rarity].affixCount;
  if (count <= 0) return [];

  const chosenConfigs = pickUniqueRandom(AFFIX_CONFIGS, count);
  const rarityMultiplier = RARITY_CONFIG[rarity].multiplier;

  return chosenConfigs.map((cfg) => {
    const baseRoll = randomFloat(cfg.minBase, cfg.maxBase);
    const levelBonus = Math.min(level * cfg.levelScaling, cfg.maxBase * 2.5);
    const rawValue = (baseRoll + levelBonus * 0.35) * (0.85 + rarityMultiplier * 0.15);
    const roundedValue = Math.max(1, Math.round(rawValue * 10) / 10);

    return {
      type: cfg.type,
      label: cfg.label,
      value: roundedValue,
      isPercent: cfg.isPercent,
    };
  });
}

export function rollSpecialEffect(rarity: Rarity): SpecialEffect | undefined {
  if (rarity === 'orange') {
    // 65% cơ hội có hiệu ứng đặc biệt cho trang bị Cam
    if (randomFloat(0, 1) <= 0.65) {
      return pickRandom(SPECIAL_EFFECTS_POOL.orange);
    }
  }
  if (rarity === 'red') {
    // 100% cơ hội có hiệu ứng Tiên Đạo cho trang bị Đỏ
    return pickRandom(SPECIAL_EFFECTS_POOL.red);
  }
  return undefined;
}

export function calculateItemPower(
  baseStats: ItemStats,
  affixes: Affix[],
  rarity: Rarity,
  level: number,
  specialEffect?: SpecialEffect
): number {
  const atkScore = (baseStats.atk ?? 0) * 1.2;
  const hpScore = (baseStats.hp ?? 0) / 8;
  const defScore = (baseStats.def ?? 0) * 2.0;
  const critScore = (baseStats.critRate ?? 0) * 35;
  const speedScore = (baseStats.attackSpeed ?? 0) * 40;
  const cultScore = (baseStats.cultivationRate ?? 0) * 45;

  const baseTotal = atkScore + hpScore + defScore + critScore + speedScore + cultScore;

  let affixMultiplier = 1;
  for (const affix of affixes) {
    affixMultiplier += (affix.value / 100) * 0.85;
  }

  const specialBonus = specialEffect
    ? specialEffect.rarity === 'red'
      ? 1.18
      : 1.08
    : 1.0;

  const rarityBaseline = RARITY_CONFIG[rarity].multiplier * level * 2;

  return Math.max(
    10,
    Math.floor((baseTotal * affixMultiplier + rarityBaseline) * specialBonus)
  );
}

export function generateItemName(type: EquipmentType, rarity: Rarity): string {
  const prefix = pickRandom(ITEM_PREFIXES_BY_RARITY[rarity]);
  const baseName = pickRandom(EQUIPMENT_CONFIG[type].baseNames);
  return `${prefix} ${baseName}`;
}

/**
 * Core Rule: Item level luôn bằng Tower level tại thời điểm loot được sinh ra.
 */
export function generateLootItem(
  towerLevel: number,
  forcedRarity?: Rarity,
  forcedType?: EquipmentType
): Item {
  const itemLevel = Math.max(1, Math.floor(towerLevel));
  const rarity = forcedRarity ?? rollRarity();
  const type = forcedType ?? rollEquipmentType();

  const rarityMultiplier = RARITY_CONFIG[rarity].multiplier;
  const basePower = Math.floor(10 * Math.pow(itemLevel, 1.35));
  const dist = EQUIPMENT_CONFIG[type].statDistribution;

  const rollStatValue = (weight: number): number => {
    const variation = randomFloat(0.95, 1.05);
    const raw = basePower * weight * rarityMultiplier * variation;
    return Math.max(1, Math.floor(raw));
  };

  const baseStats: ItemStats = {};
  if (dist.atk) baseStats.atk = rollStatValue(dist.atk);
  if (dist.hp) baseStats.hp = rollStatValue(dist.hp);
  if (dist.def) baseStats.def = rollStatValue(dist.def);
  if (dist.critRate) {
    const variation = randomFloat(0.95, 1.05);
    baseStats.critRate = Math.max(
      1,
      Math.round((2 + itemLevel * 0.15) * rarityMultiplier * variation * 10) / 10
    );
  }
  if (dist.attackSpeed) {
    const variation = randomFloat(0.95, 1.05);
    baseStats.attackSpeed = Math.max(
      1,
      Math.round((1.5 + itemLevel * 0.1) * rarityMultiplier * variation * 10) / 10
    );
  }
  if (dist.cultivationRate) {
    const variation = randomFloat(0.95, 1.05);
    baseStats.cultivationRate = Math.max(
      0.2,
      Math.round((0.4 + itemLevel * 0.05) * rarityMultiplier * variation * 10) / 10
    );
  }

  const affixes = rollAffixes(rarity, itemLevel);
  const specialEffect = rollSpecialEffect(rarity);
  const power = calculateItemPower(baseStats, affixes, rarity, itemLevel, specialEffect);

  return {
    id: createUniqueId('item'),
    name: generateItemName(type, rarity),
    type,
    level: itemLevel,
    rarity,
    power,
    baseStats,
    affixes,
    specialEffect,
    createdAt: Date.now(),
  };
}
