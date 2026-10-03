import { Plugin } from 'vite';
import { buildApp } from './app';
import { createHmacActionDepsFactory } from './rng';
import { MemoryGameStore } from './store/memory';
import { WebSocketManager } from './ws';

export function fastifyMultiplayerPlugin(): Plugin {
  const secret = 'vandao-dev-secret-local-p5';
  let counter = 1;
  const store = new MemoryGameStore({
    createUserId: () => `usr_p5_${Date.now()}_${counter++}`,
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

  return {
    name: 'fastify-multiplayer-plugin',
    configureServer(server) {
      if (server.httpServer) {
        wsManager.attach(server.httpServer);
      }

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const url = req.url.slice('/api'.length);
        const method = (req.method ?? 'GET') as
          | 'GET'
          | 'POST'
          | 'PUT'
          | 'DELETE'
          | 'PATCH'
          | 'OPTIONS';

        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', async () => {
          try {
            const rawBody = Buffer.concat(chunks).toString('utf-8');
            let payload: unknown = undefined;
            if (rawBody && rawBody.trim().length > 0) {
              try {
                payload = JSON.parse(rawBody);
              } catch {
                payload = rawBody;
              }
            }

            const response = await (app.inject as any)({
              method,
              url,
              headers: req.headers,
              payload: payload as any,
            });

            res.statusCode = response.statusCode ?? 200;
            if (response.headers) {
              for (const [key, val] of Object.entries(response.headers)) {
                if (val !== undefined) {
                  res.setHeader(key, val as any);
                }
              }
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(response.body ?? '');
          } catch (err: unknown) {
            res.statusCode = 500;
            res.end(
              JSON.stringify({ code: 'internal_error', message: String(err) })
            );
          }
        });
      });
    },
  };
}
