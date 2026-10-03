import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../server/src/app';
import { AuthConfig } from '../server/src/auth';
import { createHmacActionDepsFactory } from '../server/src/rng';
import { MemoryGameStore } from '../server/src/store/memory';
import { createMutableClock } from './mp-helpers';

function makeApp(options: { tokenTtlMs?: number } = {}) {
  const { clock, advance } = createMutableClock();
  let counter = 0;
  const store = new MemoryGameStore({ createUserId: () => `usr_api_${counter++}` });
  const auth: AuthConfig = {
    secret: 'api-test-secret',
    tokenTtlMs: options.tokenTtlMs ?? 30 * 24 * 3600 * 1000,
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

test('GET /healthz — server sống, trả serverTime', async () => {
  const { app } = makeApp();
  const response = await app.inject({ method: 'GET', url: '/healthz' });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().ok, true);
  await app.close();
});

test('gate 6 — POST /auth/guest: tạo guest theo thiết bị, idempotent; body sai bị 400', async () => {
  const { app } = makeApp();

  const invalid = await app.inject({
    method: 'POST',
    url: '/auth/guest',
    payload: { deviceId: 'short' },
  });
  assert.equal(invalid.statusCode, 400);

  const first = await registerGuest(app, 'device-abc-123');
  assert.ok(first.token.length > 20);
  assert.ok(first.userId.startsWith('usr_api_'));

  const again = await registerGuest(app, 'device-abc-123');
  assert.equal(again.userId, first.userId, 'cùng thiết bị ⇒ cùng user (D8)');

  const other = await registerGuest(app, 'device-xyz-987');
  assert.notEqual(other.userId, first.userId);
  await app.close();
});

test('gate 7 — GET /sync: 401 khi thiếu/sai token; 200 snapshot đúng shape, read-only', async () => {
  const { app, advance } = makeApp();

  assert.equal((await app.inject({ method: 'GET', url: '/sync' })).statusCode, 401);
  assert.equal(
    (
      await app.inject({
        method: 'GET',
        url: '/sync',
        headers: { authorization: 'Bearer token-sai' },
      })
    ).statusCode,
    401
  );

  const guest = await registerGuest(app, 'device-sync-001');
  const headers = { authorization: `Bearer ${guest.token}` };

  const first = await app.inject({ method: 'GET', url: '/sync', headers });
  assert.equal(first.statusCode, 200);
  const body = first.json();
  assert.equal(body.lastSeq, 0);
  assert.equal(body.player.lootProgress, 80);
  assert.equal(body.player.lootThreshold, 100);
  assert.equal(body.towerSnapshot.level, 1);
  assert.equal('lootProgress' in body.towerSnapshot, false);
  assert.equal(body.settings.autoEquip, true);

  advance(5000);
  const second = await app.inject({ method: 'GET', url: '/sync', headers });
  const secondBody = second.json();
  assert.equal(secondBody.serverTime, body.serverTime + 5000);
  assert.deepStrictEqual(
    { ...secondBody, serverTime: 0 },
    { ...body, serverTime: 0 },
    'sync không được đổi state (read-only)'
  );
  await app.close();
});

test('token hết hạn ⇒ 401', async () => {
  const { app, advance } = makeApp({ tokenTtlMs: 1000 });
  const guest = await registerGuest(app, 'device-expire-001');

  advance(2000);
  const response = await app.inject({
    method: 'GET',
    url: '/sync',
    headers: { authorization: `Bearer ${guest.token}` },
  });
  assert.equal(response.statusCode, 401);
  await app.close();
});

test('P5.2 — POST /actions/cultivate: xử lý Khai Đỉnh authoritative, trả delta và ackSeq', async () => {
  const { app, advance } = makeApp();

  // 1. Chưa đăng nhập -> 401
  const unauth = await app.inject({
    method: 'POST',
    url: '/actions/cultivate',
    payload: { seq: 1, n: 1 },
  });
  assert.equal(unauth.statusCode, 401);

  // 2. Đăng ký guest và Khai Đỉnh
  const guest = await registerGuest(app, 'device-cultivate-001');
  const headers = { authorization: `Bearer ${guest.token}` };

  advance(1000);
  const response = await app.inject({
    method: 'POST',
    url: '/actions/cultivate',
    headers,
    payload: { seq: 1, n: 1, mode: 'manual' },
  });

  assert.equal(response.statusCode, 200);
  const data = response.json();
  assert.equal(data.ackSeq, 1);
  assert.ok(data.towerDelta.exp > 0);
  assert.ok(data.playerDelta.exp > 0);
  assert.ok(Array.isArray(data.lootEvents));

  await app.close();
});
