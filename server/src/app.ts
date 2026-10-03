import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import { cultivateAuthorityBatch } from '../../src/shared/authority';
import { AuthorityDeps, Clock } from '../../src/shared/deps';
import { AuthConfig, issueGuestToken, verifyGuestToken } from './auth';
import { RateLimiter } from './rateLimit';
import { GameStore, ServerBackup } from './store/types';

/**
 * P5.2 / P5.5 — Gameplay online authoritative + Hardening & Observability:
 *  - /healthz & /metrics: server liveness & telemetry metrics
 *  - /auth/guest: device-based guest authentication (rate-limited)
 *  - /sync: read-only player/tower snapshot
 *  - /actions/cultivate: authoritative cultivation with budget engine, rate-limiting & anomaly detection
 *  - /admin/backup & /admin/restore: Global Tower integrity & disaster recovery
 */

export interface AppDeps {
  store: GameStore;
  auth: AuthConfig;
  clock: Clock;
  authority: AuthorityDeps;
}

export function buildApp(deps: AppDeps): FastifyInstance {
  const app = Fastify({ logger: false });
  const rateLimiter = new RateLimiter();

  app.get('/healthz', async () => ({
    ok: true,
    serverTime: deps.clock.now(),
  }));

  app.get('/metrics', async () => {
    return deps.store.getMetrics(deps.clock.now());
  });

  app.post<{ Body: { deviceId: string } }>(
    '/auth/guest',
    {
      schema: {
        body: {
          type: 'object',
          required: ['deviceId'],
          additionalProperties: false,
          properties: {
            deviceId: { type: 'string', minLength: 8, maxLength: 128 },
          },
        },
      },
    },
    async (request, reply) => {
      const now = deps.clock.now();
      const rl = rateLimiter.check(`auth:${request.body.deviceId}`, 20, 60_000, now);
      if (!rl.allowed) {
        return reply.code(429).send({
          code: 'rate_limited',
          message: 'Tạo tài khoản quá nhanh, hãy chờ giây lát',
          retryAfterMs: rl.retryAfterMs,
        });
      }

      const account = await deps.store.authOrCreateGuest(request.body.deviceId, now);
      return {
        token: issueGuestToken(deps.auth, account.userId, now),
        userId: account.userId,
      };
    }
  );

  app.get('/sync', async (request, reply) => {
    const userId = authenticate(request, deps);
    if (!userId) {
      return reply.code(401).send({ code: 'unauthorized', message: 'Token thiếu hoặc không hợp lệ' });
    }
    const account = await deps.store.getUserById(userId);
    if (!account) {
      return reply.code(401).send({ code: 'unauthorized', message: 'Tài khoản không tồn tại' });
    }
    return deps.store.readSnapshot(userId, deps.clock.now());
  });

  app.get('/leaderboard', async (request) => {
    const userId = authenticate(request, deps) ?? undefined;
    return deps.store.getLeaderboard(userId);
  });

  app.post<{ Body: { seq: number; n?: number; mode?: 'auto' | 'manual' } }>(
    '/actions/cultivate',
    {
      schema: {
        body: {
          type: 'object',
          required: ['seq'],
          additionalProperties: false,
          properties: {
            seq: { type: 'integer', minimum: 1 },
            n: { type: 'integer', minimum: 1, maximum: 100 },
            mode: { type: 'string', enum: ['auto', 'manual'] },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = authenticate(request, deps);
      if (!userId) {
        return reply.code(401).send({ code: 'unauthorized', message: 'Token thiếu hoặc không hợp lệ' });
      }

      const now = deps.clock.now();

      // P5.5 — Rate limiting chống spam Khai Đỉnh (tối đa 20 req/s trên 1 user)
      const rl = rateLimiter.check(`cultivate:${userId}`, 20, 1000, now);
      if (!rl.allowed) {
        deps.store.recordAnomaly({
          userId,
          type: 'rate_exceeded',
          details: `Vượt giới hạn tần suất gửi Khai Đỉnh (${rl.retryAfterMs}ms)`,
          timestamp: now,
        });
        return reply.code(429).send({
          code: 'rate_limited',
          message: 'Thao tác quá nhanh, hãy chờ giây lát',
          retryAfterMs: rl.retryAfterMs,
        });
      }

      const snapshot = await deps.store.readSnapshot(userId, now);
      if (!snapshot) {
        return reply.code(401).send({ code: 'unauthorized', message: 'Tài khoản không tồn tại' });
      }

      // P5.5 — Anomaly detection: phát hiện nhảy cóc seq quá xa
      if (snapshot.lastSeq > 0 && request.body.seq > snapshot.lastSeq + 50) {
        deps.store.recordAnomaly({
          userId,
          type: 'seq_jump',
          details: `Sequence nhảy vọt bất thường: expected <= ${snapshot.lastSeq + 1}, got ${request.body.seq}`,
          timestamp: now,
        });
      }

      const player = snapshot.player;
      const rate = Math.max(1, player.stats.cultivationRate || 5);
      const elapsedSeconds = Math.max(0, (now - player.lastGrantAt) / 1000);
      const totalEarned = (player.fractionalActions || 0) + elapsedSeconds * rate;

      // Burst cap: cho phép burst tối đa 3 giây hành động; tối thiểu 1 cho manual click
      const burstCap = Math.max(1, Math.ceil(rate * 3));
      const earnedCount = Math.floor(totalEarned);
      const maxAllowed = Math.max(1, Math.min(earnedCount, burstCap));

      const requestedN = request.body.n ?? 1;
      const count = Math.max(1, Math.min(requestedN, maxAllowed));

      try {
        const res = await deps.store.submitActions({
          userId,
          seq: request.body.seq,
          n: count,
          now,
          compute: (context) => {
            const batchRes = cultivateAuthorityBatch(deps.authority, {
              userId,
              player: context.player,
              tower: context.tower,
              settings: context.settings,
              count: context.count,
            });

            // Cập nhật budget trên player authoritative
            const remainingFraction = Math.max(0, totalEarned - context.count);
            batchRes.player.lastGrantAt = now;
            batchRes.player.fractionalActions = Math.min(1.0, Math.round(remainingFraction * 1000) / 1000);

            return batchRes;
          },
        });

        if (res.status === 'seq_conflict') {
          return reply.code(409).send({
            code: 'seq_conflict',
            message: 'Lệch seq, hãy gọi /sync để cập nhật lại',
            expectedSeq: res.expectedSeq,
            lastSeq: res.lastSeq,
          });
        }

        return reply.code(200).send(res);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Lỗi xử lý hành động';
        return reply.code(400).send({ code: 'bad_request', message });
      }
    }
  );

  app.post<{ Body: { rawSave: unknown } }>(
    '/migration/import',
    {
      schema: {
        body: {
          type: 'object',
          required: ['rawSave'],
          properties: {
            rawSave: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = authenticate(request, deps);
      if (!userId) {
        return reply.code(401).send({ code: 'unauthorized', message: 'Token thiếu hoặc không hợp lệ' });
      }
      const now = deps.clock.now();
      const res = await deps.store.importSaveData(userId, request.body.rawSave, now);
      if (!res.success) {
        return reply.code(400).send({ code: 'migration_failed', message: res.error || 'Import thất bại' });
      }
      return reply.code(200).send(res);
    }
  );

  app.post('/offline/claim', async (request, reply) => {
    const userId = authenticate(request, deps);
    if (!userId) {
      return reply.code(401).send({ code: 'unauthorized', message: 'Token thiếu hoặc không hợp lệ' });
    }
    const now = deps.clock.now();
    const res = await deps.store.claimOfflineReward(userId, now);
    return reply.code(200).send(res);
  });

  // P5.5 — Quản trị Backup & Khôi Phục Thảm Họa (Disaster Recovery)
  app.post('/admin/backup', async (request, reply) => {
    const userId = authenticate(request, deps);
    if (!userId) {
      return reply.code(401).send({ code: 'unauthorized', message: 'Yêu cầu quyền quản trị' });
    }
    const now = deps.clock.now();
    const backup = await deps.store.createBackup(now);
    return reply.code(200).send(backup);
  });

  app.post<{ Body: { backup: ServerBackup } }>('/admin/restore', async (request, reply) => {
    const userId = authenticate(request, deps);
    if (!userId) {
      return reply.code(401).send({ code: 'unauthorized', message: 'Yêu cầu quyền quản trị' });
    }
    if (!request.body?.backup) {
      return reply.code(400).send({ code: 'bad_request', message: 'Thiếu dữ liệu backup' });
    }
    const success = await deps.store.restoreBackup(request.body.backup);
    if (!success) {
      return reply.code(400).send({ code: 'restore_failed', message: 'Khôi phục thất bại (checksum sai hoặc dữ liệu hỏng)' });
    }
    return reply.code(200).send({ ok: true, message: 'Khôi phục thành công' });
  });

  return app;
}

function authenticate(request: FastifyRequest, deps: AppDeps): string | null {
  const header = request.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  const verified = verifyGuestToken(deps.auth, token, deps.clock.now());
  return verified ? verified.userId : null;
}
