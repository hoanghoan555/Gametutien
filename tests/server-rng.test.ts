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
import { calculateTowerExpToNextLevel } from '../src/systems/tower';
import { SettingsState } from '../src/types/game';
import { createHmacActionDepsFactory } from '../server/src/rng';
import { FIXED_NOW, fixedClock } from './mp-helpers';

const SECRET = 'test-secret-p5.1';
const SETTINGS: SettingsState = {
  autoEquip: true,
  autoDismantle: true,
  autoDismantleMaxRarity: 'green',
  soundEnabled: false,
};

function hmacDeps(secret = SECRET, rngVersion?: string) {
  return {
    actionDeps: createHmacActionDepsFactory(rngVersion ? { secret, rngVersion } : { secret }),
    clock: fixedClock(),
  };
}

test('HMAC seed tất định: cùng (userId, seq) ⇒ cùng stream; mọi draw trong [0,1)', () => {
  const first = hmacDeps().actionDeps.forAction('u1', 42);
  const second = hmacDeps().actionDeps.forAction('u1', 42);
  const drawsFirst = Array.from({ length: 64 }, () => first.rng.next());
  const drawsSecond = Array.from({ length: 64 }, () => second.rng.next());

  assert.deepStrictEqual(drawsFirst, drawsSecond);
  assert.ok(drawsFirst.every((value) => value >= 0 && value < 1));
});

test('Khác seq / khác user / khác secret / khác rngVersion ⇒ stream khác', () => {
  const base = hmacDeps().actionDeps.forAction('u1', 42).rng.next();
  const cases: Array<[string, number]> = [
    ['seq', hmacDeps().actionDeps.forAction('u1', 43).rng.next()],
    ['user', hmacDeps().actionDeps.forAction('u2', 42).rng.next()],
    ['secret', hmacDeps('another-secret').actionDeps.forAction('u1', 42).rng.next()],
    ['rngVersion', hmacDeps(SECRET, 'rng-v2').actionDeps.forAction('u1', 42).rng.next()],
  ];
  for (const [label, value] of cases) {
    assert.notEqual(value, base, `khác ${label} phải cho stream khác`);
  }
});

test('gate 11 — batch = singles với RNG HMAC THẬT của server (production config)', () => {
  const deps = hmacDeps();
  const player: MpPlayerState = {
    ...createInitialMpPlayerState(FIXED_NOW),
    lootProgress: 1,
    lootThreshold: 2,
    cultivations: 100,
  };
  const tower = {
    ...createInitialMpTowerState(),
    level: 12,
    expToNextLevel: calculateTowerExpToNextLevel(12),
    totalCultivations: 1000,
  };
  const count = 25;

  const batch = cultivateAuthorityBatch(deps, {
    userId: 'u-hmac',
    player,
    tower,
    settings: SETTINGS,
    count,
  });

  let currentPlayer = player;
  let currentTower = tower;
  const singleEvents: MpActionResult['lootEvents'] = [];
  for (let i = 0; i < count; i += 1) {
    const step = applyAuthorityAction(deps, {
      userId: 'u-hmac',
      player: currentPlayer,
      tower: currentTower,
      settings: SETTINGS,
    });
    currentPlayer = step.player;
    currentTower = step.tower;
    singleEvents.push(...step.lootEvents);
  }

  assert.ok(batch.lootEvents.length >= 10, 'kịch bản phải sinh đủ loot để so từng item');
  assert.deepStrictEqual(batch.player, currentPlayer);
  assert.deepStrictEqual(batch.tower, currentTower);
  assert.deepStrictEqual(batch.lootEvents, singleEvents);
});

test('id tất định theo (userId, seq): replay ra đúng id cũ; khác khoá ⇒ khác id', () => {
  assert.equal(hmacDeps().actionDeps.forAction('u1', 7).ids.nextId('item'), 'item_u1_7_0');
  assert.equal(hmacDeps().actionDeps.forAction('u1', 7).ids.nextId('item'), 'item_u1_7_0');
  assert.equal(hmacDeps().actionDeps.forAction('u1', 8).ids.nextId('item'), 'item_u1_8_0');

  const generator = hmacDeps().actionDeps.forAction('u1', 7).ids;
  assert.equal(generator.nextId('item'), 'item_u1_7_0');
  assert.equal(generator.nextId('item'), 'item_u1_7_1');
});

test('gate 2 — đường HMAC không chạm Math.random/Date.now (poison test)', () => {
  const deps = hmacDeps();
  const player: MpPlayerState = {
    ...createInitialMpPlayerState(FIXED_NOW),
    lootProgress: 99,
    cultivations: 5,
  };
  const tower = createInitialMpTowerState();

  const originalRandom = Math.random;
  const originalNow = Date.now;
  let result: MpActionResult | null = null;

  Math.random = () => {
    throw new Error('authoritative path must not use Math.random');
  };
  Date.now = () => {
    throw new Error('authoritative path must not use Date.now');
  };
  try {
    result = cultivateAuthorityBatch(deps, {
      userId: 'u-poison',
      player,
      tower,
      settings: SETTINGS,
      count: 10,
    });
  } finally {
    Math.random = originalRandom;
    Date.now = originalNow;
  }

  assert.ok(result !== null);
  assert.ok(result.lootEvents.length >= 1, 'vẫn sinh loot bình thường với RNG HMAC');
});
