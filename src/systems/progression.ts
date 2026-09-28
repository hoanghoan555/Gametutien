import { EQUIPMENT_SLOTS_LIST } from '../data/equipment';
import { getRealmInfoForLevel } from '../data/realms';
import { EquipmentSlots, Item } from '../types/item';
import { PlayerState, PlayerStats } from '../types/player';
import { createEmptyEquipmentSlots, createEmptyMaterials } from './equipment';

export function calculatePlayerExpToNext(level: number): number {
  const safeLevel = Math.max(1, level);
  return Math.floor(100 * Math.pow(safeLevel, 1.32));
}

// Section 16 — Cân bằng v1.1: soft cap tốc độ tu luyện để tránh bùng nổ hành động/giây.
const CULTIVATION_ITEM_SOFT_CAP = 15; // Trần mềm cộng thêm từ trang bị (base 5 → tối đa ~20)
const CULTIVATION_PERCENT_SOFT_CAP = 100; // Trần mềm % cộng thêm (tối đa ×2)
const TOWER_EXP_BONUS_SOFT_CAP = 150; // Trần mềm % cống hiến Đỉnh
const LOOT_RATE_SOFT_CAP = 100; // Trần mềm % tốc độ loot

function applySoftCap(value: number, cap: number): number {
  if (value <= 0) return 0;
  return (cap * value) / (value + cap);
}

export function calculateStatsAndPower(
  level: number,
  equipment: EquipmentSlots
): { stats: PlayerStats; power: number } {
  const realmInfo = getRealmInfoForLevel(level);
  const { realm, layer } = realmInfo;

  // Base stats theo cảnh giới và tầng tu luyện
  let baseAtk = realm.baseAtkBonus + level * 8 + layer * 4;
  let baseHp = realm.baseHpBonus + level * 65 + layer * 25;
  let baseDef = realm.baseDefBonus + level * 5 + layer * 2;
  let critRate = 5; // 5% base
  let critDamage = 150; // 150% base
  let attackSpeed = 1.0;
  let cultivationRate = 5.0; // MVP: 5 actions / second
  let towerExpBonus = 0;
  let lootRate = 0;

  let atkPercentBonus = 0;
  let hpPercentBonus = 0;
  let defPercentBonus = 0;
  let cultRatePercentBonus = 0;
  let itemCultivationBonus = 0;
  let equipmentPowerSum = 0;

  for (const slotType of EQUIPMENT_SLOTS_LIST) {
    const item = equipment[slotType];
    if (!item) continue;

    equipmentPowerSum += item.power;

    if (item.baseStats.atk) baseAtk += item.baseStats.atk;
    if (item.baseStats.hp) baseHp += item.baseStats.hp;
    if (item.baseStats.def) baseDef += item.baseStats.def;
    if (item.baseStats.critRate) critRate += item.baseStats.critRate;
    if (item.baseStats.attackSpeed) attackSpeed += item.baseStats.attackSpeed * 0.05;
    if (item.baseStats.cultivationRate) {
      itemCultivationBonus += item.baseStats.cultivationRate;
    }

    for (const affix of item.affixes) {
      switch (affix.type) {
        case 'ATK_PERCENT':
          atkPercentBonus += affix.value;
          break;
        case 'HP_PERCENT':
          hpPercentBonus += affix.value;
          break;
        case 'DEF_PERCENT':
          defPercentBonus += affix.value;
          break;
        case 'CRIT_RATE':
          critRate += affix.value;
          break;
        case 'CRIT_DAMAGE':
          critDamage += affix.value;
          break;
        case 'ATTACK_SPEED':
          attackSpeed += affix.value * 0.02;
          break;
        case 'CULTIVATION_RATE':
          cultRatePercentBonus += affix.value;
          break;
        case 'TOWER_EXP':
          towerExpBonus += affix.value;
          break;
        case 'LOOT_RATE':
          lootRate += affix.value;
          break;
      }
    }

    if (item.specialEffect) {
      if (item.specialEffect.id === 'thien_kiem') {
        towerExpBonus += 10;
      } else if (item.specialEffect.id === 'van_dao_tao_hoa') {
        towerExpBonus += 20;
        lootRate += 25;
      }
    }
  }

  const finalAtk = Math.floor(baseAtk * (1 + atkPercentBonus / 100));
  const finalHp = Math.floor(baseHp * (1 + hpPercentBonus / 100));
  const finalDef = Math.floor(baseDef * (1 + defPercentBonus / 100));
  const cappedItemBonus = applySoftCap(itemCultivationBonus, CULTIVATION_ITEM_SOFT_CAP);
  const cappedPercentBonus = applySoftCap(
    cultRatePercentBonus,
    CULTIVATION_PERCENT_SOFT_CAP
  );
  const finalCultivationRate =
    Math.round((cultivationRate + cappedItemBonus) * (1 + cappedPercentBonus / 100) * 10) / 10;

  const stats: PlayerStats = {
    atk: finalAtk,
    hp: finalHp,
    def: finalDef,
    critRate: Math.round(critRate * 10) / 10,
    critDamage: Math.round(critDamage * 10) / 10,
    attackSpeed: Math.round(attackSpeed * 100) / 100,
    cultivationRate: finalCultivationRate,
    towerExpBonus:
      Math.round(applySoftCap(towerExpBonus, TOWER_EXP_BONUS_SOFT_CAP) * 10) / 10,
    lootRate: Math.round(applySoftCap(lootRate, LOOT_RATE_SOFT_CAP) * 10) / 10,
  };

  // Section 17: Power formula
  const power = Math.floor(
    stats.atk +
      stats.hp / 10 +
      stats.def * 2 +
      stats.critRate * 100 +
      stats.attackSpeed * 50 +
      equipmentPowerSum
  );

  return { stats, power };
}

/**
 * Giai đoạn 4 (v1.2): delta Power THẬT nếu trang bị `item` vào ô của nó — dùng cho UI
 * (ItemCard/ItemDetail). Không so sánh `item.power` vì hai thang đo khác nhau (§17).
 */
export function getPowerDeltaIfEquipped(player: PlayerState, item: Item): number {
  if (player.equipment[item.type]?.id === item.id) return 0;

  const { power } = calculateStatsAndPower(player.level, {
    ...player.equipment,
    [item.type]: item,
  });
  return power - player.power;
}

export function createInitialPlayerState(): PlayerState {
  const initialLevel = 1;
  const equipment = createEmptyEquipmentSlots();
  const { stats, power } = calculateStatsAndPower(initialLevel, equipment);

  return {
    level: initialLevel,
    cultivationExp: 0,
    cultivationExpToNext: calculatePlayerExpToNext(initialLevel),
    power,
    stats,
    equipment,
    inventory: [],
    materials: createEmptyMaterials(),
    contribution: 0,
    autoCultivation: true,
  };
}

export function addPlayerCultivationExp(
  player: PlayerState,
  expGain: number
): { player: PlayerState; levelsGained: number } {
  let level = player.level;
  let cultivationExp = player.cultivationExp + Math.max(0, Math.floor(expGain));
  let cultivationExpToNext = player.cultivationExpToNext;
  let levelsGained = 0;

  while (cultivationExp >= cultivationExpToNext) {
    cultivationExp -= cultivationExpToNext;
    level += 1;
    levelsGained += 1;
    cultivationExpToNext = calculatePlayerExpToNext(level);
  }

  if (levelsGained > 0) {
    const { stats, power } = calculateStatsAndPower(level, player.equipment);
    return {
      player: {
        ...player,
        level,
        cultivationExp,
        cultivationExpToNext,
        stats,
        power,
      },
      levelsGained,
    };
  }

  return {
    player: {
      ...player,
      cultivationExp,
    },
    levelsGained: 0,
  };
}
