import { ItemStats } from './item';

export type BeastId =
  | 'thanh_long'
  | 'bach_ho'
  | 'chu_tuoc'
  | 'huyen_vu'
  | 'ky_lan'
  | 'thien_ho';

export type BeastRarity = 'blue' | 'purple' | 'orange' | 'red';

export type BeastElement = 'wood' | 'metal' | 'fire' | 'water' | 'earth' | 'spirit';

export interface BeastConfig {
  id: BeastId;
  name: string;
  title: string;
  element: BeastElement;
  elementName: string;
  elementColor: string;
  rarity: BeastRarity;
  description: string;
  iconName: string;
  skillName: string;
  skillDesc: string;
  baseStats: ItemStats;
  growthPerLevel: ItemStats;
  dialogue: string[];
}

export interface PlayerBeastRecord {
  unlocked: boolean;
  level: number;
}

export interface PlayerBeastState {
  activeBeastId: BeastId | null;
  beasts: Record<BeastId, PlayerBeastRecord>;
}
