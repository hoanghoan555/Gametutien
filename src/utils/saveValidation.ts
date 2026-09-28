import { AFFIX_CONFIGS } from '../data/affixes';
import { EQUIPMENT_SLOTS_LIST } from '../data/equipment';
import { RARITY_ORDER } from '../data/rarities';
import {
  createEmptyEquipmentSlots,
  createEmptyMaterials,
  MAX_INVENTORY_SLOTS,
} from '../systems/equipment';
import {
  calculatePlayerExpToNext,
  calculateStatsAndPower,
} from '../systems/progression';
import { calculateTowerExpToNextLevel } from '../systems/tower';
import { SaveDataV1, SettingsState } from '../types/game';
import {
  Affix,
  AffixType,
  DismantleMaterials,
  EquipmentSlots,
  Item,
  ItemStats,
  Rarity,
  SpecialEffect,
} from '../types/item';
import { PlayerState } from '../types/player';
import { TowerState } from '../types/tower';
import { createUniqueId } from './random';

/**
 * TASK 002A — Bug #4: chuẩn hóa save v1 trước khi dùng.
 *
 * Nguyên tắc:
 * - Save hợp lệ hiện tại phải load bình thường (không đổi key, không tăng version).
 * - Field thiếu → dùng default hợp lệ của thiết kế (không reset cả save).
 * - Field sai kiểu / NaN / Infinity / giá trị vô lý → sanitize hoặc loại bỏ field đó.
 * - Save hỏng hoàn toàn (sai version, thiếu hẳn player/tower) → trả null để fallback initial state.
 */

const ITEM_STAT_KEYS: Array<keyof ItemStats> = [
  'atk',
  'hp',
  'def',
  'critRate',
  'critDamage',
  'attackSpeed',
  'cultivationRate',
];

const AFFIX_TYPES: AffixType[] = AFFIX_CONFIGS.map((config) => config.type);

// Chặn level phi lý để mọi phép tính EXP/Stats luôn hữu hạn (save hợp lệ không bao giờ tới mức này).
const MAX_SANITIZED_LEVEL = 1_000_000;
// Save hợp lệ tối đa 5 dòng phụ (Đỏ); dư thừa là dữ liệu rác.
const MAX_SANITIZED_AFFIXES = 12;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toFiniteNumber(
  value: unknown,
  fallback: number,
  min = Number.NEGATIVE_INFINITY
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, value);
}

function toFiniteInteger(
  value: unknown,
  fallback: number,
  min = Number.NEGATIVE_INFINITY
): number {
  return Math.floor(toFiniteNumber(value, fallback, min));
}

function toLevel(value: unknown, fallback = 1): number {
  return Math.min(MAX_SANITIZED_LEVEL, toFiniteInteger(value, fallback, 1));
}

function toStringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function toRarity(value: unknown, fallback: Rarity): Rarity {
  return RARITY_ORDER.find((rarity) => rarity === value) ?? fallback;
}

function sanitizeItemStats(raw: unknown): ItemStats {
  const stats: ItemStats = {};
  if (!isRecord(raw)) return stats;
  for (const key of ITEM_STAT_KEYS) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      stats[key] = value;
    }
  }
  return stats;
}

function sanitizeAffix(raw: unknown): Affix | null {
  if (!isRecord(raw)) return null;
  const type = AFFIX_TYPES.find((candidate) => candidate === raw.type);
  if (!type) return null;
  const config = AFFIX_CONFIGS.find((candidate) => candidate.type === type);

  return {
    type,
    label: toStringValue(raw.label, config?.label ?? type),
    value: toFiniteNumber(raw.value, 0, 0),
    isPercent: toBoolean(raw.isPercent, config?.isPercent ?? false),
  };
}

function sanitizeSpecialEffect(raw: unknown): SpecialEffect | undefined {
  if (!isRecord(raw)) return undefined;
  const id = toStringValue(raw.id, '');
  if (!id) return undefined;
  const rarity = raw.rarity === 'orange' || raw.rarity === 'red' ? raw.rarity : undefined;
  if (!rarity) return undefined;

  return {
    id,
    name: toStringValue(raw.name, id),
    description: toStringValue(raw.description, ''),
    rarity,
  };
}

export function sanitizeItem(raw: unknown): Item | null {
  if (!isRecord(raw)) return null;

  // Ô trang bị phải khớp loại hợp lệ, nếu không cả món đồ bị loại bỏ.
  const type = EQUIPMENT_SLOTS_LIST.find((candidate) => candidate === raw.type);
  if (!type) return null;

  const affixes = Array.isArray(raw.affixes)
    ? raw.affixes
        .slice(0, MAX_SANITIZED_AFFIXES)
        .map((affix) => sanitizeAffix(affix))
        .filter((affix): affix is Affix => affix !== null)
    : [];

  return {
    id: toStringValue(raw.id, createUniqueId('item')),
    name: toStringValue(raw.name, 'Pháp Bảo Vô Danh'),
    type,
    level: toLevel(raw.level),
    rarity: toRarity(raw.rarity, 'white'),
    power: toFiniteNumber(raw.power, 0, 0),
    baseStats: sanitizeItemStats(raw.baseStats),
    affixes,
    specialEffect: sanitizeSpecialEffect(raw.specialEffect),
    createdAt: toFiniteNumber(raw.createdAt, 0, 0),
  };
}

function sanitizeEquipment(raw: unknown): EquipmentSlots {
  const slots = createEmptyEquipmentSlots();
  if (!isRecord(raw)) return slots;

  for (const slotType of EQUIPMENT_SLOTS_LIST) {
    const item = sanitizeItem(raw[slotType]);
    // Món đồ sai ô (type không khớp slot) bị loại để không phá công thức stats.
    if (item && item.type === slotType) {
      slots[slotType] = item;
    }
  }
  return slots;
}

function sanitizeInventory(raw: unknown): Item[] {
  if (!Array.isArray(raw)) return [];

  const items: Item[] = [];
  for (const entry of raw) {
    const item = sanitizeItem(entry);
    if (item) items.push(item);
    if (items.length >= MAX_INVENTORY_SLOTS) break;
  }
  return items;
}

function sanitizeMaterials(raw: unknown): DismantleMaterials {
  if (!isRecord(raw)) return createEmptyMaterials();
  return {
    basicMaterial: toFiniteNumber(raw.basicMaterial, 0, 0),
    linhStone: toFiniteNumber(raw.linhStone, 0, 0),
    advancedMaterial: toFiniteNumber(raw.advancedMaterial, 0, 0),
    rareMaterial: toFiniteNumber(raw.rareMaterial, 0, 0),
  };
}

export function sanitizePlayerState(raw: unknown): PlayerState | null {
  if (!isRecord(raw)) return null;

  const level = toLevel(raw.level);
  const equipment = sanitizeEquipment(raw.equipment);
  // §22: stats/power luôn được tính lại bằng công thức hiện hành khi nạp save.
  const { stats, power } = calculateStatsAndPower(level, equipment);

  return {
    level,
    cultivationExp: toFiniteNumber(raw.cultivationExp, 0, 0),
    cultivationExpToNext: toFiniteNumber(
      raw.cultivationExpToNext,
      calculatePlayerExpToNext(level),
      1
    ),
    power,
    stats,
    equipment,
    inventory: sanitizeInventory(raw.inventory),
    materials: sanitizeMaterials(raw.materials),
    contribution: toFiniteNumber(raw.contribution, 0, 0),
    autoCultivation: toBoolean(raw.autoCultivation, true),
  };
}

export function sanitizeTowerState(raw: unknown): TowerState | null {
  if (!isRecord(raw)) return null;

  const level = toLevel(raw.level);
  const thresholdValue = toFiniteNumber(raw.lootThreshold, 100);
  const lootThreshold = thresholdValue > 0 ? thresholdValue : 100;
  // Bất biến §7.1: lootProgress ∈ [0, lootThreshold) — save hỏng không được tạo vòng lặp loot vô hạn.
  const lootProgressCap = Math.max(0, lootThreshold - 0.01);
  const lootProgress =
    Math.round(Math.min(toFiniteNumber(raw.lootProgress, 0, 0), lootProgressCap) * 100) / 100;

  return {
    level,
    currentExp: toFiniteNumber(raw.currentExp, 0, 0),
    expToNextLevel: toFiniteNumber(
      raw.expToNextLevel,
      calculateTowerExpToNextLevel(level),
      1
    ),
    lootProgress,
    lootThreshold,
    totalCultivations: toFiniteInteger(raw.totalCultivations, 0, 0),
  };
}

export function sanitizeSettings(raw: unknown): SettingsState {
  const defaults: SettingsState = {
    autoEquip: true,
    autoDismantle: true,
    autoDismantleMaxRarity: 'green',
    soundEnabled: true,
  };
  if (!isRecord(raw)) return defaults;

  return {
    autoEquip: toBoolean(raw.autoEquip, defaults.autoEquip),
    autoDismantle: toBoolean(raw.autoDismantle, defaults.autoDismantle),
    autoDismantleMaxRarity: toRarity(raw.autoDismantleMaxRarity, defaults.autoDismantleMaxRarity),
    soundEnabled: toBoolean(raw.soundEnabled, defaults.soundEnabled),
  };
}

export function sanitizeSaveData(raw: unknown): SaveDataV1 | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== 1) return null;

  const player = sanitizePlayerState(raw.player);
  const tower = sanitizeTowerState(raw.tower);
  // player/tower là phần bắt buộc: thiếu hoàn toàn → bỏ save, fallback initial state.
  if (!player || !tower) return null;

  return {
    version: 1,
    player,
    tower,
    settings: sanitizeSettings(raw.settings),
    lastSavedAt: toFiniteNumber(raw.lastSavedAt, 0, 0),
  };
}
