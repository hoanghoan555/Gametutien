import { EQUIPMENT_SLOTS_LIST } from '../data/equipment';
import { RARITY_CONFIG } from '../data/rarities';
import { SettingsState } from '../types/game';
import { DismantleMaterials, Item } from '../types/item';
import { PlayerState } from '../types/player';
import { TowerState } from '../types/tower';
import {
  addMaterials,
  canAutoDismantle,
  getDismantleReward,
  MAX_INVENTORY_SLOTS,
} from './equipment';
import { generateLootItem } from './loot';
import {
  addPlayerCultivationExp,
  calculateStatsAndPower,
} from './progression';
import { addTowerExp } from './tower';

export interface SingleCultivationResult {
  player: PlayerState;
  tower: TowerState;
  towerExpGain: number;
  playerExpGain: number;
  towerLevelsGained: number;
  playerLevelsGained: number;
  isBurst: boolean;
  generatedItems: Array<{
    item: Item;
    autoEquipped: boolean;
    dismantled: boolean;
    powerDelta: number;
  }>;
}

// Section 18 — Cân bằng v1.1: đóng góp Đỉnh tăng dưới tuyến tính theo Power (tạo soft wall dài hạn).
const TOWER_CONTRIBUTION_BASE = 10;
const TOWER_CONTRIBUTION_POWER_EXPONENT = 0.6;
const TOWER_CONTRIBUTION_POWER_DIVISOR = 45;

// Section 20 — Cân bằng v1.1: Tu Luyện EXP tăng dưới tuyến tính theo Power (tránh Lv Nhân vật bùng nổ).
const PLAYER_EXP_POWER_EXPONENT = 0.6;
const PLAYER_EXP_POWER_DIVISOR = 30;

export function hasSpecialEffect(player: PlayerState, effectId: string): boolean {
  for (const slot of EQUIPMENT_SLOTS_LIST) {
    const item = player.equipment[slot];
    if (item?.specialEffect?.id === effectId) {
      return true;
    }
  }
  return false;
}

/**
 * Rule 14b (v1.2): Tiên Phẩm không bao giờ rơi mất. Khi túi đầy, nhường chỗ bằng cách
 * đẩy món yếu nhất KHÔNG phải Đỏ ra và phân giải nó (nhận nguyên liệu §15).
 * Trả về null nếu túi chỉ toàn Tiên Phẩm (hết chỗ nhường — nhánh không thể chạm tới).
 */
function evictWeakestNonRed(
  inventory: Item[],
  materials: DismantleMaterials
): { inventory: Item[]; materials: DismantleMaterials } | null {
  let weakestIndex = -1;

  for (let i = 0; i < inventory.length; i += 1) {
    const item = inventory[i];
    if (item.rarity === 'red') continue;
    if (weakestIndex === -1) {
      weakestIndex = i;
      continue;
    }

    const weakest = inventory[weakestIndex];
    const itemOrder = RARITY_CONFIG[item.rarity].order;
    const weakestOrder = RARITY_CONFIG[weakest.rarity].order;
    if (
      itemOrder < weakestOrder ||
      (itemOrder === weakestOrder && item.power < weakest.power)
    ) {
      weakestIndex = i;
    }
  }

  if (weakestIndex === -1) return null;

  const nextInventory = [...inventory];
  const [evicted] = nextInventory.splice(weakestIndex, 1);
  return {
    inventory: nextInventory,
    materials: addMaterials(materials, getDismantleReward(evicted)),
  };
}

/**
 * Section 12: Auto Equip dựa trên tổng Power thật (sau khi thay trang bị),
 * không so sánh item.power — hai đại lượng này có trọng số khác nhau.
 */
function isPowerUpgrade(player: PlayerState, newItem: Item): boolean {
  const currentEquipped = player.equipment[newItem.type];
  if (!currentEquipped) return true;

  const { power } = calculateStatsAndPower(player.level, {
    ...player.equipment,
    [newItem.type]: newItem,
  });
  return power > player.power;
}

export function calculateSingleActionGains(
  player: PlayerState,
  nextCultivationIndex: number
): {
  towerExpGain: number;
  playerExpGain: number;
  lootProgressGain: number;
  isBurst: boolean;
} {
  // Section 18: Contribution formula
  const baseContribution =
    TOWER_CONTRIBUTION_BASE +
    Math.floor(
      Math.pow(Math.max(0, player.power), TOWER_CONTRIBUTION_POWER_EXPONENT) /
        TOWER_CONTRIBUTION_POWER_DIVISOR
    );
  const powerLogMultiplier = 1 + Math.log10(1 + player.power) * 0.12;
  const bonusMultiplier = 1 + player.stats.towerExpBonus / 100;

  let towerExpGain = Math.max(
    10,
    Math.floor(baseContribution * powerLogMultiplier * bonusMultiplier)
  );

  // Check Red Special Effect: Tiên Đạo quán Đỉnh (Mỗi 10 lần Khai Đỉnh nhận thêm burst)
  const hasBurstEffect = hasSpecialEffect(player, 'tien_dao_burst');
  const isBurst = hasBurstEffect && nextCultivationIndex % 10 === 0;
  if (isBurst) {
    towerExpGain = Math.floor(towerExpGain * 2.5);
  }

  // Player EXP gain
  let playerExpBase =
    6 +
    Math.floor(Math.pow(Math.max(1, player.level), 0.75) * 1.8) +
    Math.floor(
      Math.pow(Math.max(0, player.power), PLAYER_EXP_POWER_EXPONENT) /
        PLAYER_EXP_POWER_DIVISOR
    );
  if (hasSpecialEffect(player, 'thien_dao_linh')) {
    playerExpBase = Math.floor(playerExpBase * 1.12);
  }

  // Section 19: Loot progress gain (Base 1 + bonus)
  let lootProgressGain = 1 + player.stats.lootRate / 100;
  if (hasSpecialEffect(player, 'van_dao_tao_hoa')) {
    lootProgressGain += 1;
  }

  return {
    towerExpGain,
    playerExpGain: playerExpBase,
    lootProgressGain,
    isBurst,
  };
}

export function processItemAcquisition(
  player: PlayerState,
  newItem: Item,
  settings: SettingsState
): {
  player: PlayerState;
  autoEquipped: boolean;
  dismantled: boolean;
  powerDelta: number;
} {
  const currentEquipped = player.equipment[newItem.type];
  const oldPower = player.power;

  // Section 12: Auto Equip — chỉ trang bị khi tổng Power thực sự cao hơn
  if (settings.autoEquip && isPowerUpgrade(player, newItem)) {
    const updatedEquipment = {
      ...player.equipment,
      [newItem.type]: newItem,
    };
    const { stats, power } = calculateStatsAndPower(player.level, updatedEquipment);
    const powerDelta = Math.max(0, power - oldPower);

    let updatedInventory = [...player.inventory];
    let updatedMaterials = { ...player.materials };

    // Handle displaced old equipped item
    if (currentEquipped) {
      if (
        settings.autoDismantle &&
        canAutoDismantle(currentEquipped, settings.autoDismantleMaxRarity)
      ) {
        updatedMaterials = addMaterials(
          updatedMaterials,
          getDismantleReward(currentEquipped)
        );
      } else if (updatedInventory.length < MAX_INVENTORY_SLOTS) {
        updatedInventory = [currentEquipped, ...updatedInventory];
      } else if (currentEquipped.rarity === 'red') {
        // Rule 14b (v1.2): trang bị Đỏ bị đẩy ra không bao giờ rơi mất khi túi đầy.
        const freed = evictWeakestNonRed(updatedInventory, updatedMaterials);
        if (freed) {
          updatedInventory = [currentEquipped, ...freed.inventory];
          updatedMaterials = freed.materials;
        }
      } else {
        updatedMaterials = addMaterials(
          updatedMaterials,
          getDismantleReward(currentEquipped)
        );
      }
    }

    return {
      player: {
        ...player,
        equipment: updatedEquipment,
        inventory: updatedInventory,
        materials: updatedMaterials,
        stats,
        power,
      },
      autoEquipped: true,
      dismantled: false,
      powerDelta,
    };
  }

  // Not stronger than currently equipped item -> check auto-dismantle or inventory
  if (
    settings.autoDismantle &&
    canAutoDismantle(newItem, settings.autoDismantleMaxRarity)
  ) {
    return {
      player: {
        ...player,
        materials: addMaterials(player.materials, getDismantleReward(newItem)),
      },
      autoEquipped: false,
      dismantled: true,
      powerDelta: 0,
    };
  }

  if (player.inventory.length < MAX_INVENTORY_SLOTS) {
    return {
      player: {
        ...player,
        inventory: [newItem, ...player.inventory],
      },
      autoEquipped: false,
      dismantled: false,
      powerDelta: 0,
    };
  }

  // Inventory is full (100 slots): Tiên Phẩm luôn được giữ — đẩy món yếu nhất ra (Rule 14b).
  if (newItem.rarity === 'red') {
    const freed = evictWeakestNonRed(player.inventory, player.materials);
    if (freed) {
      return {
        player: {
          ...player,
          inventory: [newItem, ...freed.inventory],
          materials: freed.materials,
        },
        autoEquipped: false,
        dismantled: false,
        powerDelta: 0,
      };
    }
  }

  if (settings.autoDismantle && newItem.rarity !== 'red') {
    return {
      player: {
        ...player,
        materials: addMaterials(player.materials, getDismantleReward(newItem)),
      },
      autoEquipped: false,
      dismantled: true,
      powerDelta: 0,
    };
  }

  return {
    player,
    autoEquipped: false,
    dismantled: false,
    powerDelta: 0,
  };
}

export function cultivateTowerSystem(
  player: PlayerState,
  tower: TowerState,
  settings: SettingsState,
  actionsCount = 1
): SingleCultivationResult {
  let currentPlayer = { ...player };
  let currentTower = { ...tower };

  let totalTowerExpGain = 0;
  let totalPlayerExpGain = 0;
  let totalTowerLevelsGained = 0;
  let totalPlayerLevelsGained = 0;
  let anyBurst = false;

  const generatedItems: SingleCultivationResult['generatedItems'] = [];
  const safeCount = Math.max(1, Math.floor(actionsCount));

  for (let i = 0; i < safeCount; i++) {
    const nextCultivationIndex = currentTower.totalCultivations + 1;
    const gains = calculateSingleActionGains(currentPlayer, nextCultivationIndex);

    totalTowerExpGain += gains.towerExpGain;
    totalPlayerExpGain += gains.playerExpGain;
    if (gains.isBurst) anyBurst = true;

    // 1. Add Tower EXP & check level up
    const towerRes = addTowerExp(currentTower, gains.towerExpGain);
    currentTower = {
      ...towerRes.tower,
      totalCultivations: nextCultivationIndex,
      lootProgress:
        Math.round((towerRes.tower.lootProgress + gains.lootProgressGain) * 100) / 100,
    };
    totalTowerLevelsGained += towerRes.levelsGained;

    // 2. Add Player EXP & check level up
    const playerRes = addPlayerCultivationExp(currentPlayer, gains.playerExpGain);
    currentPlayer = {
      ...playerRes.player,
      contribution: playerRes.player.contribution + gains.towerExpGain,
    };
    totalPlayerLevelsGained += playerRes.levelsGained;

    // 3. Check Loot Generation
    while (currentTower.lootProgress >= currentTower.lootThreshold) {
      currentTower = {
        ...currentTower,
        lootProgress:
          Math.round(
            (currentTower.lootProgress - currentTower.lootThreshold) * 100
          ) / 100,
      };

      // Core Rule: Item level == Tower level at moment of generation
      const lootItem = generateLootItem(currentTower.level);
      const acq = processItemAcquisition(currentPlayer, lootItem, settings);
      currentPlayer = acq.player;

      generatedItems.push({
        item: lootItem,
        autoEquipped: acq.autoEquipped,
        dismantled: acq.dismantled,
        powerDelta: acq.powerDelta,
      });
    }
  }

  return {
    player: currentPlayer,
    tower: currentTower,
    towerExpGain: totalTowerExpGain,
    playerExpGain: totalPlayerExpGain,
    towerLevelsGained: totalTowerLevelsGained,
    playerLevelsGained: totalPlayerLevelsGained,
    isBurst: anyBurst,
    generatedItems,
  };
}
