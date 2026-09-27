import { AffixType } from '../types/item';

export interface AffixConfig {
  type: AffixType;
  label: string;
  minBase: number;
  maxBase: number;
  levelScaling: number;
  isPercent: boolean;
  powerWeight: number;
}

export const AFFIX_CONFIGS: AffixConfig[] = [
  {
    type: 'ATK_PERCENT',
    label: 'Công Kích',
    minBase: 4,
    maxBase: 9,
    levelScaling: 0.15,
    isPercent: true,
    powerWeight: 18,
  },
  {
    type: 'HP_PERCENT',
    label: 'Sinh Lực',
    minBase: 4,
    maxBase: 10,
    levelScaling: 0.15,
    isPercent: true,
    powerWeight: 14,
  },
  {
    type: 'DEF_PERCENT',
    label: 'Phòng Thủ',
    minBase: 4,
    maxBase: 9,
    levelScaling: 0.15,
    isPercent: true,
    powerWeight: 15,
  },
  {
    type: 'CRIT_RATE',
    label: 'Bạo Kích',
    minBase: 2,
    maxBase: 5,
    levelScaling: 0.08,
    isPercent: true,
    powerWeight: 25,
  },
  {
    type: 'CRIT_DAMAGE',
    label: 'Sát Thương Bạo',
    minBase: 8,
    maxBase: 18,
    levelScaling: 0.25,
    isPercent: true,
    powerWeight: 12,
  },
  {
    type: 'ATTACK_SPEED',
    label: 'Tốc Độ Xuất Chiêu',
    minBase: 3,
    maxBase: 7,
    levelScaling: 0.1,
    isPercent: true,
    powerWeight: 20,
  },
  {
    type: 'CULTIVATION_RATE',
    label: 'Tốc Độ Tu Luyện',
    minBase: 4,
    maxBase: 10,
    levelScaling: 0.12,
    isPercent: true,
    powerWeight: 22,
  },
  {
    type: 'TOWER_EXP',
    label: 'Cống Hiến Đỉnh EXP',
    minBase: 5,
    maxBase: 12,
    levelScaling: 0.18,
    isPercent: true,
    powerWeight: 24,
  },
  {
    type: 'LOOT_RATE',
    label: 'Cơ Duyên Bảo Vật',
    minBase: 4,
    maxBase: 10,
    levelScaling: 0.12,
    isPercent: true,
    powerWeight: 22,
  },
];
