import { createHash } from 'node:crypto';
import { setImmediate } from 'node:timers';
import { getRealmInfoForLevel } from '../../../src/data/realms';
import {
  claimOfflineAuthority,
  createInitialMpPlayerState,
  createInitialMpTowerState,
  MpPlayerState,
  MpTowerState,
  MP_LOOT_PROGRESS_START,
  MP_LOOT_THRESHOLD,
} from '../../../src/shared/authority';
import { AuthorityDeps } from '../../../src/shared/deps';
import { SettingsState } from '../../../src/types/game';
import { sanitizeSaveData } from '../../../src/utils/saveValidation';
import { createHmacActionDepsFactory } from '../rng';
import {
  AnomalyRecord,
  DEFAULT_MP_SETTINGS,
  GameStore,
  GuestAccount,
  LeaderboardData,
  LeaderboardEntry,
  MigrationResult,
  OfflineClaimResult,
  ServerBackup,
  ServerMetrics,
  SubmitActionsApplied,
  SubmitActionsRequest,
  SubmitActionsResult,
  SyncSnapshot,
  TowerUpdateListener,
  TowerUpdateNotification,
} from './types';

/**
 * P5.1/P5.2 — Reference store (gate 4/5): mô hình transaction của Postgres bằng async mutex.
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
  secret?: string;
  authorityDeps?: AuthorityDeps;
}

interface UserRecord {
  account: GuestAccount;
  player: MpPlayerState;
  settings: SettingsState;
  lastSeq: number;
  receipts: Map<number, SubmitActionsApplied>;
  migratedAt?: number;
}

const SEED_LEGENDS: Omit<LeaderboardEntry, 'rank'>[] = [
  { userId: 'usr_legend_1', name: 'Hàn Tuyệt (Ẩn Môn)', contribution: 850000, power: 12500000, realmName: 'Luyện Hư', realmLayer: 9, level: 60 },
  { userId: 'usr_legend_2', name: 'Thạch Hạo (Hoang)', contribution: 720000, power: 9800000, realmName: 'Luyện Hư', realmLayer: 5, level: 56 },
  { userId: 'usr_legend_3', name: 'Hàn Lập (Chưởng Thiên)', contribution: 610000, power: 7400000, realmName: 'Hóa Thần', realmLayer: 10, level: 50 },
  { userId: 'usr_legend_4', name: 'Bạch Tiểu Thuần', contribution: 490000, power: 5600000, realmName: 'Hóa Thần', realmLayer: 6, level: 46 },
  { userId: 'usr_legend_5', name: 'Tiêu Viêm (Viêm Đế)', contribution: 380000, power: 4200000, realmName: 'Nguyên Anh', realmLayer: 10, level: 40 },
  { userId: 'usr_legend_6', name: 'Diệp Phàm (Thiên Đế)', contribution: 290000, power: 3100000, realmName: 'Nguyên Anh', realmLayer: 5, level: 35 },
];

export class MemoryGameStore implements GameStore {
  private readonly usersByDevice = new Map<string, GuestAccount>();
  private readonly users = new Map<string, UserRecord>();
  private tower: MpTowerState = createInitialMpTowerState();
  private readonly writeLock = new Mutex();
  private readonly towerListeners = new Set<TowerUpdateListener>();
  private readonly anomalies: AnomalyRecord[] = [];
  private readonly startTime: number = Date.now();
  private anomalySeq = 1;

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

  onTowerUpdate(listener: TowerUpdateListener): () => void {
    this.towerListeners.add(listener);
    return () => {
      this.towerListeners.delete(listener);
    };
  }

  async getLeaderboard(userId?: string): Promise<LeaderboardData> {
    const allUserEntries: Omit<LeaderboardEntry, 'rank'>[] = Array.from(this.users.values()).map((r) => {
      const realmInfo = getRealmInfoForLevel(r.player.level);
      return {
        userId: r.account.userId,
        name: `Đạo Hữu #${r.account.userId.slice(-4)}`,
        contribution: r.player.contribution,
        power: r.player.power,
        realmName: realmInfo.realm.name,
        realmLayer: realmInfo.layer,
        level: r.player.level,
      };
    });

    const combined = [...allUserEntries, ...SEED_LEGENDS];

    const sortedByContrib = [...combined].sort((a, b) => b.contribution - a.contribution);
    const sortedByPower = [...combined].sort((a, b) => b.power - a.power);

    const topContribution: LeaderboardEntry[] = sortedByContrib.slice(0, 20).map((r, idx) => ({
      ...r,
      rank: idx + 1,
    }));

    const topPower: LeaderboardEntry[] = sortedByPower.slice(0, 20).map((r, idx) => ({
      ...r,
      rank: idx + 1,
    }));

    let myRank: { contributionRank: number; powerRank: number } | undefined = undefined;
    if (userId) {
      const cIdx = sortedByContrib.findIndex((r) => r.userId === userId);
      const pIdx = sortedByPower.findIndex((r) => r.userId === userId);
      if (cIdx !== -1 && pIdx !== -1) {
        myRank = {
          contributionRank: cIdx + 1,
          powerRank: pIdx + 1,
        };
      }
    }

    return {
      topContribution,
      topPower,
      globalTower: structuredClone(this.tower),
      totalCultivators: this.users.size + SEED_LEGENDS.length,
      myRank,
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

      // 5) Thông báo Realtime cho các listener
      const contributorName = `Đạo Hữu #${userId.slice(-4)}`;
      const notification = {
        exp: applied.towerDelta.exp,
        levelsGained: applied.towerDelta.levelsGained,
        contributorId: userId,
        contributorName,
      };
      for (const listener of this.towerListeners) {
        try {
          listener(structuredClone(this.tower), notification);
        } catch {
          // ignore listener errors
        }
      }

      return applied;
    });
  }

  async importSaveData(userId: string, rawSave: unknown, now: number): Promise<MigrationResult> {
    return this.writeLock.run(async () => {
      const record = this.requireUser(userId);
      if (record.migratedAt) {
        return {
          success: false,
          error: 'Tài khoản này đã từng chuyển đổi dữ liệu',
        };
      }

      const sanitized = sanitizeSaveData(rawSave);
      if (!sanitized) {
        return {
          success: false,
          error: 'Dữ liệu lưu không hợp lệ hoặc bị hỏng',
        };
      }

      // Nạp tiến trình player đã được sanitize
      const mpPlayer: MpPlayerState = {
        ...sanitized.player,
        lootProgress: MP_LOOT_PROGRESS_START,
        lootThreshold: MP_LOOT_THRESHOLD,
        cultivations: 0,
        lastGrantAt: now,
        fractionalActions: 0,
      };

      record.player = mpPlayer;
      record.settings = { ...sanitized.settings };
      record.migratedAt = now;

      // Hợp nhất cống hiến vào Đỉnh nếu có
      if (sanitized.tower && sanitized.tower.currentExp > 0) {
        this.tower.totalCultivations += sanitized.tower.totalCultivations || 0;
      }

      const snapshot = await this.readSnapshot(userId, now);
      return {
        success: true,
        importedAt: now,
        snapshot,
      };
    });
  }

  async claimOfflineReward(userId: string, now: number): Promise<OfflineClaimResult> {
    return this.writeLock.run(async () => {
      const record = this.requireUser(userId);
      const player = record.player;

      // Tạo authority deps với clock hiện tại và HMAC RNG
      const authorityDeps: AuthorityDeps = this.options.authorityDeps || {
        clock: { now: () => now },
        actionDeps: createHmacActionDepsFactory({ secret: this.options.secret || 'default-secret' }),
      };

      const result = claimOfflineAuthority(authorityDeps, {
        userId,
        player: structuredClone(player),
        tower: structuredClone(this.tower),
        settings: { ...record.settings },
      });

      if (!result.applied || !result.summary) {
        return {
          applied: false,
          offlineSeconds: 0,
          actionsPerformed: 0,
          playerExpGained: 0,
          towerExpGained: 0,
          towerLevelsGained: 0,
          autoEquippedCount: 0,
          dismantledCount: 0,
          itemsReceivedCount: 0,
          snapshot: await this.readSnapshot(userId, now),
        };
      }

      // COMMIT
      record.player = result.player;
      record.player.lastGrantAt = now;
      this.tower = result.tower;

      // Broadcast tower update if exp gained
      if (result.summary.towerExpGained > 0) {
        const contributorName = `Đạo Hữu #${userId.slice(-4)}`;
        const notification: TowerUpdateNotification = {
          exp: result.summary.towerExpGained,
          levelsGained: result.summary.towerLevelsGained,
          contributorId: userId,
          contributorName,
        };
        for (const listener of this.towerListeners) {
          try {
            listener(structuredClone(this.tower), notification);
          } catch {
            // ignore
          }
        }
      }

      const snapshot = await this.readSnapshot(userId, now);

      return {
        applied: true,
        offlineSeconds: result.summary.elapsedSeconds,
        actionsPerformed: result.summary.actionsCount,
        playerExpGained: result.summary.playerExpGained,
        towerExpGained: result.summary.towerExpGained,
        towerLevelsGained: result.summary.towerLevelsGained,
        autoEquippedCount: result.summary.autoEquippedCount,
        dismantledCount: result.summary.dismantledCount,
        itemsReceivedCount: result.summary.lootEvents.length,
        snapshot,
      };
    });
  }

  recordAnomaly(anomaly: Omit<AnomalyRecord, 'id'>): void {
    const record: AnomalyRecord = {
      id: `anom_${this.anomalySeq++}`,
      ...anomaly,
    };
    this.anomalies.unshift(record);
    if (this.anomalies.length > 200) {
      this.anomalies.length = 200;
    }
  }

  getAnomalies(limit = 50): AnomalyRecord[] {
    return this.anomalies.slice(0, limit);
  }

  async createBackup(now: number): Promise<ServerBackup> {
    return this.writeLock.run(async () => {
      const usersArray = Array.from(this.users.values()).map((u) => ({
        account: u.account,
        player: u.player,
        settings: u.settings,
        lastSeq: u.lastSeq,
        migratedAt: u.migratedAt,
      }));

      const payloadString = JSON.stringify({
        tower: this.tower,
        users: usersArray,
      });

      const checksum = createHash('sha256').update(payloadString).digest('hex');

      return {
        version: 1,
        timestamp: now,
        tower: structuredClone(this.tower),
        userCount: this.users.size,
        checksum,
        usersData: payloadString,
      };
    });
  }

  async restoreBackup(backup: ServerBackup): Promise<boolean> {
    return this.writeLock.run(async () => {
      if (!backup || !backup.usersData || !backup.checksum) return false;

      // Xác thực checksum
      const computedChecksum = createHash('sha256').update(backup.usersData).digest('hex');
      if (computedChecksum !== backup.checksum) {
        return false;
      }

      try {
        const parsed = JSON.parse(backup.usersData) as {
          tower: MpTowerState;
          users: Array<{
            account: GuestAccount;
            player: MpPlayerState;
            settings: SettingsState;
            lastSeq: number;
            migratedAt?: number;
          }>;
        };

        this.tower = parsed.tower;
        this.users.clear();
        this.usersByDevice.clear();

        for (const u of parsed.users) {
          this.usersByDevice.set(u.account.deviceId, u.account);
          this.users.set(u.account.userId, {
            account: u.account,
            player: u.player,
            settings: u.settings,
            lastSeq: u.lastSeq,
            receipts: new Map(),
            migratedAt: u.migratedAt,
          });
        }

        return true;
      } catch {
        return false;
      }
    });
  }

  async getMetrics(now: number): Promise<ServerMetrics> {
    return {
      serverTime: now,
      uptimeSeconds: Math.floor((now - this.startTime) / 1000),
      activeUsers: this.users.size,
      totalCultivations: this.tower.totalCultivations,
      towerLevel: this.tower.level,
      anomaliesCount: this.anomalies.length,
      recentAnomalies: this.anomalies.slice(0, 10),
    };
  }

  private requireUser(userId: string): UserRecord {
    const record = this.users.get(userId);
    if (!record) throw new Error(`Không tìm thấy user ${userId}`);
    return record;
  }
}
