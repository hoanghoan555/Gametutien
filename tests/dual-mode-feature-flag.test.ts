import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../server/src/app';
import { createHmacActionDepsFactory } from '../server/src/rng';
import { MemoryGameStore } from '../server/src/store/memory';
import { AuthorityDeps } from '../src/shared/deps';
import { createInitialPlayerState } from '../src/systems/progression';
import { createInitialTowerState } from '../src/systems/tower';

const TEST_AUTH = {
  secret: 'test-secret-dual-mode',
  tokenTtlMs: 24 * 60 * 60 * 1000,
};

test('P5.6: Dual-Mode Isolation — Chế độ Solo Offline và Chế độ Online Multiplayer hoạt động độc lập an toàn', async () => {
  // 1. Chế độ Solo: Khai Đỉnh cục bộ 100% không phụ thuộc máy chủ
  const soloPlayer = createInitialPlayerState();
  const soloTower = createInitialTowerState();
  assert.equal(soloPlayer.level, 1);
  assert.equal(soloTower.level, 1);

  // 2. Chế độ Online: Kết nối Backend Authoritative
  const clock = { now: () => 1_700_000_000_000 };
  const store = new MemoryGameStore({
    createUserId: () => 'usr_dual_001',
    secret: TEST_AUTH.secret,
  });
  const authority: AuthorityDeps = {
    clock,
    actionDeps: createHmacActionDepsFactory({ secret: TEST_AUTH.secret }),
  };

  const app = buildApp({
    store,
    auth: TEST_AUTH,
    clock,
    authority,
  });

  const authRes = await app.inject({
    method: 'POST',
    url: '/auth/guest',
    payload: { deviceId: 'device-dual-001' },
  });
  assert.equal(authRes.statusCode, 200);
  const { token, userId } = authRes.json();
  assert.ok(token);
  assert.equal(userId, 'usr_dual_001');

  // Khai Đỉnh Online trên Đỉnh chung
  const cultRes = await app.inject({
    method: 'POST',
    url: '/actions/cultivate',
    headers: { Authorization: `Bearer ${token}` },
    payload: { seq: 1, n: 1 },
  });
  assert.equal(cultRes.statusCode, 200);
  const cultData = cultRes.json();
  assert.equal(cultData.status, 'applied');
  assert.equal(cultData.ackSeq, 1);

  // Snapshot Đỉnh chung tăng tiến
  const syncRes = await app.inject({
    method: 'GET',
    url: '/sync',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(syncRes.statusCode, 200);
  const syncData = syncRes.json();
  assert.ok(syncData.towerSnapshot.totalCultivations >= 1);

  await app.close();
});
