import { setImmediate } from 'node:timers';
import {
  createInitialMpPlayerState,
  createInitialMpTowerState,
  MpPlayerState,
  MpTowerState,
} from '../../../src/shared/authority';
import { SettingsState } from '../../../src/types/game';
import {
  DEFAULT_MP_SETTINGS,
  GameStore,
  GuestAccount,
  SubmitActionsApplied,
  SubmitActionsRequest,
  SubmitActionsResult,
  SyncSnapshot,
} from './types';

/**
 * P5.1 — Reference store (gate 4/5): mô hình transaction của Postgres bằng async mutex.
 *
 *   BEGIN → (INSERT receipt ON CONFLICT) → SELECT tower FOR UPDATE → compute → ghi → COMMIT
 *
 * `writeLock` tương đương `SELECT … FOR UPDATE` trên dòng towers('global'): beta chỉ có 1 Đỉnh
 * và MỌI batch đều chạm Đỉnh, nên serialize toàn bộ writer là đúng ngữ nghĩa. Adapter Postgres
 * thật (P5.2) dùng đúng thứ tự transaction trong `server/db/schema.sql`.
 */

class Mutex {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.then(task, task);
    this.tail = result.catch(() => undefined);
    return result;
  }
}

export interface MemoryGameStoreOptions {
  createUserId: () => string;
}

interface UserRecord {
  account: GuestAccount;
  player: MpPlayerState;
  settings: SettingsState;
  lastSeq: number;
  receipts: Map<number, SubmitActionsApplied>;
}

export class MemoryGameStore implements GameStore {
  private readonly usersByDevice = new Map<string, GuestAccount>();
  private readonly users = new Map<string, UserRecord>();
  private tower: MpTowerState = createInitialMpTowerState();
  private readonly writeLock = new Mutex();

  constructor(private readonly options: MemoryGameStoreOptions) {}

  async authOrCreateGuest(deviceId: string, now: number): Promise<GuestAccount> {
    const existing = this.usersByDevice.get(deviceId);
    if (existing) return { ...existing };

    const account: GuestAccount = {
      userId: this.options.createUserId(),
      deviceId,
      createdAt: now,
    };
    this.usersByDevice.set(deviceId, account);
    this.users.set(account.userId, {
      account,
      player: createInitialMpPlayerState(now),
      settings: { ...DEFAULT_MP_SETTINGS },
      lastSeq: 0,
      receipts: new Map(),
    });
    return { ...account };
  }

  async getUserById(userId: string): Promise<GuestAccount | null> {
    const record = this.users.get(userId);
    return record ? { ...record.account } : null;
  }

  async readSnapshot(userId: string, now: number): Promise<SyncSnapshot> {
    const record = this.requireUser(userId);
    // Trả bản sao — handler /sync không thể vô tình sửa state nội bộ (read-only, gate 7).
    return {
      serverTime: now,
      lastSeq: record.lastSeq,
      player: structuredClone(record.player),
      settings: { ...record.settings },
      towerSnapshot: structuredClone(this.tower),
    };
  }

  async submitActions(request: SubmitActionsRequest): Promise<SubmitActionsResult> {
    const { userId, seq, n, now } = request;
    if (!Number.isInteger(seq) || seq < 1) throw new Error('seq phải là số nguyên ≥ 1');
    if (!Number.isInteger(n) || n < 1) throw new Error('n phải là số nguyên ≥ 1');

    const record = this.users.get(userId);
    if (!record) throw new Error(`Không tìm thấy user ${userId}`);

    return this.writeLock.run(async () => {
      // 1) Idempotency barrier: (user_id, seq) đã xử lý ⇒ trả ack cache, không compute lại.
      const cached = record.receipts.get(seq);
      if (cached) {
        return { ...structuredClone(cached), status: 'replayed', serverTime: now };
      }

      // 2) seq phải đơn điệu liền kề — lệch ⇒ client gọi /sync (409 ở tầng route P5.2).
      if (seq !== record.lastSeq + 1) {
        return {
          status: 'seq_conflict',
          expectedSeq: record.lastSeq + 1,
          lastSeq: record.lastSeq,
        };
      }

      // 3) Điểm nhường event loop — mô phỏng I/O DB nằm TRONG critical section.
      //    Nếu lock bị gỡ, test concurrency sẽ bắt được lost update.
      await new Promise<void>((resolve) => {
        setImmediate(resolve);
      });

      const playerBefore = record.player;
      const result = request.compute({
        player: structuredClone(record.player),
        tower: structuredClone(this.tower),
        settings: { ...record.settings },
        count: n,
      });

      const applied: SubmitActionsApplied = {
        status: 'applied',
        ackSeq: seq,
        serverTime: now,
        towerDelta: {
          exp: result.towerExpGain,
          level: result.tower.level,
          levelsGained: result.towerLevelsGained,
        },
        playerDelta: {
          exp: result.playerExpGain,
          level: result.player.level,
          levelsGained: result.playerLevelsGained,
          contribution: result.player.contribution - playerBefore.contribution,
        },
        lootEvents: result.lootEvents,
      };

      // 4) COMMIT: mọi ghi diễn ra nguyên tử sau khi compute xong, trong cùng critical section.
      record.player = result.player;
      this.tower = result.tower;
      record.lastSeq = seq;
      record.receipts.set(seq, structuredClone(applied));
      return applied;
    });
  }

  private requireUser(userId: string): UserRecord {
    const record = this.users.get(userId);
    if (!record) throw new Error(`Không tìm thấy user ${userId}`);
    return record;
  }
}
