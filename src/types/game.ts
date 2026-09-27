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
  /** Danh sách rút gọn (tối đa 40 vật phẩm tiêu biểu) để hiển thị UI. */
  itemsGenerated: Item[];
  /** Tổng số vật phẩm thực nhận trong toàn bộ thời gian offline. */
  itemsGeneratedTotal: number;
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
