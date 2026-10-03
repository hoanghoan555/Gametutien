import { BeastConfig, BeastId } from '../types/beast';

export const BEAST_IDS: BeastId[] = [
  'thanh_long',
  'bach_ho',
  'chu_tuoc',
  'huyen_vu',
  'ky_lan',
  'thien_ho',
];

export const BEAST_CONFIGS: Record<BeastId, BeastConfig> = {
  thanh_long: {
    id: 'thanh_long',
    name: 'Thanh Long',
    title: 'Đông Phương Thánh Thú',
    element: 'wood',
    elementName: 'Thần Mộc',
    elementColor: 'text-emerald-400',
    rarity: 'red',
    description:
      'Thượng Cổ Chân Long chấp chưởng Đông Phương, gầm vang chấn động Cửu Châu, linh khí vạn dặm tòng sinh.',
    iconName: 'Dragon',
    skillName: 'Long Ngâm Cửu Thiên',
    skillDesc: 'Tăng mạnh Công Kích và Sát Thương Bạo Kích cho chủ nhân.',
    baseStats: {
      atk: 120,
      critDamage: 15,
    },
    growthPerLevel: {
      atk: 45,
      critDamage: 2.0,
    },
    dialogue: [
      'Gầm! Khí tức của Vạn Đạo Tiên Đỉnh thật sự nồng đậm!',
      'Chủ nhân, hãy tiến lên, long tức của ta sẽ mở đường cho ngươi.',
      'Đại đạo vô biên, chỉ có sức mạnh tuyệt đối mới trường tồn.',
    ],
  },
  bach_ho: {
    id: 'bach_ho',
    name: 'Bạch Hổ',
    title: 'Tây Phương Chiến Thần',
    element: 'metal',
    elementName: 'Bạch Kim',
    elementColor: 'text-amber-300',
    rarity: 'orange',
    description:
      'Chủ quản sát phạt chi đạo, móng vuốt xé rách hư không, khí thế lẫm liệt khiến vạn yêu cúi đầu quy phục.',
    iconName: 'Cat',
    skillName: 'Hổ Khiếu Phong Lôi',
    skillDesc: 'Gia tăng Tỷ Lệ Bạo Kích và Tốc Độ Xuất Chiêu cực hạn.',
    baseStats: {
      critRate: 3.5,
      attackSpeed: 0.15,
    },
    growthPerLevel: {
      critRate: 0.35,
      attackSpeed: 0.03,
    },
    dialogue: [
      'Một vuốt xé hư không! Sát phạt chi đạo không ai cản nổi!',
      'Tốc độ xuất chiêu là mấu chốt của thắng bại, chủ nhân!',
      'Gầm... Mùi vị của trận chiến làm máu ta sôi sục.',
    ],
  },
  chu_tuoc: {
    id: 'chu_tuoc',
    name: 'Chu Tước',
    title: 'Nam Phương Ly Hỏa',
    element: 'fire',
    elementName: 'Nam Hỏa',
    elementColor: 'text-rose-400',
    rarity: 'orange',
    description:
      'Phượng hoàng niết bàn, lửa thiêng rực rỡ soi sáng thiên đình, thúc đẩy linh mạch luân chuyển không ngừng.',
    iconName: 'Bird',
    skillName: 'Niết Bàn Chân Hỏa',
    skillDesc: 'Gia tăng Tốc Độ Tu Luyện và Cống Hiến EXP Tiên Đỉnh.',
    baseStats: {
      cultivationRate: 1.5,
      atk: 60,
    },
    growthPerLevel: {
      cultivationRate: 0.2,
      atk: 25,
    },
    dialogue: [
      'Ly Hỏa thiêu đốt tạp chất, giúp chủ nhân ngộ đạo nhanh hơn!',
      'Tiên Đỉnh đang cộng hưởng cùng ngọn lửa của ta.',
      'Niết bàn không chỉ tái sinh, đó là đỉnh cao của tiến hóa.',
    ],
  },
  huyen_vu: {
    id: 'huyen_vu',
    name: 'Huyền Vũ',
    title: 'Bắc Phương Chân Võ',
    element: 'water',
    elementName: 'Huyền Thủy',
    elementColor: 'text-sky-400',
    rarity: 'purple',
    description:
      'Quy Xà hợp nhất, trầm ổn như Thái Sơn, mai rùa khắc dấu càn khôn vạn vật, hộ thân vững như bàn thạch.',
    iconName: 'Shield',
    skillName: 'Huyền Minh Hộ Thể',
    skillDesc: 'Tăng lượng lớn Sinh Lực (HP) và Phòng Thủ (DEF).',
    baseStats: {
      hp: 1200,
      def: 90,
    },
    growthPerLevel: {
      hp: 420,
      def: 32,
    },
    dialogue: [
      'Vạn pháp bất xâm. Có ta ở đây, chủ nhân không cần lo hộ thân.',
      'Tu đạo cần vững vàng từng bước, tựa như rùa già vượt ngàn trùng khơi.',
      'Sóng yên biển lặng, tâm cảnh an định.',
    ],
  },
  ky_lan: {
    id: 'ky_lan',
    name: 'Hỏa Kỳ Lân',
    title: 'Thụy Thú Giáng Lâm',
    element: 'earth',
    elementName: 'Kỳ Lân',
    elementColor: 'text-orange-400',
    rarity: 'purple',
    description:
      'Linh thú thụy tường ngàn năm xuất thế một lần, đạp lửa mà đi, mang lại phúc duyên thiên địa cho chủ nhân.',
    iconName: 'Flame',
    skillName: 'Thụy Khí Đằng Vân',
    skillDesc: 'Tăng Cơ Duyên Luyện Khí (Loot Rate) và Sinh Lực.',
    baseStats: {
      hp: 800,
      atk: 50,
    },
    growthPerLevel: {
      hp: 280,
      atk: 22,
    },
    dialogue: [
      'Khí vận hanh thông! Trận Khai Đỉnh tiếp theo ắt có dị bảo!',
      'Thụy khí của ta sẽ che chở cho cơ nghiệp của người.',
      'Lửa này là điềm lành, không tổn thương người có thiện tâm.',
    ],
  },
  thien_ho: {
    id: 'thien_ho',
    name: 'Cửu Vĩ Thiên Hồ',
    title: 'Thanh Khâu Thánh Thần',
    element: 'spirit',
    elementName: 'Huyễn Thần',
    elementColor: 'text-purple-400',
    rarity: 'blue',
    description:
      'Linh hồ thượng cổ Thanh Khâu, chín đuôi thông linh vạn giới, biến hóa đa đoan, mị hoặc thiên hạ.',
    iconName: 'Sparkles',
    skillName: 'Thiên Hồ Mị Ảnh',
    skillDesc: 'Cân bằng tăng Công Kích, Phòng Thủ và Bạo Kích.',
    baseStats: {
      atk: 40,
      hp: 350,
      critRate: 1.5,
    },
    growthPerLevel: {
      atk: 18,
      hp: 150,
      critRate: 0.15,
    },
    dialogue: [
      'Hi hi, chủ nhân hôm nay tu hành có mệt không?',
      'Chín cái đuôi của ta có thể quạt bay mọi ưu phiền đấy.',
      'Linh khí nơi này thật thơm ngon ~',
    ],
  },
};
