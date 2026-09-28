import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import { Clock } from '../../src/shared/deps';
import { AuthConfig, issueGuestToken, verifyGuestToken } from './auth';
import { GameStore } from './store/types';

/**
 * P5.1 — Server skeleton (gate 6/7/12): /healthz, /auth/guest, /sync (read-only).
 * `/actions/cultivate` cố ý trả 501 — gameplay online thuộc P5.2 theo gate 12.
 */

export interface AppDeps {
  store: GameStore;
  auth: AuthConfig;
  clock: Clock;
}

export function buildApp(deps: AppDeps): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get('/healthz', async () => ({
    ok: true,
    serverTime: deps.clock.now(),
  }));

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
    async (request) => {
      const now = deps.clock.now();
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

  app.post('/actions/cultivate', async (_request, reply) =>
    reply.code(501).send({
      code: 'not_implemented',
      message: 'P5.2 mới mở /actions/cultivate (gate P5.1 #12)',
    })
  );

  return app;
}

function authenticate(request: FastifyRequest, deps: AppDeps): string | null {
  const header = request.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  const verified = verifyGuestToken(deps.auth, token, deps.clock.now());
  return verified ? verified.userId : null;
}
