import { IncomingMessage } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { Clock } from '../../src/shared/deps';
import { AuthConfig, verifyGuestToken } from './auth';
import { GameStore, TowerUpdateNotification } from './store/types';
import { MpTowerState } from '../../src/shared/authority';

export interface WebSocketManagerOptions {
  store: GameStore;
  auth: AuthConfig;
  clock: Clock;
}

export interface ClientConnection {
  ws: WebSocket;
  userId?: string;
  isAlive: boolean;
}

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private readonly clients = new Set<ClientConnection>();
  private unsubscribeTower: (() => void) | null = null;
  private lastBroadcastTime = 0;
  private pendingBroadcastTimer: NodeJS.Timeout | null = null;
  private latestTower: MpTowerState | null = null;
  private lastNotification: TowerUpdateNotification | null = null;

  constructor(private readonly options: WebSocketManagerOptions) {
    this.unsubscribeTower = this.options.store.onTowerUpdate((tower, notification) => {
      this.handleTowerUpdate(tower, notification);
    });
  }

  attach(server: any): void {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
      const url = new URL(request.url ?? '', `http://${request.headers.host || 'localhost'}`);
      if (url.pathname === '/rt' || url.pathname === '/api/rt') {
        this.wss?.handleUpgrade(request, socket, head, (ws) => {
          this.wss?.emit('connection', ws, request);
        });
      }
    });

    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      const conn: ClientConnection = { ws, isAlive: true };
      this.clients.add(conn);

      const url = new URL(request.url ?? '', `http://${request.headers.host || 'localhost'}`);
      const token = url.searchParams.get('token');
      if (token) {
        const verified = verifyGuestToken(
          this.options.auth,
          token,
          this.options.clock.now()
        );
        if (verified) {
          conn.userId = verified.userId;
        }
      }

      // Send initial welcome message
      ws.send(
        JSON.stringify({
          type: 'connected',
          serverTime: this.options.clock.now(),
          onlineCount: this.clients.size,
        })
      );

      ws.on('message', (data: Buffer | string) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === 'auth' && typeof parsed.token === 'string') {
            const verified = verifyGuestToken(
              this.options.auth,
              parsed.token,
              this.options.clock.now()
            );
            if (verified) {
              conn.userId = verified.userId;
              ws.send(JSON.stringify({ type: 'auth.ack', userId: verified.userId }));
            }
          } else if (parsed.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', serverTime: this.options.clock.now() }));
          }
        } catch {
          // ignore non-json messages
        }
      });

      ws.on('close', () => {
        this.clients.delete(conn);
        this.broadcastOnlineCount();
      });

      ws.on('error', () => {
        this.clients.delete(conn);
      });

      this.broadcastOnlineCount();
    });
  }

  private handleTowerUpdate(tower: MpTowerState, notification: TowerUpdateNotification): void {
    this.latestTower = tower;
    this.lastNotification = notification;

    const now = this.options.clock.now();
    const isLevelUp = notification.levelsGained > 0;

    // Milestone level up -> Broadcast ngay lập tức!
    if (isLevelUp) {
      this.broadcast({
        type: 'milestone',
        level: tower.level,
        message: `Thiên Địa Dị Tượng: Vạn Đạo Tiên Đỉnh đã đột phá Cấp ${tower.level}!`,
        contributor: notification.contributorName,
        serverTime: now,
      });
      this.broadcastTowerUpdate();
      return;
    }

    // Throttled 1.5s broadcast cho các lần tăng EXP thông thường
    if (now - this.lastBroadcastTime >= 1500) {
      this.broadcastTowerUpdate();
    } else if (!this.pendingBroadcastTimer) {
      const waitTime = Math.max(100, 1500 - (now - this.lastBroadcastTime));
      this.pendingBroadcastTimer = setTimeout(() => {
        this.pendingBroadcastTimer = null;
        this.broadcastTowerUpdate();
      }, waitTime);
    }
  }

  private broadcastTowerUpdate(): void {
    if (!this.latestTower) return;
    this.lastBroadcastTime = this.options.clock.now();

    this.broadcast({
      type: 'tower.update',
      tower: this.latestTower,
      onlineCount: this.clients.size,
      recentContribution: this.lastNotification
        ? {
            contributorName: this.lastNotification.contributorName,
            exp: this.lastNotification.exp,
          }
        : undefined,
    });
  }

  private broadcastOnlineCount(): void {
    this.broadcast({
      type: 'presence',
      onlineCount: this.clients.size,
    });
  }

  broadcast(message: Record<string, unknown>): void {
    const payload = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  close(): void {
    if (this.pendingBroadcastTimer) {
      clearTimeout(this.pendingBroadcastTimer);
      this.pendingBroadcastTimer = null;
    }
    if (this.unsubscribeTower) {
      this.unsubscribeTower();
      this.unsubscribeTower = null;
    }
    for (const client of this.clients) {
      try {
        client.ws.close();
      } catch {
        // ignore
      }
    }
    this.clients.clear();
    this.wss?.close();
  }
}
