import { Rarity, DismantleMaterials } from '../types/item';
import { RARITY_CONFIG, RARITY_ORDER } from './rarities';

export interface DropRateEntry {
  rarity: Rarity;
  probability: number; // percentage 0..100
}

export const LOOT_DROP_TABLE: DropRateEntry[] = RARITY_ORDER.map((rarity) => ({
  rarity,
  probability: RARITY_CONFIG[rarity].dropWeight,
}));

export const DISMANTLE_REWARD_TABLE: Record<Rarity, DismantleMaterials> = {
  white: {
    basicMaterial: 2,
    linhStone: 0,
    advancedMaterial: 0,
    rareMaterial: 0,
  },
  green: {
    basicMaterial: 3,
    linhStone: 2,
    advancedMaterial: 0,
    rareMaterial: 0,
  },
  blue: {
    basicMaterial: 0,
    linhStone: 5,
    advancedMaterial: 2,
    rareMaterial: 0,
  },
  purple: {
    basicMaterial: 0,
    linhStone: 12,
    advancedMaterial: 4,
    rareMaterial: 1,
  },
  orange: {
    basicMaterial: 0,
    linhStone: 30,
    advancedMaterial: 8,
    rareMaterial: 4,
  },
  red: {
    basicMaterial: 0,
    linhStone: 80,
    advancedMaterial: 20,
    rareMaterial: 12,
  },
};
