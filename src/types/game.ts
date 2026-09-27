import { Item, Rarity, EquipmentType, DismantleMaterials } from './item';
import { PlayerState } from './player';
import { TowerState } from './tower';

export type NavigationTab = 'tower' | 'character' | 'inventory' | 'beast';

export interface FloatingContribution {
  id: string;
  towerExp: number;
  playerExp: number;
  isBurst?: boolean;
  xOffset: number;
  createdAt: number;
}

export interface FlyingLootItem {
  id: string;
  item: Item;
  autoEquipped: boolean;
  powerDelta: number;
  createdAt: number;
}

export interface OfflineRewardSummary {
  elapsedSeconds: number;
  actionsCount: number;
  playerExpGained: number;
  towerExpGained: number;
  towerLevelsGained: number;
  itemsGenerated: Item[];
  autoEquippedCount: number;
  dismantledCount: number;
}

export interface SettingsState {
  autoEquip: boolean;
  autoDismantle: boolean;
  autoDismantleMaxRarity: Rarity;
  soundEnabled: boolean;
}

export interface SaveDataV1 {
  version: 1;
  player: PlayerState;
  tower: TowerState;
  settings: SettingsState;
  lastSavedAt: number;
}

export interface InventoryFilter {
  rarity: Rarity | 'all';
  type: EquipmentType | 'all';
}
