import { EquipmentType, Rarity, SpecialEffect } from '../types/item';

export interface EquipmentSlotConfig {
  type: EquipmentType;
  label: string;
  shortLabel: string;
  baseNames: string[];
  statDistribution: {
    atk?: number;
    hp?: number;
    def?: number;
    critRate?: number;
    attackSpeed?: number;
    cultivationRate?: number;
  };
}

export const EQUIPMENT_SLOTS_LIST: EquipmentType[] = [
  'weapon',
  'helmet',
  'armor',
  'boots',
  'ring',
  'artifact',
];

export const EQUIPMENT_CONFIG: Record<EquipmentType, EquipmentSlotConfig> = {
  weapon: {
    type: 'weapon',
    label: 'Thần Binh',
    shortLabel: 'Vũ Khí',
    baseNames: ['Kiếm', 'Đao', 'Thương', 'Kích', 'Cổ Kiếm', 'Phi Kiếm'],
    statDistribution: {
      atk: 1.4,
    },
  },
  helmet: {
    type: 'helmet',
    label: 'Tiên Quan',
    shortLabel: 'Mũ Giáp',
    baseNames: ['Quan', 'Mão', 'Kim Quan', 'Ngọc Mão', 'Đạo Quan'],
    statDistribution: {
      hp: 8.5,
      def: 0.45,
    },
  },
  armor: {
    type: 'armor',
    label: 'Đạo Bào',
    shortLabel: 'Y Phục',
    baseNames: ['Đạo Bào', 'Chiến Giáp', 'Tiên Y', 'Hộ Giáp', 'Huyền Y'],
    statDistribution: {
      hp: 11.0,
      def: 0.65,
    },
  },
  boots: {
    type: 'boots',
    label: 'Vân Hài',
    shortLabel: 'Hài',
    baseNames: ['Vân Hài', 'Bộ Lý', 'Phi Ngoa', 'Đạp Vân Hài'],
    statDistribution: {
      def: 0.55,
      attackSpeed: 0.08,
    },
  },
  ring: {
    type: 'ring',
    label: 'Linh Giới',
    shortLabel: 'Nhẫn',
    baseNames: ['Giới Chỉ', 'Linh Hoàn', 'Ngọc Giới', 'Huyền Giới'],
    statDistribution: {
      atk: 0.55,
      critRate: 0.12,
    },
  },
  artifact: {
    type: 'artifact',
    label: 'Pháp Bảo',
    shortLabel: 'Pháp Bảo',
    baseNames: ['Tiên Ấn', 'Linh Châu', 'Huyền Kính', 'Thần Chung', 'Cổ Đỉnh'],
    statDistribution: {
      atk: 0.65,
      hp: 5.5,
      def: 0.35,
      cultivationRate: 0.05,
    },
  },
};

export const ITEM_PREFIXES_BY_RARITY: Record<Rarity, string[]> = {
  white: ['Phàm Thiết', 'Thanh Vân', 'Bạch Thạch', 'Sơ Nguyên', 'Mộc Linh'],
  green: ['Huyền Thiết', 'Thanh Ngọc', 'Linh Phong', 'Bích Thủy', 'Thúy Trúc'],
  blue: ['Hàn Băng', 'Thương Lam', 'Tử Điện', 'Tinh Hà', 'Vân Hải'],
  purple: ['Cửu U', 'Tử Hà', 'Thái Âm', 'Huyền Minh', 'Đoạt Mệnh'],
  orange: ['Xích Viêm', 'Thiên Đạo', 'Thái Dương', 'Cửu Thiên', 'Phần Thiên'],
  red: ['Hồng Mông', 'Vạn Đạo', 'Hỗn Độn', 'Thái Sơ', 'Tiên Thiên'],
};

export const SPECIAL_EFFECTS_POOL: Record<'orange' | 'red', SpecialEffect[]> = {
  orange: [
    {
      id: 'thien_kiem',
      name: 'Thiên Kiếm Cộng Minh',
      description: '+10% Đỉnh EXP nhận được khi Khai Đỉnh.',
      rarity: 'orange',
    },
    {
      id: 'thien_dao_linh',
      name: 'Thiên Đạo Tụ Linh',
      description: '+12% Tu Luyện EXP nhận được mỗi lần Khai Đỉnh.',
      rarity: 'orange',
    },
  ],
  red: [
    {
      id: 'tien_dao_burst',
      name: 'Tiên Đạo quán Đỉnh',
      description: 'Mỗi 10 lần Khai Đỉnh nhận thêm 1 luồng Đỉnh EXP bạo phát (+150% Đỉnh EXP).',
      rarity: 'red',
    },
    {
      id: 'van_dao_tao_hoa',
      name: 'Vạn Đạo Tạo Hóa',
      description: '+20% Đỉnh EXP và tăng +1 Tiến độ Loot mỗi lần Khai Đỉnh.',
      rarity: 'red',
    },
  ],
};
