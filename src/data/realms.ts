export interface RealmConfig {
  id: string;
  index: number;
  name: string;
  minLevel: number;
  maxLevel: number;
  baseAtkBonus: number;
  baseHpBonus: number;
  baseDefBonus: number;
  colorClass: string;
  description: string;
}

export const REALMS_CONFIG: RealmConfig[] = [
  {
    id: 'luyen_khi',
    index: 0,
    name: 'Luyện Khí',
    minLevel: 1,
    maxLevel: 10,
    baseAtkBonus: 15,
    baseHpBonus: 120,
    baseDefBonus: 8,
    colorClass: 'text-slate-200',
    description: 'Cảm ứng linh khí thiên địa, dẫn khí nhập thể, tẩy rửa kinh mạch.',
  },
  {
    id: 'truc_co',
    index: 1,
    name: 'Trúc Cơ',
    minLevel: 11,
    maxLevel: 20,
    baseAtkBonus: 45,
    baseHpBonus: 380,
    baseDefBonus: 24,
    colorClass: 'text-emerald-300',
    description: 'Ngưng tụ linh dịch, đúc thành đạo cơ vững chắc, thoát thai hoán cốt.',
  },
  {
    id: 'kim_dan',
    index: 2,
    name: 'Kim Đan',
    minLevel: 21,
    maxLevel: 30,
    baseAtkBonus: 120,
    baseHpBonus: 1100,
    baseDefBonus: 65,
    colorClass: 'text-sky-300',
    description: 'Linh lực kết đan, vạn pháp bất xâm, thọ nguyên tăng vọt.',
  },
  {
    id: 'nguyen_anh',
    index: 3,
    name: 'Nguyên Anh',
    minLevel: 31,
    maxLevel: 40,
    baseAtkBonus: 320,
    baseHpBonus: 3200,
    baseDefBonus: 180,
    colorClass: 'text-purple-300',
    description: 'Phá đan thành anh, thần thức thông thiên, cửu thiên thập địa tự do tung hoành.',
  },
  {
    id: 'hoa_than',
    index: 4,
    name: 'Hóa Thần',
    minLevel: 41,
    maxLevel: 50,
    baseAtkBonus: 850,
    baseHpBonus: 9000,
    baseDefBonus: 480,
    colorClass: 'text-amber-300',
    description: 'Nguyên thần hợp đạo, cảm ngộ pháp tắc thiên địa, nhất niệm sơn hà động.',
  },
  {
    id: 'luyen_hu',
    index: 5,
    name: 'Luyện Hư',
    minLevel: 51,
    maxLevel: 999,
    baseAtkBonus: 2200,
    baseHpBonus: 25000,
    baseDefBonus: 1250,
    colorClass: 'text-rose-300',
    description: 'Phản phác quy chân, luyện hóa hư không, chạm tới ngưỡng cửa Tiên Đạo.',
  },
];

export interface PlayerRealmInfo {
  realm: RealmConfig;
  layer: number; // Tầng 1..10
  fullName: string;
}

export function getRealmInfoForLevel(level: number): PlayerRealmInfo {
  const clampedLevel = Math.max(1, level);
  const realmIndex = Math.min(
    REALMS_CONFIG.length - 1,
    Math.floor((clampedLevel - 1) / 10)
  );
  const realm = REALMS_CONFIG[realmIndex];
  const layer = clampedLevel - realmIndex * 10;
  return {
    realm,
    layer,
    fullName: `${realm.name} • Tầng ${layer}`,
  };
}
