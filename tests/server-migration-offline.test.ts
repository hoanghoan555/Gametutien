import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../server/src/app';
import { issueGuestToken } from '../server/src/auth';
import { createHmacActionDepsFactory } from '../server/src/rng';
import { MemoryGameStore } from '../server/src/store/memory';
import { AuthorityDeps } from '../src/shared/deps';

const TEST_AUTH = {
  secret: 'test-secret-phase-5-4',
  tokenTtlMs: 30 * 24 * 60 * 60 * 1000,
};

function makeApp(initialTime = 1_700_000_000_000) {
  let currentTime = initialTime;
  const clock = { now: () => currentTime };
  let seq = 1;
  const store = new MemoryGameStore({
    createUserId: () => `usr_mig_${seq++}`,
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

test('P5.4: POST /migration/import — import save v1 hợp lệ thành công và cập nhật snapshot', async () => {
  const { app, now } = makeApp();
  const user = await registerGuest(app, 'device-mig-001');
  const headers = { Authorization: `Bearer ${user.token}` };

  const validSaveV1 = {
    version: 1,
    lastSavedAt: now() - 10000,
    player: {
      level: 15,
      cultivationExp: 1200,
      cultivationExpToNext: 5000,
      contribution: 3500,
      materials: {
        basicMaterial: 500,
        linhStone: 250,
        advancedMaterial: 80,
        rareMaterial: 20,
      },
      enhancements: {
        weapon: 10,
        helmet: 8,
        armor: 8,
        boots: 8,
        ring: 5,
        artifact: 5,
      },
      autoCultivation: true,
    },
    tower: {
      level: 12,
      currentExp: 4500,
      expToNextLevel: 10000,
      totalCultivations: 250,
    },
    settings: {
      autoEquip: true,
      autoDismantle: true,
      autoDismantleMaxRarity: 'blue',
      soundEnabled: true,
    },
  };

  const res = await app.inject({
    method: 'POST',
    url: '/migration/import',
    headers,
    payload: { rawSave: validSaveV1 },
  });

  assert.equal(res.statusCode, 200);
  const data = res.json();
  assert.equal(data.success, true);
  assert.ok(data.importedAt);
  assert.equal(data.snapshot.player.level, 15);
  assert.equal(data.snapshot.player.materials.basicMaterial, 500);
  assert.equal(data.snapshot.player.materials.linhStone, 250);
  assert.equal(data.snapshot.player.enhancements.weapon, 10);
  assert.equal(data.snapshot.settings.autoDismantleMaxRarity, 'blue');

  await app.close();
});

test('P5.4: POST /migration/import — chặn import trùng lặp và chặn save hỏng', async () => {
  const { app, now } = makeApp();
  const user = await registerGuest(app, 'device-mig-002');
  const headers = { Authorization: `Bearer ${user.token}` };

  // 1. Chặn save hỏng hoàn toàn
  const invalidSave = { version: 999, broken: true };
  const resBad = await app.inject({
    method: 'POST',
    url: '/migration/import',
    headers,
    payload: { rawSave: invalidSave },
  });
  assert.equal(resBad.statusCode, 400);

  // 2. Import save hợp lệ lần 1
  const validSave = {
    version: 1,
    player: { level: 5, autoCultivation: true },
    tower: { level: 5, totalCultivations: 10 },
  };
  const res1 = await app.inject({
    method: 'POST',
    url: '/migration/import',
    headers,
    payload: { rawSave: validSave },
  });
  assert.equal(res1.statusCode, 200);

  // 3. Import lại lần 2 ⇒ bị từ chối
  const res2 = await app.inject({
    method: 'POST',
    url: '/migration/import',
    headers,
    payload: { rawSave: validSave },
  });
  assert.equal(res2.statusCode, 400);

  await app.close();
});

test('P5.4: POST /offline/claim — tính thưởng bế quan ngoại tuyến chuẩn xác theo đồng hồ Server (trần 8h)', async () => {
  const { app, advance } = makeApp();
  const user = await registerGuest(app, 'device-offline-001');
  const headers = { Authorization: `Bearer ${user.token}` };

  // Khởi tạo trạng thái ban đầu: bật autoCultivation
  await app.inject({
    method: 'POST',
    url: '/actions/cultivate',
    headers,
    payload: { seq: 1, n: 1, mode: 'auto' },
  });

  // 1. Claim ngay khi chưa trôi qua thời gian ⇒ không sinh reward rác
  const resImmediate = await app.inject({
    method: 'POST',
    url: '/offline/claim',
    headers,
  });
  assert.equal(resImmediate.statusCode, 200);
  const dataImmediate = resImmediate.json();
  assert.equal(dataImmediate.applied, false);
  assert.equal(dataImmediate.actionsPerformed, 0);

  // 2. Tua thời gian server 1 giờ (3600 giây)
  advance(3600 * 1000);

  const res1h = await app.inject({
    method: 'POST',
    url: '/offline/claim',
    headers,
  });
  assert.equal(res1h.statusCode, 200);
  const data1h = res1h.json();
  assert.equal(data1h.applied, true);
  assert.equal(data1h.offlineSeconds, 3600);
  assert.ok(data1h.actionsPerformed > 0, 'Phải thực hiện các hành động tu luyện');
  assert.ok(data1h.playerExpGained > 0, 'Phải nhận được EXP Tu Vi');
  assert.ok(data1h.towerExpGained > 0, 'Phải đóng góp EXP cho Tiên Đỉnh');

  // 3. Tua thời gian server 24 giờ ⇒ bị chặn ở trần 8 giờ (28,800s)
  advance(24 * 3600 * 1000);

  const res24h = await app.inject({
    method: 'POST',
    url: '/offline/claim',
    headers,
  });
  assert.equal(res24h.statusCode, 200);
  const data24h = res24h.json();
  assert.equal(data24h.applied, true);
  assert.equal(data24h.offlineSeconds, 28800, 'Thời gian bế quan tối đa bị giới hạn ở 8 giờ');

  await app.close();
});
