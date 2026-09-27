import { Rarity } from '../types/item';

export interface RarityConfig {
  id: Rarity;
  name: string;
  fullName: string;
  multiplier: number;
  affixCount: number;
  dropWeight: number; // Out of 100
  order: number;
  textColor: string;
  borderColor: string;
  bgTint: string;
  glowColor: string;
  hexColor: string;
}

export const RARITY_ORDER: Rarity[] = [
  'white',
  'green',
  'blue',
  'purple',
  'orange',
  'red',
];

export const RARITY_CONFIG: Record<Rarity, RarityConfig> = {
  white: {
    id: 'white',
    name: 'Phàm',
    fullName: 'Phàm Phẩm',
    multiplier: 1.0,
    affixCount: 0,
    dropWeight: 60,
    order: 0,
    textColor: 'text-slate-200',
    borderColor: 'border-slate-600/60',
    bgTint: 'bg-slate-800/40',
    glowColor: 'shadow-slate-400/10',
    hexColor: '#e2e8f0',
  },
  green: {
    id: 'green',
    name: 'Linh',
    fullName: 'Linh Phẩm',
    multiplier: 1.25,
    affixCount: 1,
    dropWeight: 25,
    order: 1,
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/50',
    bgTint: 'bg-emerald-950/35',
    glowColor: 'shadow-emerald-500/20',
    hexColor: '#34d399',
  },
  blue: {
    id: 'blue',
    name: 'Huyền',
    fullName: 'Huyền Phẩm',
    multiplier: 1.55,
    affixCount: 2,
    dropWeight: 10,
    order: 2,
    textColor: 'text-sky-400',
    borderColor: 'border-sky-500/55',
    bgTint: 'bg-sky-950/35',
    glowColor: 'shadow-sky-500/25',
    hexColor: '#38bdf8',
  },
  purple: {
    id: 'purple',
    name: 'Địa',
    fullName: 'Địa Phẩm',
    multiplier: 2.0,
    affixCount: 3,
    dropWeight: 4,
    order: 3,
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/60',
    bgTint: 'bg-purple-950/35',
    glowColor: 'shadow-purple-500/30',
    hexColor: '#c084fc',
  },
  orange: {
    id: 'orange',
    name: 'Thiên',
    fullName: 'Thiên Phẩm',
    multiplier: 2.7,
    affixCount: 4,
    dropWeight: 0.9,
    order: 4,
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/70',
    bgTint: 'bg-amber-950/40',
    glowColor: 'shadow-amber-500/35',
    hexColor: '#fbbf24',
  },
  red: {
    id: 'red',
    name: 'Tiên',
    fullName: 'Tiên Phẩm',
    multiplier: 3.8,
    affixCount: 5,
    dropWeight: 0.1,
    order: 5,
    textColor: 'text-rose-400',
    borderColor: 'border-rose-500/80',
    bgTint: 'bg-rose-950/45',
    glowColor: 'shadow-rose-500/45',
    hexColor: '#fb7185',
  },
};
