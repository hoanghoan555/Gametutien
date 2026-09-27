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
import { LOOT_DROP_TABLE } from '../src/data/lootTables';
import { RARITY_CONFIG, RARITY_ORDER } from '../src/data/rarities';
import {
  calculateSingleActionGains,
  cultivateTowerSystem,
  processItemAcquisition,
} from '../src/systems/cultivation';
import {
  createEmptyEquipmentSlots,
  MAX_INVENTORY_SLOTS,
} from '../src/systems/equipment';
import { generateLootItem, rollRarity } from '../src/systems/loot';
import { calculateOfflineProgression } from '../src/systems/offline';
import {
  calculatePlayerExpToNext,
  calculateStatsAndPower,
  createInitialPlayerState,
} from '../src/systems/progression';
import {
  calculateTowerExpToNextLevel,
  createInitialTowerState,
} from '../src/systems/tower';
import { SettingsState } from '../src/types/game';
import { EquipmentType, Item, Rarity } from '../src/types/item';
import { PlayerState } from '../src/types/player';
import { TowerState } from '../src/types/tower';
import { formatDuration } from '../src/utils/number';

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
// 5. Offline: mô phỏng trực tiếp vs calculateOfflineProgression
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 4. Offline: mô phỏng trực tiếp vs calculateOfflineProgression
// ---------------------------------------------------------------------------

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

function checkOfflineCase(
  label: string,
  seconds: number,
  options: { rate?: number } = {}
): CheckResult {
  const failures: string[] = [];
  const notes: string[] = [];
  let player = createInitialPlayerState();
  const tower = createInitialTowerState();
  if (options.rate) {
    player = { ...player, stats: { ...player.stats, cultivationRate: options.rate } };
  }
  const actions = Math.max(1, Math.floor(seconds * player.stats.cultivationRate));
  const now = Date.now();
  const seed = 987654321;

  // Cùng seed RNG cho cả hai đường đi → so khớp chính xác về logic (không còn nhiễu thống kê).
  const direct = withSeededRandom(seed, () =>
    cultivateTowerSystem(player, tower, SETTINGS, actions)
  );
  const off = withSeededRandom(seed, () =>
    calculateOfflineProgression(player, tower, SETTINGS, now - seconds * 1000, now)
  );
  const summary = off.summary;

  if (!summary) {
    failures.push('Không tạo được summary offline (autoCultivation đang tắt?)');
    return { name: label, failures, notes };
  }

  const expectedItems = Math.floor((tower.lootProgress + actions) / tower.lootThreshold);

  notes.push(
    `Rời game ${fmt(seconds)}s → ${fmt(actions)} hành động (tốc độ ${player.stats.cultivationRate}/s, seed RNG cố định)`
  );
  notes.push(
    `Trực tiếp: Đỉnh Lv.${direct.tower.level}, +${fmt(direct.towerExpGain)} EXP Đỉnh, Nhân vật Lv.${direct.player.level}, ${fmt(direct.generatedItems.length)} vật phẩm`
  );
  notes.push(
    `Offline:   Đỉnh Lv.${off.tower.level}, +${fmt(summary.towerExpGained)} EXP Đỉnh, Nhân vật Lv.${off.player.level}, ${fmt(summary.itemsGeneratedTotal)} vật phẩm`
  );
  notes.push(`Kỳ vọng theo tiến độ loot: ~${fmt(expectedItems)} vật phẩm (tham khảo)`);

  if (off.tower.level !== direct.tower.level) {
    failures.push(`Lv Đỉnh lệch: offline ${off.tower.level} vs trực tiếp ${direct.tower.level}`);
  }
  if (off.player.level !== direct.player.level) {
    failures.push(`Lv Nhân vật lệch: offline ${off.player.level} vs trực tiếp ${direct.player.level}`);
  }
  if (summary.actionsCount !== actions) {
    failures.push(`actionsCount lệch: ${fmt(summary.actionsCount)} vs ${fmt(actions)}`);
  }
  if (summary.towerExpGained !== direct.towerExpGain) {
    failures.push(
      `Tổng EXP Đỉnh lệch: offline ${fmt(summary.towerExpGained)} vs trực tiếp ${fmt(direct.towerExpGain)}`
    );
  }
  if (summary.playerExpGained !== direct.playerExpGain) {
    failures.push(
      `Tổng EXP Nhân vật lệch: offline ${fmt(summary.playerExpGained)} vs trực tiếp ${fmt(direct.playerExpGain)}`
    );
  }
  if (summary.itemsGeneratedTotal !== direct.generatedItems.length) {
    failures.push(
      `Số vật phẩm lệch: offline ${fmt(summary.itemsGeneratedTotal)} vs trực tiếp ${fmt(direct.generatedItems.length)}`
    );
  }

  return { name: label, failures, notes };
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
    checkOfflineCase('4a. Offline 60s (mô phỏng chính xác, seed RNG cố định)', 60),
    checkOfflineCase('4b. Offline 1h (mô phỏng chính xác, seed RNG cố định)', 3600),
    checkOfflineCase('4c. Offline 8h ở tốc độ tối đa ~40/s (mô phỏng chính xác)', 8 * 3600, {
      rate: 40,
    }),
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
