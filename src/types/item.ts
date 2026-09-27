export type Rarity =
  | 'white'
  | 'green'
  | 'blue'
  | 'purple'
  | 'orange'
  | 'red';

export type EquipmentType =
  | 'weapon'
  | 'helmet'
  | 'armor'
  | 'boots'
  | 'ring'
  | 'artifact';

export type AffixType =
  | 'ATK_PERCENT'
  | 'HP_PERCENT'
  | 'DEF_PERCENT'
  | 'CRIT_RATE'
  | 'CRIT_DAMAGE'
  | 'ATTACK_SPEED'
  | 'CULTIVATION_RATE'
  | 'TOWER_EXP'
  | 'LOOT_RATE';

export interface ItemStats {
  atk?: number;
  hp?: number;
  def?: number;
  critRate?: number;
  critDamage?: number;
  attackSpeed?: number;
  cultivationRate?: number;
}

export interface Affix {
  type: AffixType;
  label: string;
  value: number;
  isPercent: boolean;
}

export interface SpecialEffect {
  id: string;
  name: string;
  description: string;
  rarity: 'orange' | 'red';
}

export interface Item {
  id: string;
  name: string;
  type: EquipmentType;
  level: number;
  rarity: Rarity;
  power: number;
  baseStats: ItemStats;
  affixes: Affix[];
  specialEffect?: SpecialEffect;
  createdAt: number;
}

export type EquipmentSlots = Record<EquipmentType, Item | null>;

export interface DismantleMaterials {
  basicMaterial: number;     // Linh Thiết
  linhStone: number;         // Linh Thạch
  advancedMaterial: number;  // Huyền Tinh
  rareMaterial: number;      // Tiên Ngọc
}
