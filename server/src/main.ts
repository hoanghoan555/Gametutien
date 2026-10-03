import { randomBytes } from 'node:crypto';
import process from 'node:process';
import { buildApp } from './app';
import { createHmacActionDepsFactory } from './rng';
import { MemoryGameStore } from './store/memory';
import { WebSocketManager } from './ws';

/** P5.3 — bootstrap dev: `npm run server:dev` (store in-memory; PG adapter khi provision DB). */

const port = Number.parseInt(process.env.PORT ?? '8787', 10);

const secret =
  process.env.SERVER_SECRET ??
  (() => {
    console.warn('[server] SERVER_SECRET chưa đặt — dùng secret tạm cho phiên dev này.');
    return randomBytes(32).toString('hex');
  })();

const store = new MemoryGameStore({
  createUserId: () => `usr_${randomBytes(16).toString('hex')}`,
});

const clock = { now: () => Date.now() };
const auth = { secret, tokenTtlMs: 30 * 24 * 3600 * 1000 };
const actionDeps = createHmacActionDepsFactory({ secret });

const app = buildApp({
  store,
  auth,
  clock,
  authority: { actionDeps, clock },
});

const wsManager = new WebSocketManager({ store, auth, clock });
wsManager.attach(app.server);

await app.listen({ port, host: '127.0.0.1' });
console.log(`[server] Vạn Đạo Tiên Đỉnh P5.3 Realtime — http://127.0.0.1:${port}`);
console.log('[server] routes: GET /healthz · POST /auth/guest · GET /sync · GET /leaderboard · POST /actions/cultivate · WS /rt');
