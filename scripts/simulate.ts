/**
 * VẠN ĐẠO TIÊN ĐỈNH — Harness mô phỏng headless (phục vụ Giai đoạn 2 & 3).
 *
 * Mục đích:
 *  - Kiểm tra bất biến vòng lặp chính: Khai Đỉnh → EXP → Loot → Trang bị → Power.
 *  - Thu thập số liệu cân bằng: tiến trình Lv Đỉnh/Nhân vật, phân bố phẩm chất, tốc độ loot.
 *
 * Chạy:
 *   npm run sim
 *   npm run sim -- --hours=48 --actions=50000 --rolls=300000
 *   npm run sim -- --quick
 *
 * Script chỉ dùng các hàm thuần trong src/systems — không cần DOM/localStorage.
 */

import process from 'node:process';
import { EQUIPMENT_SLOTS_LIST } from '../src/data/equipment';
import { LOOT_DROP_TABLE } from '../src/data/lootTables';
import { RARITY_CONFIG, RARITY_ORDER } from '../src/data/rarities';
import {
  calculateSingleActionGains,
  cultivateTowerSystem,
  processItemAcquisition,
} from '../src/systems/cultivation';
import {
  createEmptyEquipmentSlots,
  getDismantleReward,
  MAX_INVENTORY_SLOTS,
} from '../src/systems/equipment';
import { generateLootItem, rollRarity } from '../src/systems/loot';
import {
  calculateOfflineProgression,
  MAX_EXACT_ACTIONS,
  MAX_OFFLINE_SECONDS,
} from '../src/systems/offline';
import {
  calculatePlayerExpToNext,
  calculateStatsAndPower,
  createInitialPlayerState,
  getPowerDeltaIfEquipped,
} from '../src/systems/progression';
import {
  calculateTowerExpToNextLevel,
  createInitialTowerState,
} from '../src/systems/tower';
import { OfflineRewardSummary, SettingsState } from '../src/types/game';
import { EquipmentSlots, EquipmentType, Item, ItemStats, Rarity } from '../src/types/item';
import { PlayerState } from '../src/types/player';
import { TowerState } from '../src/types/tower';
import { formatDuration } from '../src/utils/number';
import { sanitizeSaveData } from '../src/utils/saveValidation';

const SETTINGS: SettingsState = {
  autoEquip: true,
  autoDismantle: true,
  autoDismantleMaxRarity: 'green',
  soundEnabled: false,
};

const fmt = (value: number): string => Math.floor(value).toLocaleString('en-US');
const pct = (value: number): string => `${(value * 100).toFixed(4)}%`;
const pad = (value: string, width: number): string => value.padEnd(width, ' ');

function section(title: string): void {
  console.log(`\n${'='.repeat(78)}\n${title}\n${'='.repeat(78)}`);
}

function zeroRarityCount(): Record<Rarity, number> {
  return { white: 0, green: 0, blue: 0, purple: 0, orange: 0, red: 0 };
}

function countReds(player: PlayerState): number {
  let count = player.inventory.filter((item) => item.rarity === 'red').length;
  for (const slot of EQUIPMENT_SLOTS_LIST) {
    if (player.equipment[slot]?.rarity === 'red') count += 1;
  }
  return count;
}

interface CheckResult {
  name: string;
  failures: string[];
  notes: string[];
}

// ---------------------------------------------------------------------------
// 1. Bất biến vòng lặp chính (từng hành động đơn)
// ---------------------------------------------------------------------------

function checkLoopInvariants(actions: number): CheckResult {
  const failures: string[] = [];
  const notes: string[] = [];
  let player = createInitialPlayerState();
  let tower = createInitialTowerState();

  const rarityCount = zeroRarityCount();
  let totalItems = 0;
  let autoEquipped = 0;
  let dismantled = 0;
  let stored = 0;
  let itemLevelMismatch = 0;
  let progressOutOfRange = 0;
  let powerDrops = 0;
  let powerDropExample = '';
  let statsMismatch = 0;
  let maxInventory = 0;
  let redsSeen = 0;

  for (let i = 0; i < actions; i += 1) {
    const before = player;
    const res = cultivateTowerSystem(before, tower, SETTINGS, 1);
    player = res.player;
    tower = res.tower;

    if (tower.lootProgress < 0 || tower.lootProgress >= tower.lootThreshold) {
      progressOutOfRange += 1;
    }

    for (const g of res.generatedItems) {
      totalItems += 1;
      rarityCount[g.item.rarity] += 1;
      if (g.item.level !== tower.level) itemLevelMismatch += 1;
      if (g.autoEquipped) autoEquipped += 1;
      else if (g.dismantled) dismantled += 1;
      else stored += 1;
      if (g.item.rarity === 'red') redsSeen += 1;
    }

    if (player.power < before.power) {
      powerDrops += 1;
      if (!powerDropExample) {
        const changedSlot = (Object.keys(player.equipment) as EquipmentType[]).find(
          (slot) => player.equipment[slot] !== before.equipment[slot]
        );
        powerDropExample = `lần ${i + 1}: Power ${fmt(before.power)} → ${fmt(
          player.power
        )} (ô ${changedSlot ?? 'không rõ'})`;
      }
    }

    const recalc = calculateStatsAndPower(player.level, player.equipment);
    if (
      recalc.power !== player.power ||
      recalc.stats.atk !== player.stats.atk ||
      recalc.stats.cultivationRate !== player.stats.cultivationRate
    ) {
      statsMismatch += 1;
    }

    maxInventory = Math.max(maxInventory, player.inventory.length);
  }

  if (itemLevelMismatch > 0) {
    failures.push(`item.level khác tower.level: ${fmt(itemLevelMismatch)} trường hợp`);
  }
  if (progressOutOfRange > 0) {
    failures.push(`lootProgress ngoài khoảng [0, threshold): ${fmt(progressOutOfRange)} trường hợp`);
  }
  if (powerDrops > 0) {
    failures.push(`Power GIẢM sau auto-equip: ${fmt(powerDrops)} lần — ví dụ ${powerDropExample}`);
  }
  if (statsMismatch > 0) {
    failures.push(`stats/power lệch với recalc: ${fmt(statsMismatch)} trường hợp`);
  }
  if (maxInventory > MAX_INVENTORY_SLOTS) {
    failures.push(`Túi vượt sức chứa: đỉnh ${fmt(maxInventory)}/${MAX_INVENTORY_SLOTS}`);
  }
  const redsPresent = countReds(player);
  if (redsPresent !== redsSeen) {
    failures.push(
      `Tiên Phẩm bị mất: nhận ${fmt(redsSeen)} nhưng còn ${fmt(redsPresent)} trong túi/trang bị`
    );
  }

  notes.push(`Mô phỏng ${fmt(actions)} hành động đơn (1 hành động/lần gọi)`);
  notes.push(
    `Tổng loot: ${fmt(totalItems)} — tự trang bị ${fmt(autoEquipped)}, phân giải ${fmt(dismantled)}, vào túi ${fmt(stored)}`
  );
  notes.push(
    `Phẩm chất: ${RARITY_ORDER.map((r) => `${RARITY_CONFIG[r].name} ${fmt(rarityCount[r])}`).join(' · ')}`
  );
  notes.push(
    `Cuối: Đỉnh Lv.${tower.level}, Nhân vật Lv.${player.level}, Power ${fmt(player.power)}, túi ${player.inventory.length}/${MAX_INVENTORY_SLOTS} (đỉnh túi ${maxInventory})`
  );
  notes.push(`Tiên Phẩm: nhận ${fmt(redsSeen)} — còn nguyên ${fmt(redsPresent)} (Rule 14b)`);

  return { name: `1. Bất biến vòng lặp chính (${fmt(actions)} hành động đơn)`, failures, notes };
}

// ---------------------------------------------------------------------------
// 2. Phân bố phẩm chất so với cấu hình
// ---------------------------------------------------------------------------

function checkRarityDistribution(rolls: number): CheckResult {
  const failures: string[] = [];
  const notes: string[] = [];
  const counts = zeroRarityCount();
  for (let i = 0; i < rolls; i += 1) counts[rollRarity()] += 1;

  const totalWeight = LOOT_DROP_TABLE.reduce((sum, entry) => sum + entry.probability, 0);
  notes.push(`Tổng trọng số cấu hình = ${totalWeight} (roll chuẩn hóa theo tổng này)`);
  notes.push(pad('Phẩm chất', 12) + pad('Quan sát', 12) + pad('Kỳ vọng', 12) + 'Lệch (pp)');

  for (const rarity of RARITY_ORDER) {
    const observed = counts[rarity] / rolls;
    const expected = RARITY_CONFIG[rarity].dropWeight / totalWeight;
    const deltaPp = (observed - expected) * 100;
    const sigma3 = Math.sqrt((expected * (1 - expected)) / rolls) * 3;
    if (Math.abs(observed - expected) > sigma3) {
      failures.push(
        `Lệch quá 3σ ở ${rarity}: ${pct(observed)} vs ${pct(expected)}`
      );
    }
    notes.push(
      pad(RARITY_CONFIG[rarity].name, 12) +
        pad(pct(observed), 12) +
        pad(pct(expected), 12) +
        deltaPp.toFixed(4)
    );
  }

  return { name: `2. Phân bố phẩm chất (${fmt(rolls)} roll)`, failures, notes };
}

// ---------------------------------------------------------------------------
// 3. Auto-equip: so sánh item.power vs mức tăng Power thật
// ---------------------------------------------------------------------------

function checkAutoEquipRule(samples: number): CheckResult {
  const failures: string[] = [];
  const notes: string[] = [];
  const settings: SettingsState = {
    autoEquip: true,
    autoDismantle: false,
    autoDismantleMaxRarity: 'green',
    soundEnabled: false,
  };
  const level = 60;

  const weapons: Item[] = [];
  for (let i = 0; i < samples; i += 1) {
    weapons.push(generateLootItem(level, undefined, 'weapon'));
  }

  const contribution = (item: Item): number => {
    const equipment = { ...createEmptyEquipmentSlots(), weapon: item };
    return calculateStatsAndPower(level, equipment).power;
  };
  const contributions = weapons.map((item) => contribution(item));

  let swaps = 0;
  let mismatches = 0;
  let example = '';

  for (let i = 0; i < weapons.length; i += 1) {
    const current = weapons[i];
    const candidate = weapons[(i + 1) % weapons.length];
    const baseEquipment = { ...createEmptyEquipmentSlots(), weapon: current };
    const baseStats = calculateStatsAndPower(level, baseEquipment);
    const player: PlayerState = {
      ...createInitialPlayerState(),
      level,
      equipment: baseEquipment,
      stats: baseStats.stats,
      power: baseStats.power,
    };

    const expectedSwap = contribution(candidate) > baseStats.power;
    const result = processItemAcquisition(player, candidate, settings);
    if (result.autoEquipped) swaps += 1;

    if (
      result.autoEquipped !== expectedSwap ||
      (result.autoEquipped && result.player.power < baseStats.power)
    ) {
      mismatches += 1;
      if (!example) {
        example =
          `#${i + 1}: item.power ${fmt(candidate.power)} vs ${fmt(current.power)} — ` +
          `quyết định ${result.autoEquipped ? 'trang bị' : 'bỏ qua'}, kỳ vọng ${
            expectedSwap ? 'trang bị' : 'bỏ qua'
          }`;
      }
    }
  }

  let rankPairs = 0;
  let rankDivergences = 0;
  for (let i = 0; i < weapons.length; i += 1) {
    for (let j = i + 1; j < weapons.length; j += 1) {
      rankPairs += 1;
      const powerRank = weapons[i].power - weapons[j].power;
      const realRank = contributions[i] - contributions[j];
      if (powerRank !== 0 && realRank !== 0 && (powerRank > 0) !== (realRank > 0)) {
        rankDivergences += 1;
      }
    }
  }

  if (mismatches > 0) {
    failures.push(`Quyết định auto-equip sai lệch ${fmt(mismatches)} lần — ví dụ: ${example}`);
  }
  notes.push(
    `Kiểm tra ${fmt(weapons.length)} lượt (đang mặc → ứng viên) cùng loại Vũ Khí Lv.${level}: ${fmt(swaps)} lần trang bị`
  );
  notes.push(
    `Thông tin: ${fmt(rankDivergences)}/${fmt(rankPairs)} cặp xếp hạng lệch giữa item.power (hiển thị) và Power thật — lý do auto-equip phải dùng Power thật`
  );

  return { name: '3. Auto-equip: quy tắc Power thật', failures, notes };
}

// ---------------------------------------------------------------------------
// 3b/3c. UI delta Power thật + Rule 14b (Tiên Phẩm không rơi mất)
// ---------------------------------------------------------------------------

function makeTestItem(
  type: EquipmentType,
  rarity: Rarity,
  level: number,
  baseStats: ItemStats,
  power = 10
): Item {
  return {
    id: `test_${type}_${Math.random().toString(36).slice(2, 10)}`,
    name: `Test ${type}`,
    type,
    level,
    rarity,
    power,
    baseStats,
    affixes: [],
    createdAt: 0,
  };
}

function fullBagOfTestWhiteItems(): Item[] {
  const items: Item[] = [];
  for (let i = 0; i < MAX_INVENTORY_SLOTS; i += 1) {
    items.push(
      makeTestItem('weapon', 'white', 10, { atk: 10 + i * 0.01 }, 10 + i)
    );
  }
  return items;
}

const MATERIAL_KEYS = [
  'basicMaterial',
  'linhStone',
  'advancedMaterial',
  'rareMaterial',
] as const;

function checkUiPowerDeltaAgreement(samples: number): CheckResult {
  const failures: string[] = [];
  const notes: string[] = [];
  const level = 80;

  const equipment: EquipmentSlots = createEmptyEquipmentSlots();
  for (const slot of EQUIPMENT_SLOTS_LIST) {
    equipment[slot] = generateLootItem(level, undefined, slot);
  }
  const base = calculateStatsAndPower(level, equipment);
  const player: PlayerState = {
    ...createInitialPlayerState(),
    level,
    equipment,
    stats: base.stats,
    power: base.power,
  };

  let swaps = 0;
  let mismatches = 0;
  let deltaMismatch = 0;
  let example = '';

  for (let i = 0; i < samples; i += 1) {
    const type = EQUIPMENT_SLOTS_LIST[i % EQUIPMENT_SLOTS_LIST.length];
    const candidate = generateLootItem(level, undefined, type);
    const delta = getPowerDeltaIfEquipped(player, candidate);
    const result = processItemAcquisition(player, candidate, SETTINGS);

    if (result.autoEquipped) swaps += 1;
    if (result.autoEquipped !== delta > 0) {
      mismatches += 1;
      if (!example) {
        example = `#${i + 1} ${type}: UI delta ${fmt(delta)} — engine ${
          result.autoEquipped ? 'trang bị' : 'bỏ qua'
        }`;
      }
    }

    const appliedDelta = result.player.power - player.power;
    if ((result.autoEquipped && appliedDelta !== delta) || (!result.autoEquipped && appliedDelta !== 0)) {
      deltaMismatch += 1;
    }
  }

  if (mismatches > 0) {
    failures.push(`UI và engine bất đồng quyết định ${fmt(mismatches)} lần — ví dụ: ${example}`);
  }
  if (deltaMismatch > 0) {
    failures.push(`Delta hiển thị lệch mức tăng Power thật: ${fmt(deltaMismatch)} lần`);
  }
  if (swaps === 0) {
    failures.push('Không có lần trang bị nào trong mẫu — không kiểm chứng được delta');
  }

  notes.push(
    `So khớp UI delta với engine trên ${fmt(samples)} ứng viên (Lv.${level}): ${fmt(swaps)} lần trang bị, 0 lệch`
  );

  return { name: '3b. UI delta Chiến Lực = Power thật (khớp engine)', failures, notes };
}

function checkRedRetention(): CheckResult {
  const failures: string[] = [];
  const notes: string[] = [];
  const level = 60;

  // Kịch bản 1: loot Đỏ mới, túi đầy, autoEquip TẮT → phải được giữ bằng cách đẩy món yếu nhất ra.
  let playerA: PlayerState = {
    ...createInitialPlayerState(),
    level,
    inventory: fullBagOfTestWhiteItems(),
  };
  const recalcA = calculateStatsAndPower(level, playerA.equipment);
  playerA = { ...playerA, stats: recalcA.stats, power: recalcA.power };

  const redDrop = makeTestItem('helmet', 'red', level, { hp: 5000 }, 5000);
  const weakestA = playerA.inventory[0];
  const beforeMaterialsA = playerA.materials;
  const resA = processItemAcquisition(playerA, redDrop, {
    ...SETTINGS,
    autoEquip: false,
  });
  const afterA = resA.player;
  const rewardA = getDismantleReward(weakestA);

  if (afterA.inventory.length !== MAX_INVENTORY_SLOTS) {
    failures.push(`[A] Túi sai sức chứa sau khi giữ Tiên Phẩm: ${afterA.inventory.length}`);
  }
  if (!afterA.inventory.some((item) => item.id === redDrop.id)) {
    failures.push('[A] Tiên Phẩm rơi mất khi túi đầy (autoEquip TẮT)');
  }
  if (afterA.inventory.some((item) => item.id === weakestA.id)) {
    failures.push('[A] Món yếu nhất chưa được nhường chỗ');
  }
  if (resA.autoEquipped || resA.dismantled) {
    failures.push('[A] Cờ kết quả sai cho nhánh giữ Tiên Phẩm');
  }
  for (const key of MATERIAL_KEYS) {
    if (afterA.materials[key] - beforeMaterialsA[key] !== rewardA[key]) {
      failures.push(`[A] Nguyên liệu nhận sai ở ${key}`);
    }
  }

  // Kịch bản 2: trang bị Đỏ bị đẩy ra khi auto-equip món mạnh hơn, túi đầy → vẫn phải vào túi.
  const lowRed = makeTestItem('weapon', 'red', level, { atk: 50 }, 50);
  const strongDrop = makeTestItem('weapon', 'orange', level, { atk: 1_000_001 }, 1);
  let playerB: PlayerState = {
    ...createInitialPlayerState(),
    level,
    equipment: { ...createEmptyEquipmentSlots(), weapon: lowRed },
    inventory: fullBagOfTestWhiteItems(),
  };
  const recalcB = calculateStatsAndPower(level, playerB.equipment);
  playerB = { ...playerB, stats: recalcB.stats, power: recalcB.power };

  if (getPowerDeltaIfEquipped(playerB, strongDrop) <= 0) {
    failures.push('[B] Tiền đề test sai: strongDrop không phải nâng cấp');
  }
  const weakestB = playerB.inventory[0];
  const resB = processItemAcquisition(playerB, strongDrop, SETTINGS);
  const afterB = resB.player;

  if (!resB.autoEquipped || afterB.equipment.weapon?.id !== strongDrop.id) {
    failures.push('[B] Không auto-equip được món nâng cấp');
  }
  if (!afterB.inventory.some((item) => item.id === lowRed.id)) {
    failures.push('[B] Tiên Phẩm bị đẩy ra đã rơi mất khi túi đầy');
  }
  if (afterB.inventory.some((item) => item.id === weakestB.id)) {
    failures.push('[B] Chưa đẩy món yếu nhất ra để giữ Tiên Phẩm');
  }
  if (afterB.inventory.length !== MAX_INVENTORY_SLOTS) {
    failures.push(`[B] Túi sai sức chứa: ${afterB.inventory.length}`);
  }
  if (countReds(afterB) !== countReds(playerB)) {
    failures.push('[B] Số Tiên Phẩm thay đổi ngoài dự kiến');
  }

  notes.push('[A] Loot Đỏ + túi đầy (autoEquip TẮT): giữ Đỏ, đẩy món yếu nhất, nhận đúng nguyên liệu');
  notes.push('[B] Trang bị Đỏ bị thay thế + túi đầy: Đỏ vào túi, không rơi mất');

  return { name: '3c. Rule 14b — Tiên Phẩm không rơi mất khi túi đầy', failures, notes };
}

// ---------------------------------------------------------------------------
// 4. Tiến trình dài hạn
// ---------------------------------------------------------------------------

interface GrowthHourRow {
  hour: number;
  towerLevel: number;
  playerLevel: number;
  power: number;
  totalItems: number;
  itemsThisHour: number;
}

interface GrowthReport {
  hours: number;
  simulatedSeconds: number;
  cappedAtMaxActions: boolean;
  player: PlayerState;
  tower: TowerState;
  totalActions: number;
  totalItems: number;
  expectedItems: number;
  autoEquipped: number;
  dismantled: number;
  stored: number;
  maxInventory: number;
  rarityTotals: Record<Rarity, number>;
  milestoneTimes: Array<[string, number]>;
  hourly: GrowthHourRow[];
}

function runGrowth(hours: number): GrowthReport {
  let player = createInitialPlayerState();
  let tower = createInitialTowerState();
  const totalSeconds = hours * 3600;
  const batchActions = 250;
  const maxActions = 2_000_000;
  let simulatedSeconds = 0;
  let totalActions = 0;

  const towerMilestones = [2, 5, 10, 20, 30, 40, 50, 75, 100];
  const playerMilestones = [2, 5, 10, 20, 30, 40, 50, 60, 80, 100];
  const milestoneTimes: Array<[string, number]> = [];

  const rarityTotals = zeroRarityCount();
  let totalItems = 0;
  let autoEquipped = 0;
  let dismantled = 0;
  let stored = 0;
  let maxInventory = 0;
  let progressGained = 0;

  const hourly: GrowthHourRow[] = [];
  let lastHourItems = 0;

  while (simulatedSeconds < totalSeconds && totalActions < maxActions) {
    const progressBefore = tower.lootProgress;
    const res = cultivateTowerSystem(player, tower, SETTINGS, batchActions);
    player = res.player;
    tower = res.tower;
    totalActions += batchActions;

    // Mỗi hành động chiếm 1 / cultivationRate giây thực tế (tick 1s gọi rate hành động)
    simulatedSeconds += batchActions / Math.max(0.1, player.stats.cultivationRate);

    progressGained +=
      tower.lootProgress - progressBefore + res.generatedItems.length * tower.lootThreshold;

    for (const g of res.generatedItems) {
      totalItems += 1;
      rarityTotals[g.item.rarity] += 1;
      if (g.autoEquipped) autoEquipped += 1;
      else if (g.dismantled) dismantled += 1;
      else stored += 1;
    }

    maxInventory = Math.max(maxInventory, player.inventory.length);

    for (const milestone of towerMilestones) {
      const key = `Đỉnh Lv.${milestone}`;
      if (tower.level >= milestone && !milestoneTimes.some(([k]) => k === key)) {
        milestoneTimes.push([key, simulatedSeconds]);
      }
    }
    for (const milestone of playerMilestones) {
      const key = `Nhân vật Lv.${milestone}`;
      if (player.level >= milestone && !milestoneTimes.some(([k]) => k === key)) {
        milestoneTimes.push([key, simulatedSeconds]);
      }
    }

    while (simulatedSeconds >= (hourly.length + 1) * 3600 - 1e-6) {
      hourly.push({
        hour: hourly.length + 1,
        towerLevel: tower.level,
        playerLevel: player.level,
        power: Math.floor(player.power),
        totalItems,
        itemsThisHour: totalItems - lastHourItems,
      });
      lastHourItems = totalItems;
    }
  }

  const expectedItems = Math.floor((80 + progressGained) / 100);

  return {
    hours,
    simulatedSeconds,
    cappedAtMaxActions: totalActions >= maxActions && simulatedSeconds < totalSeconds,
    player,
    tower,
    totalActions,
    totalItems,
    expectedItems,
    autoEquipped,
    dismantled,
    stored,
    maxInventory,
    rarityTotals,
    milestoneTimes,
    hourly,
  };
}

function printGrowth(report: GrowthReport): void {
  section(`6. Tiến trình dài hạn (mục tiêu ${report.hours}h auto-cultivate)`);

  const hoursReached = report.simulatedSeconds / 3600;
  console.log(
    `Đã mô phỏng ${hoursReached.toFixed(2)}h game-time · ${fmt(report.totalActions)} hành động` +
      (report.cappedAtMaxActions
        ? ' — ⚠ CHẠM TRẦN mô phỏng 2,000,000 hành động (kinh tế vẫn tăng tốc)'
        : '')
  );

  console.log('--- Mốc thời gian ---');
  for (const [label, at] of report.milestoneTimes) {
    console.log(`${pad(label, 22)} ${formatDuration(at)}`);
  }

  console.log('\n--- Diễn biến theo giờ ---');
  console.log(
    pad('Giờ', 6) + pad('Đỉnh', 8) + pad('Nhân vật', 10) + pad('Power', 14) + pad('Tổng loot', 11) + 'Loot/giờ'
  );
  for (const row of report.hourly) {
    console.log(
      pad(String(row.hour), 6) +
        pad(String(row.towerLevel), 8) +
        pad(String(row.playerLevel), 10) +
        pad(fmt(row.power), 14) +
        pad(fmt(row.totalItems), 11) +
        fmt(row.itemsThisHour)
    );
  }

  console.log('\n--- Tổng kết ---');
  console.log(
    `Hành động: ${fmt(report.totalActions)} · Loot sinh ra: ${fmt(report.totalItems)} (kỳ vọng theo tiến độ ~${fmt(report.expectedItems)})`
  );
  console.log(
    `Tự trang bị ${fmt(report.autoEquipped)} · Phân giải ${fmt(report.dismantled)} · Vào túi ${fmt(report.stored)}`
  );
  console.log(
    `Phẩm chất: ${RARITY_ORDER.map((r) => `${RARITY_CONFIG[r].name} ${fmt(report.rarityTotals[r])}`).join(' · ')}`
  );
  console.log(
    `Cuối: Đỉnh Lv.${report.tower.level} (${fmt(report.tower.currentExp)}/${fmt(
      report.tower.expToNextLevel
    )} EXP) · Nhân vật Lv.${report.player.level} · Power ${fmt(report.player.power)}`
  );
  console.log(
    `Túi đồ: ${report.player.inventory.length}/${MAX_INVENTORY_SLOTS} (đỉnh ${report.maxInventory}) · Tốc độ ${report.player.stats.cultivationRate}/s · Loot rate +${report.player.stats.lootRate}% · Đỉnh bonus +${report.player.stats.towerExpBonus}%`
  );
  console.log(
    `Nguyên liệu: Linh Thiết ${fmt(report.player.materials.basicMaterial)} · Linh Thạch ${fmt(
      report.player.materials.linhStone
    )} · Huyền Tinh ${fmt(report.player.materials.advancedMaterial)} · Tiên Ngọc ${fmt(
      report.player.materials.rareMaterial
    )}`
  );
}

// ---------------------------------------------------------------------------
// 4. Offline (TASK 002A): tick trực tiếp 1s vs calculateOfflineProgression
// ---------------------------------------------------------------------------

interface TickRunResult {
  player: PlayerState;
  tower: TowerState;
  actions: number;
  towerExpGained: number;
  playerExpGained: number;
  towerLevelsGained: number;
  itemsGeneratedTotal: number;
  autoEquippedCount: number;
  dismantledCount: number;
}

/** Bản sao trung thực của vòng lặp tick online (§30): mỗi giây cộng cultivationRate hiện tại. */
function simulateOnlineTicks(
  player: PlayerState,
  tower: TowerState,
  settings: SettingsState,
  seconds: number,
  maxActions = Number.MAX_SAFE_INTEGER
): TickRunResult {
  let currentPlayer = player;
  let currentTower = tower;
  let fractional = 0;
  let actions = 0;
  let towerExpGained = 0;
  let playerExpGained = 0;
  let towerLevelsGained = 0;
  let itemsGeneratedTotal = 0;
  let autoEquippedCount = 0;
  let dismantledCount = 0;

  for (let second = 0; second < seconds && actions < maxActions; second += 1) {
    const tickBudget = fractional + currentPlayer.stats.cultivationRate;
    let batch = Math.floor(tickBudget);
    fractional = tickBudget - batch;
    if (batch > maxActions - actions) batch = maxActions - actions;

    if (batch > 0) {
      const result = cultivateTowerSystem(currentPlayer, currentTower, settings, batch);
      currentPlayer = result.player;
      currentTower = result.tower;
      actions += batch;
      towerExpGained += result.towerExpGain;
      playerExpGained += result.playerExpGain;
      towerLevelsGained += result.towerLevelsGained;

      for (const generated of result.generatedItems) {
        itemsGeneratedTotal += 1;
        if (generated.autoEquipped) autoEquippedCount += 1;
        else if (generated.dismantled) dismantledCount += 1;
      }
    }
  }

  return {
    player: currentPlayer,
    tower: currentTower,
    actions,
    towerExpGained,
    playerExpGained,
    towerLevelsGained,
    itemsGeneratedTotal,
    autoEquippedCount,
    dismantledCount,
  };
}

/** Chữ ký cấu trúc của trang bị — bỏ qua `id` vì id chứa timestamp wall-clock (khác giữa 2 lần chạy). */
function itemSignature(item: Item | null): string {
  if (!item) return 'trống';
  const affixes = item.affixes.map((affix) => `${affix.type}=${affix.value}`).join(',');
  return `${item.name}|${item.type}|Lv.${item.level}|${item.rarity}|P${item.power}|${affixes}|${
    item.specialEffect?.id ?? '-'
  }`;
}

/** So khớp từng trường giữa kết quả offline và mô phỏng tick trực tiếp. */
function compareOfflineWithDirect(
  offline: { player: PlayerState; tower: TowerState; summary: OfflineRewardSummary | null },
  direct: TickRunResult
): string[] {
  const failures: string[] = [];
  const summary = offline.summary;
  if (!summary) {
    failures.push('Không tạo được summary offline (autoCultivation đang tắt?)');
    return failures;
  }

  const numericPairs: Array<[string, number, number]> = [
    ['Lv Đỉnh', offline.tower.level, direct.tower.level],
    ['EXP Đỉnh hiện tại', offline.tower.currentExp, direct.tower.currentExp],
    ['EXP Đỉnh cần cho Lv kế', offline.tower.expToNextLevel, direct.tower.expToNextLevel],
    ['Tổng lần Khai Đỉnh', offline.tower.totalCultivations, direct.tower.totalCultivations],
    ['Tiến độ loot', offline.tower.lootProgress, direct.tower.lootProgress],
    ['Lv Nhân vật', offline.player.level, direct.player.level],
    ['Tu Luyện EXP hiện tại', offline.player.cultivationExp, direct.player.cultivationExp],
    ['Power', offline.player.power, direct.player.power],
    ['Cống hiến', offline.player.contribution, direct.player.contribution],
    ['Số trang bị trong túi', offline.player.inventory.length, direct.player.inventory.length],
    ['actionsCount', summary.actionsCount, direct.actions],
    ['towerExpGained', summary.towerExpGained, direct.towerExpGained],
    ['playerExpGained', summary.playerExpGained, direct.playerExpGained],
    ['towerLevelsGained', summary.towerLevelsGained, direct.towerLevelsGained],
    ['itemsGeneratedTotal', summary.itemsGeneratedTotal, direct.itemsGeneratedTotal],
    ['autoEquippedCount', summary.autoEquippedCount, direct.autoEquippedCount],
    ['dismantledCount', summary.dismantledCount, direct.dismantledCount],
  ];
  for (const [label, offlineValue, directValue] of numericPairs) {
    if (offlineValue !== directValue) {
      failures.push(`${label} lệch: offline ${fmt(offlineValue)} vs trực tiếp ${fmt(directValue)}`);
    }
  }

  for (const slot of EQUIPMENT_SLOTS_LIST) {
    const offlineSignature = itemSignature(offline.player.equipment[slot]);
    const directSignature = itemSignature(direct.player.equipment[slot]);
    if (offlineSignature !== directSignature) {
      failures.push(`Ô ${slot} lệch: offline ${offlineSignature} vs trực tiếp ${directSignature}`);
    }
  }

  const offlineInventory = offline.player.inventory.map((item) => itemSignature(item)).join(' || ');
  const directInventory = direct.player.inventory.map((item) => itemSignature(item)).join(' || ');
  if (offlineInventory !== directInventory) {
    failures.push('Danh sách trang bị trong túi lệch nội dung/thứ tự');
  }

  const materialKeys: Array<keyof PlayerState['materials']> = [
    'basicMaterial',
    'linhStone',
    'advancedMaterial',
    'rareMaterial',
  ];
  for (const key of materialKeys) {
    if (offline.player.materials[key] !== direct.player.materials[key]) {
      failures.push(
        `Nguyên liệu ${key} lệch: offline ${fmt(offline.player.materials[key])} vs trực tiếp ${fmt(
          direct.player.materials[key]
        )}`
      );
    }
  }

  return failures;
}

/** Người chơi mô phỏng có trang bị tăng cultivationRate (qua soft cap §16). */
function playerWithRateBoost(): PlayerState {
  const equipment = {
    ...createEmptyEquipmentSlots(),
    ring: {
      id: 'sim_ring_rate',
      name: 'Sim • Tụ Linh Giới',
      type: 'ring' as EquipmentType,
      level: 1,
      rarity: 'green' as Rarity,
      power: 120,
      baseStats: { cultivationRate: 8 },
      affixes: [],
      createdAt: 0,
    },
  };
  const recalc = calculateStatsAndPower(1, equipment);
  return {
    ...createInitialPlayerState(),
    equipment,
    stats: recalc.stats,
    power: recalc.power,
  };
}

function withSeededRandom<T>(seed: number, fn: () => T): T {
  const original = Math.random;
  let state = seed >>> 0;
  Math.random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

function checkOfflineFixedRate(): CheckResult {
  const failures: string[] = [];
  const notes: string[] = [];
  const seed = 246813579;
  const player = createInitialPlayerState();
  const tower: TowerState = {
    ...createInitialTowerState(),
    lootProgress: 0,
    lootThreshold: 100000, // nâng ngưỡng loot để cô lập biến số cultivationRate
  };
  const seconds = 60;
  const now = Date.now();

  const direct = withSeededRandom(seed, () =>
    simulateOnlineTicks(player, tower, SETTINGS, seconds)
  );
  const offline = withSeededRandom(seed, () =>
    calculateOfflineProgression(player, tower, SETTINGS, now - seconds * 1000, now)
  );
  failures.push(...compareOfflineWithDirect(offline, direct));

  const expectedActions = Math.floor(seconds * player.stats.cultivationRate);
  if (direct.actions !== expectedActions) {
    failures.push(
      `Số hành động không khớp floor(T×rate): ${fmt(direct.actions)} vs ${fmt(expectedActions)}`
    );
  }
  if (direct.player.stats.cultivationRate !== player.stats.cultivationRate) {
    failures.push('cultivationRate phải cố định trong kịch bản này');
  }
  if ((offline.summary?.itemsGeneratedTotal ?? 0) !== 0) {
    failures.push('Không kỳ vọng loot trong kịch bản ngưỡng loot cao');
  }

  notes.push(
    `A. Tốc độ cố định ${player.stats.cultivationRate}/s · ${seconds}s → ${fmt(expectedActions)} hành động, 0 loot`
  );
  notes.push('Offline khớp tuyệt đối với mô phỏng tick trực tiếp (cùng seed RNG)');

  return { name: `4a. Offline — cultivationRate cố định (${seconds}s)`, failures, notes };
}

function checkOfflineBoostedRate(): CheckResult {
  const failures: string[] = [];
  const notes: string[] = [];
  const seed = 975318642;
  const player = playerWithRateBoost();
  const tower: TowerState = {
    ...createInitialTowerState(),
    lootProgress: 0,
    lootThreshold: 100000,
  };
  const seconds = 300;
  const now = Date.now();

  const direct = withSeededRandom(seed, () =>
    simulateOnlineTicks(player, tower, SETTINGS, seconds)
  );
  const offline = withSeededRandom(seed, () =>
    calculateOfflineProgression(player, tower, SETTINGS, now - seconds * 1000, now)
  );
  failures.push(...compareOfflineWithDirect(offline, direct));

  const expectedActions = Math.floor(seconds * player.stats.cultivationRate);
  if (player.stats.cultivationRate <= 5) {
    failures.push('Trang bị mô phỏng phải làm cultivationRate tăng trên mức cơ bản 5/s');
  }
  // Rate lẻ (10.2/s) tích lũy phần dư theo từng tick — cho phép lệch ±1 do dấu phẩy động.
  if (Math.abs(direct.actions - expectedActions) > 1) {
    failures.push(
      `Số hành động lệch quá ±1 so với floor(T×rate): ${fmt(direct.actions)} vs ${fmt(expectedActions)}`
    );
  }

  notes.push(
    `B. Trang bị +cultivationRate → tốc độ ${player.stats.cultivationRate}/s (gốc 5/s) · ${seconds}s → ${fmt(
      expectedActions
    )} hành động (thay vì ${fmt(seconds * 5)})`
  );
  notes.push('Offline dùng đúng tốc độ đã buff của trang bị, khớp tick trực tiếp');

  return { name: `4b. Offline — trang bị tăng cultivationRate (${seconds}s)`, failures, notes };
}

function checkOfflineLootAndEquip(): CheckResult {
  const failures: string[] = [];
  const notes: string[] = [];
  const seed = 135792468;
  const player = createInitialPlayerState();
  const tower = createInitialTowerState();
  const seconds = 2 * 3600;
  const now = Date.now();

  const direct = withSeededRandom(seed, () =>
    simulateOnlineTicks(player, tower, SETTINGS, seconds)
  );
  const offline = withSeededRandom(seed, () =>
    calculateOfflineProgression(player, tower, SETTINGS, now - seconds * 1000, now)
  );
  failures.push(...compareOfflineWithDirect(offline, direct));

  if (direct.itemsGeneratedTotal < 1) failures.push('Kịch bản 2h phải sinh loot');
  if (direct.autoEquippedCount < 1) failures.push('Kịch bản 2h phải có ít nhất một lần auto-equip');

  const startRate = player.stats.cultivationRate;
  const endRate = direct.player.stats.cultivationRate;
  const startFormulaActions = Math.floor(seconds * startRate);
  if (endRate !== startRate) {
    if (direct.actions <= startFormulaActions) {
      failures.push('Tốc độ đổi giữa chừng nhưng số hành động không lệch công thức rate-đầu — bất thường');
    }
    notes.push(
      `C. Tốc độ đổi giữa chừng ${startRate}/s → ${endRate}/s: ${fmt(
        direct.actions
      )} hành động (công thức cũ theo rate-đầu chỉ ${fmt(startFormulaActions)})`
    );
  } else {
    notes.push('C. Tốc độ không đổi trong kịch bản này');
  }
  notes.push(
    `2h: ${fmt(direct.itemsGeneratedTotal)} loot (tự trang bị ${fmt(
      direct.autoEquippedCount
    )}, phân giải ${fmt(direct.dismantledCount)}) — từng trường khớp tick trực tiếp`
  );

  return { name: '4c. Offline — 2h nhiều loot/auto-equip', failures, notes };
}

function checkOfflineBeyondExactCap(): CheckResult {
  const failures: string[] = [];
  const notes: string[] = [];
  const base = createInitialPlayerState();
  // Tốc độ 60/s + tắt auto-equip + chặn lên cấp để rate không bị công thức stats ghi đè —
  // mục đích duy nhất: kích hoạt nhánh ngoại suy khi vượt trần mô phỏng chính xác.
  const player: PlayerState = {
    ...base,
    cultivationExpToNext: Number.MAX_SAFE_INTEGER,
    stats: { ...base.stats, cultivationRate: 60 },
  };
  const tower = createInitialTowerState();
  const settings: SettingsState = { ...SETTINGS, autoEquip: false };
  const seconds = MAX_OFFLINE_SECONDS;
  const now = Date.now();

  const offline = calculateOfflineProgression(
    player,
    tower,
    settings,
    now - seconds * 1000,
    now
  );
  const summary = offline.summary;
  if (!summary) {
    failures.push('Không tạo được summary offline cho kịch bản vượt trần');
    return { name: '4d. Offline — vượt trần mô phỏng chính xác (ngoại suy)', failures, notes };
  }

  if (summary.elapsedSeconds !== seconds) {
    failures.push(`Thời gian phải kẹp đúng ${fmt(seconds)}s: ${fmt(summary.elapsedSeconds)}s`);
  }
  if (summary.actionsCount <= MAX_EXACT_ACTIONS) {
    failures.push(
      `Không kích hoạt ngoại suy: actionsCount ${fmt(summary.actionsCount)} không vượt trần ${fmt(
        MAX_EXACT_ACTIONS
      )}`
    );
  }
  const expectedActions = seconds * 60; // rate cố định 60/s → tổng = T×rate, gồm cả phần ngoại suy
  if (summary.actionsCount !== expectedActions) {
    failures.push(
      `Tổng hành động (chính xác + ngoại suy) lệch: ${fmt(summary.actionsCount)} vs ${fmt(
        expectedActions
      )}`
    );
  }

  // Không sinh item ảo: loot chỉ đến từ phần mô phỏng chính xác (gain 1/action, ngưỡng 100, đầu 80).
  const expectedExactItems = Math.floor(
    (tower.lootProgress + MAX_EXACT_ACTIONS) / tower.lootThreshold
  );
  if (summary.itemsGeneratedTotal !== expectedExactItems) {
    failures.push(
      `Số vật phẩm phải đúng bằng loot của phần chính xác: ${fmt(
        summary.itemsGeneratedTotal
      )} vs ${fmt(expectedExactItems)}`
    );
  }
  if (summary.itemsGenerated.length > 40) {
    failures.push('itemsGenerated vượt giới hạn 40 món của UI');
  }
  if (offline.tower.totalCultivations !== tower.totalCultivations + summary.actionsCount) {
    failures.push('totalCultivations không khớp tổng số hành động');
  }
  if (
    !Number.isFinite(offline.player.cultivationExp) ||
    !Number.isFinite(offline.tower.currentExp) ||
    !Number.isFinite(offline.player.power)
  ) {
    failures.push('EXP/Power không hữu hạn sau ngoại suy');
  }

  notes.push(
    `D. Rate giả lập 60/s × ${formatDuration(seconds)} = ${fmt(
      expectedActions
    )} hành động > trần ${fmt(MAX_EXACT_ACTIONS)} → phần dư ngoại suy, KHÔNG sinh thêm vật phẩm`
  );
  notes.push(
    `Loot thực sinh ${fmt(summary.itemsGeneratedTotal)} món (bằng đúng phần chính xác); lootProgress cuối ${fmt(
      offline.tower.lootProgress
    )} (giữ tiến độ dư, theo thiết kế §21)`
  );

  return { name: '4d. Offline — vượt trần mô phỏng chính xác (ngoại suy)', failures, notes };
}

function checkOfflineEightHourCap(): CheckResult {
  const failures: string[] = [];
  const notes: string[] = [];
  const seed = 192837465;
  const player = createInitialPlayerState();
  const tower = createInitialTowerState();
  const now = Date.now();

  const direct = withSeededRandom(seed, () =>
    simulateOnlineTicks(player, tower, SETTINGS, MAX_OFFLINE_SECONDS)
  );
  const offline8 = withSeededRandom(seed, () =>
    calculateOfflineProgression(player, tower, SETTINGS, now - 8 * 3600 * 1000, now)
  );
  const offline10 = withSeededRandom(seed, () =>
    calculateOfflineProgression(player, tower, SETTINGS, now - 10 * 3600 * 1000, now)
  );

  failures.push(...compareOfflineWithDirect(offline8, direct));
  failures.push(...compareOfflineWithDirect(offline10, direct));

  if (offline8.summary?.elapsedSeconds !== MAX_OFFLINE_SECONDS) {
    failures.push(`Rời đúng 8h phải tính đủ 8h: ${fmt(offline8.summary?.elapsedSeconds ?? 0)}s`);
  }
  if (offline10.summary?.elapsedSeconds !== MAX_OFFLINE_SECONDS) {
    failures.push(
      `Rời 10h phải bị kẹp còn 8h: ${fmt(offline10.summary?.elapsedSeconds ?? 0)}s`
    );
  }

  notes.push(
    `E. Rời 8h và rời 10h cho kết quả GIỐNG NHAU (kẹp trần ${formatDuration(
      MAX_OFFLINE_SECONDS
    )}) và khớp tick trực tiếp 8h`
  );
  notes.push(
    `${fmt(direct.actions)} hành động · Đỉnh Lv.${direct.tower.level} · Nhân vật Lv.${direct.player.level}`
  );

  return { name: '4e. Offline — trần 8 giờ', failures, notes };
}

// ---------------------------------------------------------------------------
// 6. Save v1: sanitize dữ liệu hỏng (TASK 002A — Bug #4)
// ---------------------------------------------------------------------------

function checkSaveSanitize(): CheckResult {
  const failures: string[] = [];
  const notes: string[] = [];

  // 6.1 Save hợp lệ hiện tại phải round-trip nguyên vẹn.
  const validSave = {
    version: 1,
    player: createInitialPlayerState(),
    tower: createInitialTowerState(),
    settings: SETTINGS,
    lastSavedAt: Date.now(),
  };
  const roundTrip = sanitizeSaveData(JSON.parse(JSON.stringify(validSave)));
  if (!roundTrip) {
    failures.push('Save hợp lệ bị từ chối');
  } else {
    if (roundTrip.player.level !== validSave.player.level) failures.push('Round-trip đổi Lv Nhân vật');
    if (roundTrip.tower.lootProgress !== validSave.tower.lootProgress) {
      failures.push('Round-trip đổi lootProgress');
    }
    if (roundTrip.lastSavedAt !== validSave.lastSavedAt) failures.push('Round-trip đổi lastSavedAt');
    if (roundTrip.settings.autoDismantleMaxRarity !== SETTINGS.autoDismantleMaxRarity) {
      failures.push('Round-trip đổi settings');
    }
  }

  // 6.2 Field thiếu → default hợp lệ, KHÔNG reset cả save.
  const partial = sanitizeSaveData({
    version: 1,
    player: { level: 7 },
    tower: { level: 5 },
  });
  if (!partial) {
    failures.push('Save thiếu field phụ bị từ chối oan (phải sanitize, không reset)');
  } else {
    if (partial.player.level !== 7) failures.push(`Lv hợp lệ bị đổi: ${partial.player.level}`);
    if (partial.tower.level !== 5) failures.push(`Lv Đỉnh hợp lệ bị đổi: ${partial.tower.level}`);
    if (partial.player.autoCultivation !== true) failures.push('autoCultivation thiếu phải mặc định true');
    if (partial.player.inventory.length !== 0) failures.push('inventory thiếu phải mặc định rỗng');
    if (partial.tower.lootThreshold !== 100) failures.push('lootThreshold thiếu phải mặc định 100');
    if (partial.settings.autoDismantleMaxRarity !== 'green') {
      failures.push('settings thiếu phải dùng mặc định');
    }
    if (partial.lastSavedAt !== 0) failures.push('lastSavedAt thiếu phải là 0 (không cộng bế quan)');
    if (!Number.isFinite(partial.player.power) || partial.player.power <= 0) {
      failures.push('power phải được tính lại hữu hạn');
    }
  }

  // 6.3 Dữ liệu sai kiểu / NaN / Infinity / âm.
  const nasty = sanitizeSaveData({
    version: 1,
    player: {
      level: 'abc',
      cultivationExp: NaN,
      cultivationExpToNext: Infinity,
      contribution: -50,
      autoCultivation: 'yes',
      inventory: [null, 42, {}],
      materials: { basicMaterial: -5, linhStone: NaN },
      equipment: { weapon: { type: 'helmet' } },
    },
    tower: {
      level: -3,
      currentExp: Infinity,
      lootProgress: 1e12,
      lootThreshold: 0,
      totalCultivations: -9,
    },
    settings: { autoEquip: 'nope', autoDismantleMaxRarity: 'gold' },
    lastSavedAt: NaN,
  });
  if (!nasty) {
    failures.push('Save nhiễu bị từ chối (kỳ vọng sanitize an toàn)');
  } else {
    if (nasty.player.level !== 1) failures.push(`level sai kiểu phải về 1: ${nasty.player.level}`);
    if (nasty.player.cultivationExp !== 0) {
      failures.push(`cultivationExp NaN phải về 0: ${nasty.player.cultivationExp}`);
    }
    if (nasty.player.cultivationExpToNext !== calculatePlayerExpToNext(1)) {
      failures.push('cultivationExpToNext Infinity phải dùng công thức hiện hành');
    }
    if (nasty.player.contribution !== 0) failures.push('contribution âm phải kẹp 0');
    if (nasty.player.autoCultivation !== true) failures.push('autoCultivation sai kiểu phải mặc định true');
    if (nasty.player.inventory.length !== 0) failures.push('inventory rác phải bị lọc sạch');
    if (nasty.player.materials.basicMaterial !== 0) failures.push('material âm phải về 0');
    if (nasty.player.equipment.weapon !== null) failures.push('Trang bị sai ô phải bị loại');
    if (nasty.tower.level !== 1) failures.push('Lv Đỉnh âm phải về 1');
    if (nasty.tower.currentExp !== 0) failures.push('EXP Đỉnh Infinity phải về 0');
    if (!(nasty.tower.lootProgress >= 0 && nasty.tower.lootProgress < nasty.tower.lootThreshold)) {
      failures.push(
        `lootProgress phải nằm trong [0, threshold): ${nasty.tower.lootProgress}/${nasty.tower.lootThreshold}`
      );
    }
    if (nasty.tower.lootThreshold !== 100) failures.push('lootThreshold 0 phải về mặc định 100');
    if (nasty.tower.totalCultivations !== 0) failures.push('totalCultivations âm phải về 0');
    if (nasty.settings.autoEquip !== true) failures.push('settings sai kiểu phải dùng mặc định');
    if (nasty.settings.autoDismantleMaxRarity !== 'green') {
      failures.push('rarity lạ phải về mặc định');
    }
    if (nasty.lastSavedAt !== 0) failures.push('lastSavedAt NaN phải về 0');
  }

  // 6.4 Save không thể cứu → null (fallback initial state), không ném lỗi.
  const hopeless: unknown[] = [null, undefined, 'x', 42, [], { version: 2 }, {}, { version: 1 }];
  for (const bad of hopeless) {
    if (sanitizeSaveData(bad) !== null) {
      failures.push(`Save không hợp lệ vẫn được chấp nhận: ${JSON.stringify(bad) ?? String(bad)}`);
    }
  }

  // 6.5 Trang bị: giữ Tiên phẩm + field hợp lệ, loại field rác và món sai ô.
  const redHelmet = {
    id: 'sim_red_helmet',
    name: 'Tiên Quan',
    type: 'helmet',
    level: 3,
    rarity: 'red',
    power: 999,
    baseStats: { atk: 55, hp: NaN },
    affixes: [{ type: 'ATK_PERCENT', value: 12 }],
    specialEffect: { id: 'tien_dao_burst', name: 'X', description: 'Y', rarity: 'red' },
    createdAt: 1,
  };
  const misfitHelmet = {
    id: 'sim_misfit',
    name: 'Mũ lạc ô',
    type: 'helmet',
    level: 1,
    rarity: 'green',
    power: 10,
    baseStats: { def: 5 },
    affixes: [],
  };
  const itemized = sanitizeSaveData({
    version: 1,
    player: {
      level: 3,
      equipment: { weapon: misfitHelmet, helmet: redHelmet },
      inventory: [redHelmet, {}, null],
    },
    tower: { level: 3 },
  });
  if (!itemized) {
    failures.push('Save có trang bị hợp lệ bị từ chối');
  } else {
    if (itemized.player.equipment.weapon !== null) {
      failures.push('Trang bị sai ô phải bị loại bỏ');
    }
    if (itemized.player.equipment.helmet?.rarity !== 'red') {
      failures.push('Tiên phẩm trong ô hợp lệ phải được giữ');
    }
    if (itemized.player.equipment.helmet?.specialEffect?.id !== 'tien_dao_burst') {
      failures.push('Hiệu ứng đặc biệt hợp lệ phải được giữ');
    }
    if (itemized.player.inventory.length !== 1 || itemized.player.inventory[0].rarity !== 'red') {
      failures.push('Túi đồ phải giữ đúng 1 Tiên phẩm và lọc rác');
    }
    if (itemized.player.inventory[0].baseStats.hp !== undefined) {
      failures.push('baseStats NaN phải bị loại field');
    }
    if (
      itemized.player.inventory[0].affixes.length !== 1 ||
      itemized.player.inventory[0].affixes[0].value !== 12
    ) {
      failures.push('Dòng phụ hợp lệ phải được giữ nguyên');
    }
  }

  notes.push('4 nhóm kiểm tra: round-trip save hợp lệ · field thiếu/sai kiểu · save không thể cứu · trang bị trong save');
  notes.push('Không trường hợp nào ném lỗi và không reset oan save hợp lệ');

  return { name: '6. Save v1 — sanitize dữ liệu hỏng', failures, notes };
}

// ---------------------------------------------------------------------------
// 5. Tra cứu công thức
// ---------------------------------------------------------------------------

function syntheticPlayer(level: number, power: number): PlayerState {
  const base = createInitialPlayerState();
  return { ...base, level, power, stats: { ...base.stats, cultivationRate: 5 } };
}

function printFormulaProbe(): void {
  section('5. Tra cứu công thức (chi phí EXP · gain mỗi hành động)');

  console.log('--- Chi phí EXP kế tiếp ---');
  console.log(pad('Lv', 6) + pad('Đỉnh: 1000·L^1.35', 24) + 'Nhân vật: 100·L^1.32');
  for (const level of [1, 2, 5, 10, 20, 30, 50, 100]) {
    console.log(
      pad(String(level), 6) +
        pad(fmt(calculateTowerExpToNextLevel(level)), 24) +
        fmt(calculatePlayerExpToNext(level))
    );
  }

  console.log('\n--- Gain mỗi hành động theo Power × Level (Đỉnh EXP / Tu Luyện EXP) ---');
  console.log(pad('Power', 12) + pad('Lv.1', 18) + pad('Lv.10', 18) + pad('Lv.30', 18) + 'Lv.50');
  for (const power of [500, 1000, 5000, 20000, 100000, 1000000]) {
    const cells: string[] = [];
    for (const level of [1, 10, 30, 50]) {
      const gains = calculateSingleActionGains(syntheticPlayer(level, power), 1);
      cells.push(pad(`${fmt(gains.towerExpGain)} / ${fmt(gains.playerExpGain)}`, 18));
    }
    console.log(pad(fmt(power), 12) + cells.join(''));
  }
  console.log('(Tốc độ mặc định 5 hành động/giây — nhân gain với 5 để ra gain/giây)');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const args = new Map<string, string>();
  for (const raw of process.argv.slice(2)) {
    const [key, value] = raw.replace(/^--/, '').split('=');
    args.set(key, value ?? 'true');
  }
  const quick = args.has('quick');
  const hours = Number(args.get('hours') ?? (quick ? 6 : 24));
  const actions = Number(args.get('actions') ?? (quick ? 10000 : 50000));
  const rolls = Number(args.get('rolls') ?? (quick ? 50000 : 200000));
  const samples = Number(args.get('samples') ?? (quick ? 150 : 300));

  console.log('VẠN ĐẠO TIÊN ĐỈNH — Mô phỏng headless vòng lặp chính (npm run sim)');

  const results: CheckResult[] = [
    checkLoopInvariants(actions),
    checkRarityDistribution(rolls),
    checkAutoEquipRule(samples),
    checkUiPowerDeltaAgreement(samples),
    checkRedRetention(),
    checkOfflineFixedRate(),
    checkOfflineBoostedRate(),
    checkOfflineLootAndEquip(),
    checkOfflineBeyondExactCap(),
    checkOfflineEightHourCap(),
    checkSaveSanitize(),
  ];

  for (const result of results) {
    section(result.name);
    for (const note of result.notes) console.log(`  · ${note}`);
    if (result.failures.length === 0) {
      console.log('  ✔ PASS');
    } else {
      for (const failure of result.failures) console.log(`  ✘ FAIL: ${failure}`);
    }
  }

  printFormulaProbe();
  printGrowth(runGrowth(hours));

  const totalFailures = results.reduce((sum, r) => sum + r.failures.length, 0);
  console.log(
    `\nTổng kết: ${
      totalFailures === 0 ? 'TẤT CẢ BẤT BIẾN PASS' : `${totalFailures} lỗi phát hiện`
    }`
  );
  if (totalFailures > 0) {
    process.exitCode = 1;
  }
}

main();
