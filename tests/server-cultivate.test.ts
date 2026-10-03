import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApp } from '../server/src/app';
import { AuthConfig } from '../server/src/auth';
import { createHmacActionDepsFactory } from '../server/src/rng';
import { MemoryGameStore } from '../server/src/store/memory';
import { createMutableClock } from './mp-helpers';

function makeApp() {
  const { clock, advance } = createMutableClock();
  let counter = 0;
  const store = new MemoryGameStore({ createUserId: () => `usr_cult_${counter++}` });
  const auth: AuthConfig = {
    secret: 'test-cultivate-secret',
    tokenTtlMs: 30 * 24 * 3600 * 1000,
  };
  const actionDeps = createHmacActionDepsFactory({ secret: auth.secret });
  const app = buildApp({ store, auth, clock, authority: { actionDeps, clock } });
  return { app, clock, advance, store };
}

async function registerGuest(app: ReturnType<typeof makeApp>['app'], deviceId: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/guest',
    payload: { deviceId },
  });
  assert.equal(response.statusCode, 200);
  return response.json() as { token: string; userId: string };
}

test('P5.2: 2 người chơi cùng Khai Đỉnh trên 1 Đỉnh toàn cầu (Global Tower không bị lost update)', async () => {
  const { app, advance } = makeApp();

  const userA = await registerGuest(app, 'device-player-A');
  const userB = await registerGuest(app, 'device-player-B');

  const headersA = { authorization: `Bearer ${userA.token}` };
  const headersB = { authorization: `Bearer ${userB.token}` };

  advance(2000); // 2s

  // Player A khai đỉnh seq 1
  const resA1 = await app.inject({
    method: 'POST',
    url: '/actions/cultivate',
    headers: headersA,
    payload: { seq: 1, n: 5, mode: 'auto' },
  });
  assert.equal(resA1.statusCode, 200);
  const dataA1 = resA1.json();
  const towerExpA1 = dataA1.towerDelta.exp;
  assert.ok(towerExpA1 > 0);

  // Player B khai đỉnh seq 1
  const resB1 = await app.inject({
    method: 'POST',
    url: '/actions/cultivate',
    headers: headersB,
    payload: { seq: 1, n: 5, mode: 'auto' },
  });
  assert.equal(resB1.statusCode, 200);
  const dataB1 = resB1.json();
  const towerExpB1 = dataB1.towerDelta.exp;
  assert.ok(towerExpB1 > 0);

  // Kiểm tra /sync của cả 2: Global Tower snapshot phải ghi nhận CẢ HAI lần đóng góp!
  const syncA = await app.inject({ method: 'GET', url: '/sync', headers: headersA });
  const syncB = await app.inject({ method: 'GET', url: '/sync', headers: headersB });

  const snapshotA = syncA.json().towerSnapshot;
  const snapshotB = syncB.json().towerSnapshot;

  assert.equal(snapshotA.currentExp, snapshotB.currentExp);
  assert.equal(snapshotA.totalCultivations, 10); // 5 từ A + 5 từ B

  await app.close();
});

test('P5.2: Idempotency — gửi lại cùng seq trả ack cache, không bị cộng dồn exp', async () => {
  const { app, advance } = makeApp();
  const user = await registerGuest(app, 'device-idempotent');
  const headers = { authorization: `Bearer ${user.token}` };

  advance(1000);

  const first = await app.inject({
    method: 'POST',
    url: '/actions/cultivate',
    headers,
    payload: { seq: 1, n: 2 },
  });
  assert.equal(first.statusCode, 200);
  const firstData = first.json();
  assert.equal(firstData.status, 'applied');

  // Gửi lại cùng seq 1
  const replay = await app.inject({
    method: 'POST',
    url: '/actions/cultivate',
    headers,
    payload: { seq: 1, n: 2 },
  });
  assert.equal(replay.statusCode, 200);
  const replayData = replay.json();
  assert.equal(replayData.status, 'replayed');
  assert.equal(replayData.ackSeq, 1);
  assert.equal(replayData.towerDelta.exp, firstData.towerDelta.exp);

  // Kiểm tra tổng số lần cultivate của Đỉnh: chỉ tính 2, không phải 4
  const sync = await app.inject({ method: 'GET', url: '/sync', headers });
  assert.equal(sync.json().towerSnapshot.totalCultivations, 2);

  await app.close();
});

test('P5.2: Seq conflict — gửi sai thứ tự seq trả 409 seq_conflict', async () => {
  const { app, advance } = makeApp();
  const user = await registerGuest(app, 'device-seq-conflict');
  const headers = { authorization: `Bearer ${user.token}` };

  advance(1000);

  // Gửi seq 1 thành công
  const res1 = await app.inject({
    method: 'POST',
    url: '/actions/cultivate',
    headers,
    payload: { seq: 1, n: 1 },
  });
  assert.equal(res1.statusCode, 200);

  // Bỏ qua seq 2, gửi thẳng seq 3 -> 409
  const res3 = await app.inject({
    method: 'POST',
    url: '/actions/cultivate',
    headers,
    payload: { seq: 3, n: 1 },
  });
  assert.equal(res3.statusCode, 409);
  const conflict = res3.json();
  assert.equal(conflict.code, 'seq_conflict');
  assert.equal(conflict.expectedSeq, 2);
  assert.equal(conflict.lastSeq, 1);

  await app.close();
});

test('P5.2: Budget Engine chống cheat — client đòi 100 actions khi chưa đủ thời gian sẽ bị cắt', async () => {
  const { app, advance } = makeApp();
  const user = await registerGuest(app, 'device-anti-cheat');
  const headers = { authorization: `Bearer ${user.token}` };

  // Chưa trôi qua thời gian nào (0s) -> client spam đòi n=100
  const spam = await app.inject({
    method: 'POST',
    url: '/actions/cultivate',
    headers,
    payload: { seq: 1, n: 100, mode: 'auto' },
  });
  assert.equal(spam.statusCode, 200);

  const sync = await app.inject({ method: 'GET', url: '/sync', headers });
  // Số action được cấp phải bị trần kiểm soát, không bao giờ được phép cấp 100!
  assert.ok(sync.json().towerSnapshot.totalCultivations < 20);

  await app.close();
});

test('P5.2: Loot cá nhân độc lập (D5) — A nhận loot không ảnh hưởng loot của B', async () => {
  const { app, advance } = makeApp();
  const userA = await registerGuest(app, 'device-loot-A');
  const userB = await registerGuest(app, 'device-loot-B');

  const headersA = { authorization: `Bearer ${userA.token}` };
  const headersB = { authorization: `Bearer ${userB.token}` };

  advance(5000); // 5s -> đủ tiến độ loot vượt 100

  // A khai đỉnh nhiều lần để rơi trang bị
  const resA = await app.inject({
    method: 'POST',
    url: '/actions/cultivate',
    headers: headersA,
    payload: { seq: 1, n: 15 },
  });
  assert.equal(resA.statusCode, 200);

  // B vẫn giữ nguyên lootProgress ban đầu (80/100)
  const syncB = await app.inject({ method: 'GET', url: '/sync', headers: headersB });
  assert.equal(syncB.json().player.lootProgress, 80);

  await app.close();
});
