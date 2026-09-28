import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAuthorityAction,
  createInitialMpPlayerState,
  createInitialMpTowerState,
  cultivateAuthorityBatch,
  MpActionResult,
  MpPlayerState,
} from '../src/shared/authority';
import { rollRarityWithRng } from '../src/systems/loot';
import { addMaterials, getDismantleReward } from '../src/systems/equipment';
import { calculateTowerExpToNextLevel } from '../src/systems/tower';
import { SettingsState } from '../src/types/game';
import { FIXED_NOW, equipItem, makeTestDeps, makeTestItem } from './mp-helpers';

const SETTINGS: SettingsState = {
  autoEquip: true,
  autoDismantle: true,
  autoDismantleMaxRarity: 'green',
  soundEnabled: false,
};

function scenarioPlayer(overrides: Partial<MpPlayerState> = {}): MpPlayerState {
  return { ...createInitialMpPlayerState(FIXED_NOW), lootProgress: 99, ...overrides };
}

function runSingles(
  deps: ReturnType<typeof makeTestDeps>,
  userId: string,
  player: MpPlayerState,
  tower: ReturnType<typeof createInitialMpTowerState>,
  settings: SettingsState,
  count: number
): MpActionResult {
  let current = { player, tower };
  const lootEvents: MpActionResult['lootEvents'] = [];
  let towerExpGain = 0;
  let playerExpGain = 0;
  let towerLevelsGained = 0;
  let playerLevelsGained = 0;
  let isBurst = false;

  for (let i = 0; i < count; i += 1) {
    const step = applyAuthorityAction(deps, {
      userId,
      player: current.player,
      tower: current.tower,
      settings,
    });
    current = { player: step.player, tower: step.tower };
    towerExpGain += step.towerExpGain;
    playerExpGain += step.playerExpGain;
    towerLevelsGained += step.towerLevelsGained;
    playerLevelsGained += step.playerLevelsGained;
    isBurst = isBurst || step.isBurst;
    lootEvents.push(...step.lootEvents);
  }

  return {
    player: current.player,
    tower: current.tower,
    actionsCount: count,
    towerExpGain,
    playerExpGain,
    towerLevelsGained,
    playerLevelsGained,
    isBurst,
    lootEvents,
  };
}

test('gate 11 — batch N = N single actions, deep-equal toàn bộ state + loot events', () => {
  const deps = makeTestDeps('batch-parity');
  const player = scenarioPlayer();
  const tower = createInitialMpTowerState();
  const count = 40;

  const batch = cultivateAuthorityBatch(deps, {
    userId: 'u-1',
    player,
    tower,
    settings: SETTINGS,
    count,
  });
  const singles = runSingles(deps, 'u-1', player, tower, SETTINGS, count);

  assert.ok(batch.lootEvents.length >= 1, 'kịch bản phải sinh loot để phủ đường loot server');
  assert.deepStrictEqual(batch, singles);
});

test('gate 11 — chia batch tùy ý (1/3/5/7) cho cùng kết quả như một batch 16', () => {
  const deps = makeTestDeps('batch-split');
  const player = scenarioPlayer({ lootProgress: 97 });
  const tower = createInitialMpTowerState();

  const whole = cultivateAuthorityBatch(deps, {
    userId: 'u-split',
    player,
    tower,
    settings: SETTINGS,
    count: 16,
  });

  let currentPlayer = player;
  let currentTower = tower;
  const chunkEvents: MpActionResult['lootEvents'] = [];
  for (const n of [1, 3, 5, 7]) {
    const step = cultivateAuthorityBatch(deps, {
      userId: 'u-split',
      player: currentPlayer,
      tower: currentTower,
      settings: SETTINGS,
      count: n,
    });
    currentPlayer = step.player;
    currentTower = step.tower;
    chunkEvents.push(...step.lootEvents);
  }

  assert.ok(whole.lootEvents.length >= 1);
  assert.deepStrictEqual(whole.player, currentPlayer);
  assert.deepStrictEqual(whole.tower, currentTower);
  assert.deepStrictEqual(whole.lootEvents, chunkEvents);
});

test('seed theo (userId, seq): cùng seed ⇒ cùng kết quả; khác seed ⇒ loot khác', () => {
  const run = (label: string) =>
    cultivateAuthorityBatch(makeTestDeps(label), {
      userId: 'u-seed',
      player: scenarioPlayer({ lootProgress: 99, lootThreshold: 3, cultivations: 7 }),
      tower: createInitialMpTowerState(),
      settings: SETTINGS,
      count: 20,
    });

  const first = run('seed-A');
  const second = run('seed-A');
  const other = run('seed-B');

  assert.ok(first.lootEvents.length >= 2);
  assert.deepStrictEqual(first, second);
  assert.notDeepStrictEqual(
    first.lootEvents.map((event) => event.item.name),
    other.lootEvents.map((event) => event.item.name)
  );
});

test('D5 — loot per-user: hai người chơi cùng Đỉnh, ai vượt ngưỡng người đó nhận loot', () => {
  const deps = makeTestDeps('d5-per-user');
  const tower = createInitialMpTowerState();

  const playerA = scenarioPlayer({ lootProgress: 99 });
  const playerB = scenarioPlayer({ lootProgress: 50 });

  const stepA = applyAuthorityAction(deps, {
    userId: 'A',
    player: playerA,
    tower,
    settings: SETTINGS,
  });
  const stepB = applyAuthorityAction(deps, {
    userId: 'B',
    player: playerB,
    tower: stepA.tower,
    settings: SETTINGS,
  });

  assert.equal(stepA.lootEvents.length, 1, 'A vượt ngưỡng → nhận loot');
  assert.equal(stepB.lootEvents.length, 0, 'B không "ăn" loot của A (D5)');
  assert.ok(stepA.player.lootProgress < 100);
  assert.ok(stepB.player.lootProgress >= 50);
  assert.equal(stepB.tower.totalCultivations, 2, 'tổng hành động Đỉnh vẫn là toàn cầu');
  assert.equal('lootProgress' in stepB.tower, false, 'MpTowerState không sở hữu lootProgress (D5)');
});

test('I2 — burst dùng bộ đếm hành động CÁ NHÂN, không phụ thuộc totalCultivations toàn cầu', () => {
  const deps = makeTestDeps('burst-personal');
  // autoEquip=false: burst weapon không bị loot ngẫu nhiên thay thế giữa kịch bản.
  const burstSettings: SettingsState = { ...SETTINGS, autoEquip: false };
  const burstWeapon = makeTestItem({
    id: 'weapon-burst',
    type: 'weapon',
    rarity: 'red',
    level: 1,
    power: 1,
    baseStats: { atk: 20 },
    specialEffect: {
      id: 'tien_dao_burst',
      name: 'Tiên Đạo quán Đỉnh',
      description: 'Mỗi 10 lần Khai Đỉnh nhận thêm burst',
      rarity: 'red',
    },
  });

  const playerA = equipItem(scenarioPlayer(), burstWeapon);
  const playerB = scenarioPlayer();
  let tower = createInitialMpTowerState();

  const runA9 = cultivateAuthorityBatch(deps, {
    userId: 'A',
    player: playerA,
    tower,
    settings: burstSettings,
    count: 9,
  });
  tower = runA9.tower;

  const runB9 = cultivateAuthorityBatch(deps, {
    userId: 'B',
    player: playerB,
    tower,
    settings: burstSettings,
    count: 9,
  });
  tower = runB9.tower;
  assert.equal(tower.totalCultivations, 18);

  const a10 = applyAuthorityAction(deps, {
    userId: 'A',
    player: runA9.player,
    tower,
    settings: burstSettings,
  });

  assert.equal(a10.isBurst, true, 'hành động cá nhân thứ 10 của A phải burst');
  const a11 = applyAuthorityAction(deps, {
    userId: 'A',
    player: a10.player,
    tower: a10.tower,
    settings: burstSettings,
  });
  assert.equal(a11.isBurst, false, 'hành động 11 không burst');
});

test('Rule 14b (MP) — túi đầy + loot Tiên Phẩm: đẩy món yếu nhất không phải Đỏ ra, không mất Tiên Phẩm', () => {
  const deps = makeTestDeps('rule-14b');
  const redSeq = (() => {
    for (let seq = 1; seq <= 200_000; seq += 1) {
      const unit = deps.actionDeps.forAction('u-red', seq);
      if (rollRarityWithRng(unit.rng) === 'red') return seq;
    }
    return -1;
  })();
  assert.ok(redSeq > 0, 'phải tìm được seq cho ra Tiên Phẩm trong giới hạn quét');

  const inventory = Array.from({ length: 100 }, (_, index) =>
    makeTestItem({
      id: `inv-${index}`,
      type: 'helmet',
      rarity: 'white',
      level: 10,
      power: index,
      baseStats: { def: index + 1 },
    })
  );

  const player: MpPlayerState = {
    ...scenarioPlayer({ lootProgress: 99, cultivations: redSeq - 1 }),
    inventory,
  };

  const step = applyAuthorityAction(deps, {
    userId: 'u-red',
    player,
    tower: { ...createInitialMpTowerState(), level: 10, expToNextLevel: calculateTowerExpToNextLevel(10) },
    settings: { ...SETTINGS, autoEquip: false },
  });

  assert.equal(step.lootEvents.length, 1);
  assert.equal(step.lootEvents[0].item.rarity, 'red');
  assert.equal(step.lootEvents[0].autoEquipped, false);
  assert.equal(step.lootEvents[0].dismantled, false);
  assert.equal(step.player.inventory.length, 100, 'Tiên Phẩm vào túi, túi vẫn đầy 100');
  assert.equal(step.player.inventory[0].id, step.lootEvents[0].item.id);
  assert.equal(
    step.player.inventory.some((item) => item.id === 'inv-0'),
    false,
    'món yếu nhất (power 0) bị đẩy ra và phân giải'
  );

  const expectedMaterials = addMaterials(
    player.materials,
    getDismantleReward(inventory[0])
  );
  assert.deepStrictEqual(step.player.materials, expectedMaterials);
});
