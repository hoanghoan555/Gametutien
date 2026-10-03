import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApp } from '../server/src/app';
import { AuthConfig } from '../server/src/auth';
import { createHmacActionDepsFactory } from '../server/src/rng';
import { MemoryGameStore } from '../server/src/store/memory';
import { WebSocketManager } from '../server/src/ws';
import { createMutableClock } from './mp-helpers';

function makeApp() {
  const { clock, advance } = createMutableClock();
  let counter = 0;
  const store = new MemoryGameStore({ createUserId: () => `usr_p53_${counter++}` });
  const auth: AuthConfig = {
    secret: 'test-realtime-secret',
    tokenTtlMs: 30 * 24 * 3600 * 1000,
  };
  const actionDeps = createHmacActionDepsFactory({ secret: auth.secret });
  const app = buildApp({ store, auth, clock, authority: { actionDeps, clock } });
  return { app, clock, advance, store, auth };
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

test('P5.3: GET /leaderboard — trả đúng danh sách xếp hạng Cống Hiến & Chiến Lực', async () => {
  const { app, advance } = makeApp();

  const userA = await registerGuest(app, 'device-leaderboard-A');
  const userB = await registerGuest(app, 'device-leaderboard-B');

  const headersA = { authorization: `Bearer ${userA.token}` };
  const headersB = { authorization: `Bearer ${userB.token}` };

  advance(3000);

  // User A cống hiến 5 lần
  await app.inject({
    method: 'POST',
    url: '/actions/cultivate',
    headers: headersA,
    payload: { seq: 1, n: 5 },
  });

  // User B cống hiến 12 lần -> B phải xếp trên A trong top cống hiến
  await app.inject({
    method: 'POST',
    url: '/actions/cultivate',
    headers: headersB,
    payload: { seq: 1, n: 12 },
  });

  const res = await app.inject({
    method: 'GET',
    url: '/leaderboard',
    headers: headersA,
  });

  assert.equal(res.statusCode, 200);
  const data = res.json();

  assert.ok(data.totalCultivators >= 2);
  assert.ok(data.topContribution.length >= 2);

  const entryB = data.topContribution.find((x: any) => x.userId === userB.userId);
  const entryA = data.topContribution.find((x: any) => x.userId === userA.userId);

  assert.ok(entryB && entryA);
  assert.ok(entryB.rank < entryA.rank, 'User B cống hiến nhiều hơn nên xếp hạng cao hơn User A');

  // Kiểm tra myRank của User A
  assert.ok(data.myRank);
  assert.equal(data.myRank.contributionRank, entryA.rank);

  await app.close();
});

test('P5.3: onTowerUpdate — nhận thông báo ngay khi có người chơi Khai Đỉnh', async () => {
  const { app, store, advance } = makeApp();
  const user = await registerGuest(app, 'device-listener-001');
  const headers = { authorization: `Bearer ${user.token}` };

  let receivedNotification: any = null;
  const unsubscribe = store.onTowerUpdate((tower, notification) => {
    receivedNotification = { tower, notification };
  });

  advance(1000);
  await app.inject({
    method: 'POST',
    url: '/actions/cultivate',
    headers,
    payload: { seq: 1, n: 3 },
  });

  assert.ok(receivedNotification !== null);
  assert.ok(receivedNotification.notification.exp > 0);
  assert.equal(receivedNotification.notification.contributorId, user.userId);

  unsubscribe();
  await app.close();
});

test('P5.3: WebSocketManager — khởi tạo và quản lý kết nối realtime an toàn', () => {
  const { store, auth, clock } = makeApp();
  const wsManager = new WebSocketManager({ store, auth, clock });

  let broadcastMessage: string | null = null;
  const mockClientWs = {
    readyState: 1, // OPEN
    send: (msg: string) => {
      broadcastMessage = msg;
    },
  };

  (wsManager as any).clients.add({ ws: mockClientWs, isAlive: true });

  wsManager.broadcast({ type: 'test_event', payload: 'thần thông' });
  assert.ok(broadcastMessage !== null);
  assert.ok((broadcastMessage as string).includes('thần thông'));

  wsManager.close();
});
