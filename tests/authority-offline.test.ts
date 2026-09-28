import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAuthorityAction,
  claimOfflineAuthority,
  createInitialMpPlayerState,
  createInitialMpTowerState,
  cultivateAuthorityBatch,
  MpActionResult,
  MpPlayerState,
  MpTowerState,
} from '../src/shared/authority';
import { MAX_OFFLINE_SECONDS } from '../src/systems/offline';
import { calculateTowerExpToNextLevel } from '../src/systems/tower';
import { SettingsState } from '../src/types/game';
import { createMutableClock, equipItem, makeTestDeps, makeTestItem } from './mp-helpers';

const SETTINGS: SettingsState = {
  autoEquip: true,
  autoDismantle: true,
  autoDismantleMaxRarity: 'green',
  soundEnabled: false,
};

function rateItem(cultivationRate: number) {
  return makeTestItem({
    id: 'ring-rate',
    type: 'ring',
    rarity: 'blue',
    level: 1,
    power: 1,
    baseStats: { cultivationRate },
  });
}

function strongWeapon(atk: number) {
  return makeTestItem({
    id: 'weapon-strong',
    type: 'weapon',
    rarity: 'purple',
    level: 1,
    power: atk,
    baseStats: { atk },
  });
}

test('D4 — autoCultivation=false: claim là no-op', () => {
  const { clock, advance } = createMutableClock();
  const deps = makeTestDeps('off-d4', clock);
  const player = { ...createInitialMpPlayerState(clock.now()), autoCultivation: false };
  const tower = createInitialMpTowerState();

  advance(3600 * 1000);
  const claim = claimOfflineAuthority(deps, { userId: 'u', player, tower, settings: SETTINGS });

  assert.equal(claim.applied, false);
  assert.equal(claim.summary, null);
  assert.deepStrictEqual(claim.player, player);
  assert.deepStrictEqual(claim.tower, tower);
});

test('offline parity — claim 2s = batch đúng chuỗi seq đó (không lệch do chia tick)', () => {
  const { clock, advance } = createMutableClock();
  const deps = makeTestDeps('off-parity', clock);
  const player: MpPlayerState = { ...createInitialMpPlayerState(clock.now()), lootProgress: 99 };
  const tower = createInitialMpTowerState();

  advance(2000);
  const claim = claimOfflineAuthority(deps, { userId: 'u-off', player, tower, settings: SETTINGS });
  const reference = cultivateAuthorityBatch(deps, {
    userId: 'u-off',
    player,
    tower,
    settings: SETTINGS,
    count: 10, // rate 5/giây × 2 giây
  });

  assert.equal(claim.applied, true);
  assert.equal(claim.summary?.actionsCount, 10);
  assert.equal(claim.summary?.elapsedSeconds, 2);
  assert.ok((claim.summary?.lootEvents.length ?? 0) >= 1);
  assert.deepStrictEqual(claim.tower, reference.tower);
  assert.deepStrictEqual(
    {
      ...claim.player,
      lastGrantAt: player.lastGrantAt,
      fractionalActions: reference.player.fractionalActions,
    },
    reference.player
  );
  assert.ok(claim.player.fractionalActions >= 0 && claim.player.fractionalActions < 1);
  assert.deepStrictEqual(claim.summary?.lootEvents, reference.lootEvents);
  assert.equal(claim.player.lastGrantAt, clock.now());
});

test('I4/I5 — fractionalActions persist qua cửa sổ; gap nhỏ vẫn sinh hành động (bỏ ngưỡng 15s)', () => {
  const { clock, advance } = createMutableClock();
  const deps = makeTestDeps('off-fraction', clock);
  let player = equipItem(createInitialMpPlayerState(clock.now()), rateItem(0.4)); // rate 5.4
  let tower = createInitialMpTowerState();

  const windows: Array<{ actions: number; fraction: number }> = [];
  for (let i = 0; i < 3; i += 1) {
    advance(1000);
    const claim = claimOfflineAuthority(deps, { userId: 'u-frac', player, tower, settings: SETTINGS });
    assert.equal(claim.applied, true);
    player = claim.player;
    tower = claim.tower;
    windows.push({
      actions: claim.summary?.actionsCount ?? 0,
      fraction: claim.player.fractionalActions,
    });
  }

  assert.deepStrictEqual(
    windows.map((entry) => entry.actions),
    [5, 5, 6],
    'tick budget = fractional + rate, phần lẻ giữ nguyên qua cửa sổ'
  );
  assert.ok(Math.abs(windows[0].fraction - 0.4) < 1e-9);
  assert.ok(Math.abs(windows[1].fraction - 0.8) < 1e-9);
  assert.ok(Math.abs(windows[2].fraction - 0.2) < 1e-9);
});

test('D3 — trần offline 8h', () => {
  const { clock, advance } = createMutableClock();
  const deps = makeTestDeps('off-cap', clock);
  const player = createInitialMpPlayerState(clock.now());

  advance(20 * 3600 * 1000); // 20 giờ
  const claim = claimOfflineAuthority(deps, {
    userId: 'u-cap',
    player,
    tower: createInitialMpTowerState(),
    settings: SETTINGS,
  });

  assert.equal(claim.applied, true);
  assert.equal(claim.summary?.elapsedSeconds, MAX_OFFLINE_SECONDS);
  // Rate thay đổi giữa cửa sổ (auto-equip trang bị) nên chỉ chốt sàn/theo rate gốc + bất biến.
  const actionsCount = claim.summary?.actionsCount ?? 0;
  assert.ok(actionsCount >= MAX_OFFLINE_SECONDS * 5, 'phải chạy tối thiểu theo rate gốc 5/s');
  assert.ok(actionsCount <= MAX_OFFLINE_SECONDS * 40, 'không vượt trần tốc độ soft-cap §16');
  assert.equal(claim.player.cultivations, actionsCount);
  assert.equal(claim.player.lastGrantAt, clock.now());
});

test('ràng buộc 4 — item level = Tower level TỪNG action (có level-up giữa cửa sổ)', () => {
  const { clock, advance } = createMutableClock();
  const deps = makeTestDeps('off-levels', clock);
  const player = equipItem(
    { ...createInitialMpPlayerState(clock.now()), lootProgress: 99 },
    strongWeapon(100_000)
  );
  const startLevel = 5;
  const tower: MpTowerState = {
    level: startLevel,
    currentExp: calculateTowerExpToNextLevel(startLevel) - 1,
    expToNextLevel: calculateTowerExpToNextLevel(startLevel),
    totalCultivations: 0,
  };

  advance(600 * 1000);
  const claim = claimOfflineAuthority(deps, { userId: 'u-lv', player, tower, settings: SETTINGS });
  assert.equal(claim.applied, true);
  const actionsCount = claim.summary?.actionsCount ?? 0;
  assert.ok(actionsCount > 1000);

  // Reference: replay từng action, ghi lại Tower level tại mỗi loot event.
  let referencePlayer = player;
  let referenceTower = tower;
  const referenceLevels: number[] = [];
  for (let i = 0; i < actionsCount; i += 1) {
    const step: MpActionResult = applyAuthorityAction(deps, {
      userId: 'u-lv',
      player: referencePlayer,
      tower: referenceTower,
      settings: SETTINGS,
    });
    if (step.lootEvents.length > 0) referenceLevels.push(step.tower.level);
    referencePlayer = step.player;
    referenceTower = step.tower;
  }

  const claimedLevels = (claim.summary?.lootEvents ?? []).map((event) => event.item.level);
  assert.ok(claimedLevels.length >= 10, 'cửa sổ phải sinh đủ loot để quan sát nhiều level');
  assert.deepStrictEqual(claimedLevels, referenceLevels);
  assert.ok(claimedLevels[0] > startLevel, 'action đầu đã lên cấp → loot dùng level MỚI');
  assert.ok(new Set(claimedLevels).size >= 2, 'level phải tiến hoá theo từng action');
  assert.deepStrictEqual(claim.tower, referenceTower);
  assert.deepStrictEqual(claim.player, {
    ...referencePlayer,
    lastGrantAt: clock.now(),
    fractionalActions: claim.player.fractionalActions,
  });
});

test('I3 — base Tower lấy tại thời điểm claim (Đỉnh đã thay đổi bởi người khác)', () => {
  const { clock, advance } = createMutableClock();
  const deps = makeTestDeps('off-base', clock);
  const player = equipItem(
    { ...createInitialMpPlayerState(clock.now()), lootProgress: 99 },
    strongWeapon(100_000)
  );

  const makeTower = (level: number): MpTowerState => ({
    level,
    currentExp: calculateTowerExpToNextLevel(level) - 1,
    expToNextLevel: calculateTowerExpToNextLevel(level),
    totalCultivations: 123_456,
  });

  advance(60 * 1000);
  const lowBase = claimOfflineAuthority(deps, {
    userId: 'u-base',
    player,
    tower: makeTower(5),
    settings: SETTINGS,
  });
  const highBase = claimOfflineAuthority(deps, {
    userId: 'u-base',
    player,
    tower: makeTower(50),
    settings: SETTINGS,
  });

  const lowLevels = (lowBase.summary?.lootEvents ?? []).map((event) => event.item.level);
  const highLevels = (highBase.summary?.lootEvents ?? []).map((event) => event.item.level);

  assert.ok(lowLevels.length >= 2 && highLevels.length >= 2);
  assert.ok(Math.max(...lowLevels) < 50, 'base thấp → item level thấp');
  assert.ok(Math.min(...highLevels) >= 50, 'base đã bị người khác đẩy lên → item level theo base mới');
  assert.ok(
    highBase.tower.totalCultivations > 123_456,
    'đóng góp offline cộng tiếp lên trạng thái Đỉnh hiện hành'
  );
});

test('gap 0s — không có gì để claim', () => {
  const { clock } = createMutableClock();
  const deps = makeTestDeps('off-zero', clock);
  const player = createInitialMpPlayerState(clock.now());

  const claim = claimOfflineAuthority(deps, {
    userId: 'u-zero',
    player,
    tower: createInitialMpTowerState(),
    settings: SETTINGS,
  });

  assert.equal(claim.applied, false);
});
