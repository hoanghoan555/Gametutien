import { EquipmentSlots, Item, DismantleMaterials } from './item';

export interface PlayerStats {
  atk: number;
  hp: number;
  def: number;
  critRate: number;
  critDamage: number;
  attackSpeed: number;
  cultivationRate: number;
  towerExpBonus: number;
  lootRate: number;
}

export interface PlayerState {
  level: number;
  cultivationExp: number;
  cultivationExpToNext: number;
  power: number;
  stats: PlayerStats;
  equipment: EquipmentSlots;
  inventory: Item[];
  materials: DismantleMaterials;
  contribution: number;
  autoCultivation: boolean;
}
