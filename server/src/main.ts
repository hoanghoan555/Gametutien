import { randomBytes } from 'node:crypto';
import process from 'node:process';
import { buildApp } from './app';
import { MemoryGameStore } from './store/memory';

/** P5.1 — bootstrap dev: `npm run server:dev` (store in-memory; PG adapter thuộc P5.2). */

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

const app = buildApp({
  store,
  auth: { secret, tokenTtlMs: 30 * 24 * 3600 * 1000 },
  clock: { now: () => Date.now() },
});

await app.listen({ port, host: '127.0.0.1' });
console.log(`[server] Vạn Đạo Tiên Đỉnh P5.1 skeleton — http://127.0.0.1:${port}`);
console.log('[server] routes: GET /healthz · POST /auth/guest · GET /sync · POST /actions/cultivate (501)');
