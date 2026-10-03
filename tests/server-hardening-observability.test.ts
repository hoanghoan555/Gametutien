import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../server/src/app';
import { createHmacActionDepsFactory } from '../server/src/rng';
import { MemoryGameStore } from '../server/src/store/memory';
import { AuthorityDeps } from '../src/shared/deps';

const TEST_AUTH = {
  secret: 'test-secret-phase-5-5',
  tokenTtlMs: 24 * 60 * 60 * 1000,
};

function makeApp(initialTime = 1_700_000_000_000) {
  let currentTime = initialTime;
  const clock = { now: () => currentTime };
  let seq = 1;
  const store = new MemoryGameStore({
    createUserId: () => `usr_hard_${seq++}`,
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

  return {
    app,
    store,
    advance: (ms: number) => {
      currentTime += ms;
    },
    now: () => currentTime,
  };
}

async function registerGuest(app: ReturnType<typeof buildApp>, deviceId: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/guest',
    payload: { deviceId },
  });
  return res.json() as { token: string; userId: string };
}

test('P5.5: GET /metrics — trả về telemetry sức khỏe server, uptime và số lượng tu sĩ', async () => {
  const { app, advance } = makeApp();
  const user = await registerGuest(app, 'device-metrics-001');

  advance(12500); // 12.5s uptime

  const res = await app.inject({
    method: 'GET',
    url: '/metrics',
  });

  assert.equal(res.statusCode, 200);
  const data = res.json();
  assert.equal(data.activeUsers, 1);
  assert.equal(data.towerLevel, 1);
  assert.equal(typeof data.uptimeSeconds, 'number');
  assert.equal(typeof data.anomaliesCount, 'number');

  await app.close();
});

test('P5.5: Rate Limiting & Anomaly Detection — phát hiện spam request và ghi nhận dị thường', async () => {
  const { app, store } = makeApp();
  const user = await registerGuest(app, 'device-spam-001');
  const headers = { Authorization: `Bearer ${user.token}` };

  // 1. Gửi 1 request hợp lệ đầu tiên
  const resValid = await app.inject({
    method: 'POST',
    url: '/actions/cultivate',
    headers,
    payload: { seq: 1, n: 1 },
  });
  assert.equal(resValid.statusCode, 200);

  // 2. Gửi dồn dập 25 request cùng 1 miligiây ⇒ vượt giới hạn rate limit (20 req/s)
  let rateLimitedCount = 0;
  for (let i = 2; i <= 26; i++) {
    const res = await app.inject({
      method: 'POST',
      url: '/actions/cultivate',
      headers,
      payload: { seq: i, n: 1 },
    });
    if (res.statusCode === 429) {
      rateLimitedCount++;
    }
  }

  assert.ok(rateLimitedCount > 0, 'Phải có request bị chặn 429 rate_limited');

  // 3. Kiểm tra anomaly detector đã ghi nhận
  const anomalies = store.getAnomalies();
  const rateAnomaly = anomalies.find((a) => a.type === 'rate_exceeded');
  assert.ok(rateAnomaly, 'Phải ghi nhận dị thường rate_exceeded');

  await app.close();
});

test('P5.5: Disaster Recovery & Backup Integrity — sao lưu có mã SHA256 checksum và khôi phục toàn vẹn', async () => {
  const { app, store, now } = makeApp();
  const user = await registerGuest(app, 'device-dr-001');
  const headers = { Authorization: `Bearer ${user.token}` };

  // Người chơi Khai Đỉnh để tăng tiến trình
  await app.inject({
    method: 'POST',
    url: '/actions/cultivate',
    headers,
    payload: { seq: 1, n: 1 },
  });

  // 1. Tạo bản Backup
  const backupRes = await app.inject({
    method: 'POST',
    url: '/admin/backup',
    headers,
  });
  assert.equal(backupRes.statusCode, 200);
  const backup = backupRes.json();
  assert.ok(backup.checksum, 'Bản sao lưu phải có mã SHA256 checksum');
  assert.equal(backup.userCount, 1);

  // 2. Thử khôi phục với checksum bị phá hoại (tampered data) ⇒ bị từ chối
  const badBackup = { ...backup, checksum: 'tampered-fake-checksum-12345' };
  const badRestoreRes = await app.inject({
    method: 'POST',
    url: '/admin/restore',
    headers,
    payload: { backup: badBackup },
  });
  assert.equal(badRestoreRes.statusCode, 400);

  // 3. Khôi phục với bản backup chuẩn xịn ⇒ thành công
  const goodRestoreRes = await app.inject({
    method: 'POST',
    url: '/admin/restore',
    headers,
    payload: { backup },
  });
  assert.equal(goodRestoreRes.statusCode, 200);
  assert.equal(goodRestoreRes.json().ok, true);

  await app.close();
});
