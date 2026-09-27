import { DISMANTLE_REWARD_TABLE } from '../data/lootTables';
import { RARITY_CONFIG } from '../data/rarities';
import {
  DismantleMaterials,
  EquipmentSlots,
  Item,
  Rarity,
} from '../types/item';

export const MAX_INVENTORY_SLOTS = 100;

export function createEmptyEquipmentSlots(): EquipmentSlots {
  return {
    weapon: null,
    helmet: null,
    armor: null,
    boots: null,
    ring: null,
    artifact: null,
  };
}

export function createEmptyMaterials(): DismantleMaterials {
  return {
    basicMaterial: 0,
    linhStone: 0,
    advancedMaterial: 0,
    rareMaterial: 0,
  };
}

export function getDismantleReward(item: Item): DismantleMaterials {
  const base = DISMANTLE_REWARD_TABLE[item.rarity];
  const levelFactor = Math.max(1, Math.floor(1 + item.level * 0.15));
  return {
    basicMaterial: base.basicMaterial * levelFactor,
    linhStone: base.linhStone * levelFactor,
    advancedMaterial: base.advancedMaterial * levelFactor,
    rareMaterial: base.rareMaterial * levelFactor,
  };
}

export function addMaterials(
  current: DismantleMaterials,
  delta: DismantleMaterials
): DismantleMaterials {
  return {
    basicMaterial: current.basicMaterial + delta.basicMaterial,
    linhStone: current.linhStone + delta.linhStone,
    advancedMaterial: current.advancedMaterial + delta.advancedMaterial,
    rareMaterial: current.rareMaterial + delta.rareMaterial,
  };
}

/**
 * Rule 14: Không cho auto-dismantle Red.
 */
export function canAutoDismantle(item: Item, maxRarity: Rarity): boolean {
  if (item.rarity === 'red') return false;
  return RARITY_CONFIG[item.rarity].order <= RARITY_CONFIG[maxRarity].order;
}
