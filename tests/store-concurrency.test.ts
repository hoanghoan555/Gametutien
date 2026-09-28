import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cultivateAuthorityBatch } from '../src/shared/authority';
import { createHmacActionDepsFactory } from '../server/src/rng';
import { MemoryGameStore } from '../server/src/store/memory';
import { ActionComputeContext, GameStore } from '../server/src/store/types';
import { FIXED_NOW, fixedClock } from './mp-helpers';

const SECRET = 'store-concurrency-secret';

function makeDeps(secret = SECRET) {
  return { actionDeps: createHmacActionDepsFactory({ secret }), clock: fixedClock() };
}

function makeStore() {
  let counter = 0;
  return new MemoryGameStore({ createUserId: () => `usr_conc_${counter++}` });
}

function makeCompute(userId: string, onCall?: () => void) {
  const deps = makeDeps();
  return (context: ActionComputeContext) => {
    onCall?.();
    return cultivateAuthorityBatch(deps, {
      userId,
      player: context.player,
      tower: context.tower,
      settings: context.settings,
      count: context.count,
    });
  };
}

test('gate 5 — cùng user + cùng seq: xử lý đúng 1 lần, gửi lại trả ack cache', async () => {
  const store = makeStore();
  const account = await store.authOrCreateGuest('device-replay', FIXED_NOW);
  let computeCalls = 0;
  const compute = makeCompute(account.userId, () => {
    computeCalls += 1;
  });

  const first = await store.submitActions({
    userId: account.userId,
    seq: 1,
    n: 3,
    now: FIXED_NOW,
    compute,
  });
  assert.equal(first.status, 'applied');

  const replay = await store.submitActions({
    userId: account.userId,
    seq: 1,
    n: 3,
    now: FIXED_NOW + 1000,
    compute,
  });
  assert.equal(replay.status, 'replayed');
  assert.equal(computeCalls, 1, 'replay không được compute lại');
  assert.deepStrictEqual(
    { ...replay, status: 'applied', serverTime: first.serverTime },
    first,
    'ack replay phải khớp ack gốc'
  );

  const snapshot = await store.readSnapshot(account.userId, FIXED_NOW);
  assert.equal(snapshot.towerSnapshot.totalCultivations, 3, 'state chỉ tiến 1 lần');
  assert.equal(snapshot.player.cultivations, 3);
  assert.equal(snapshot.lastSeq, 1);
});

test('gate 5 — cùng user + cùng seq gửi SONG SONG: chỉ 1 lần applied', async () => {
  const store = makeStore();
  const account = await store.authOrCreateGuest('device-same-seq', FIXED_NOW);
  let computeCalls = 0;
  const compute = makeCompute(account.userId, () => {
    computeCalls += 1;
  });

  const requests = [0, 1, 2, 3, 4].map(() =>
    store.submitActions({ userId: account.userId, seq: 1, n: 2, now: FIXED_NOW, compute })
  );
  const results = await Promise.all(requests);

  assert.equal(computeCalls, 1);
  assert.equal(results.filter((result) => result.status === 'applied').length, 1);
  assert.equal(results.filter((result) => result.status === 'replayed').length, 4);
  for (const result of results) {
    if (result.status === 'seq_conflict') assert.fail('cùng seq không được trả seq_conflict');
    assert.equal(result.ackSeq, 1);
  }

  const snapshot = await store.readSnapshot(account.userId, FIXED_NOW);
  assert.equal(snapshot.towerSnapshot.totalCultivations, 2);
});

test('gate 4/5 — 40 user SONG SONG trên cùng Đỉnh = chạy tuần tự, không lost update', async () => {
  const deviceIds = Array.from({ length: 40 }, (_, index) => `device-bulk-${index}`);

  async function runScenario(concurrent: boolean) {
    const store: GameStore = makeStore();
    const accounts = [];
    for (const deviceId of deviceIds) {
      accounts.push(await store.authOrCreateGuest(deviceId, FIXED_NOW));
    }

    const submit = (userId: string) =>
      store.submitActions({
        userId,
        seq: 1,
        n: 3,
        now: FIXED_NOW,
        compute: makeCompute(userId),
      });

    const results = [];
    if (concurrent) {
      results.push(...(await Promise.all(accounts.map((account) => submit(account.userId)))));
    } else {
      for (const account of accounts) {
        results.push(await submit(account.userId));
      }
    }

    const snapshots = [];
    for (const account of accounts) {
      snapshots.push({
        userId: account.userId,
        snapshot: await store.readSnapshot(account.userId, FIXED_NOW),
      });
    }
    return { results, snapshots };
  }

  const concurrentRun = await runScenario(true);
  const sequentialRun = await runScenario(false);

  assert.ok(concurrentRun.results.every((result) => result.status === 'applied'));
  assert.deepStrictEqual(
    concurrentRun.snapshots,
    sequentialRun.snapshots,
    'kết quả song song phải y hệt tuần tự (không lost update)'
  );

  const tower = concurrentRun.snapshots[0].snapshot.towerSnapshot;
  assert.equal(tower.totalCultivations, 40 * 3, 'mọi hành động đều được ghi nhận');

  const totalContribution = concurrentRun.snapshots.reduce(
    (sum, entry) => sum + entry.snapshot.player.contribution,
    0
  );
  assert.ok(totalContribution > 0);
});

test('gate 5 — seq lệch: trả seq_conflict kèm lastSeq/expectedSeq, state không đổi', async () => {
  const store = makeStore();
  const account = await store.authOrCreateGuest('device-conflict', FIXED_NOW);

  const conflict = await store.submitActions({
    userId: account.userId,
    seq: 5,
    n: 1,
    now: FIXED_NOW,
    compute: makeCompute(account.userId),
  });
  assert.deepStrictEqual(conflict, { status: 'seq_conflict', expectedSeq: 1, lastSeq: 0 });

  const snapshot = await store.readSnapshot(account.userId, FIXED_NOW);
  assert.equal(snapshot.towerSnapshot.totalCultivations, 0);
  assert.equal(snapshot.lastSeq, 0);
});

test('gate 7 — readSnapshot read-only: sửa bản trả về không ảnh hưởng state nội bộ', async () => {
  const store = makeStore();
  const account = await store.authOrCreateGuest('device-readonly', FIXED_NOW);

  const before = await store.readSnapshot(account.userId, FIXED_NOW);
  assert.equal(before.player.lootProgress, 80);
  assert.equal(before.towerSnapshot.level, 1);

  before.player.lootProgress = -999;
  before.player.inventory.push({ id: 'hacked' } as never);
  before.towerSnapshot.level = 12345;

  const after = await store.readSnapshot(account.userId, FIXED_NOW);
  assert.equal(after.player.lootProgress, 80, 'state nội bộ không bị sửa từ ngoài');
  assert.equal(after.player.inventory.length, 0);
  assert.equal(after.towerSnapshot.level, 1);
  assert.equal('lootProgress' in after.towerSnapshot, false, 'D5: Tower không sở hữu lootProgress');
});

test('validate đầu vào: n/seq không hợp lệ bị chặn; user lạ bị chặn', async () => {
  const store = makeStore();
  const account = await store.authOrCreateGuest('device-validate', FIXED_NOW);

  await assert.rejects(
    store.submitActions({ userId: account.userId, seq: 0, n: 1, now: FIXED_NOW, compute: makeCompute(account.userId) })
  );
  await assert.rejects(
    store.submitActions({ userId: account.userId, seq: 1, n: 0, now: FIXED_NOW, compute: makeCompute(account.userId) })
  );
  await assert.rejects(
    store.submitActions({ userId: 'usr_khong_ton_tai', seq: 1, n: 1, now: FIXED_NOW, compute: makeCompute('usr_khong_ton_tai') })
  );
});
