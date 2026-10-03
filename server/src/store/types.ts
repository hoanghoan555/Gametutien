import { MpActionResult, MpLootEvent, MpPlayerState, MpTowerState } from '../../../src/shared/authority';
import { SettingsState } from '../../../src/types/game';

/**
 * P5.1 — Store contract (gate 4/5).
 *
 * `submitActions` là đơn vị transaction duy nhất cho tiến trình:
 *  - Idempotent theo (userId, seq): gửi lại ⇒ trả ack đã cache, KHÔNG xử lý lần hai.
 *  - Serialize mọi writer của Global Tower: nhiều user đồng thời ⇒ không lost update.
 *  - `compute` là hàm THUẦN (shared authority) — store lo transaction/idempotency, không chứa gameplay.
 */

export interface GuestAccount {
  userId: string;
  deviceId: string;
  createdAt: number;
}

export interface SyncSnapshot {
  serverTime: number;
  lastSeq: number;
  player: MpPlayerState;
  settings: SettingsState;
  towerSnapshot: MpTowerState;
}

/** Mirror default client v1.2 (`INITIAL_SETTINGS` trong gameStore). `soundEnabled` giữ ở client là đích cuối. */
export const DEFAULT_MP_SETTINGS: SettingsState = {
  autoEquip: true,
  autoDismantle: true,
  autoDismantleMaxRarity: 'green',
  soundEnabled: true,
};

export interface ActionComputeContext {
  player: MpPlayerState;
  tower: MpTowerState;
  settings: SettingsState;
  /** Số hành động server cấp cho batch này (không tin client — gate P5.2). */
  count: number;
}

export interface SubmitActionsRequest {
  userId: string;
  seq: number;
  n: number;
  now: number;
  compute: (context: ActionComputeContext) => MpActionResult;
}

export interface SubmitActionsApplied {
  status: 'applied' | 'replayed';
  ackSeq: number;
  serverTime: number;
  towerDelta: { exp: number; level: number; levelsGained: number };
  playerDelta: { exp: number; level: number; levelsGained: number; contribution: number };
  lootEvents: MpLootEvent[];
}

export interface SeqConflict {
  status: 'seq_conflict';
  expectedSeq: number;
  lastSeq: number;
}

export type SubmitActionsResult = SubmitActionsApplied | SeqConflict;

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  contribution: number;
  power: number;
  realmName: string;
  realmLayer: number;
  level: number;
}

export interface LeaderboardData {
  topContribution: LeaderboardEntry[];
  topPower: LeaderboardEntry[];
  globalTower: MpTowerState;
  totalCultivators: number;
  myRank?: {
    contributionRank: number;
    powerRank: number;
  };
}

export interface TowerUpdateNotification {
  exp: number;
  levelsGained: number;
  contributorId: string;
  contributorName: string;
}

export type TowerUpdateListener = (tower: MpTowerState, event: TowerUpdateNotification) => void;

export interface MigrationResult {
  success: boolean;
  importedAt?: number;
  error?: string;
  snapshot?: SyncSnapshot;
}

export interface OfflineClaimResult {
  applied: boolean;
  offlineSeconds: number;
  actionsPerformed: number;
  playerExpGained: number;
  towerExpGained: number;
  towerLevelsGained: number;
  autoEquippedCount: number;
  dismantledCount: number;
  itemsReceivedCount: number;
  snapshot?: SyncSnapshot;
  error?: string;
}

export interface AnomalyRecord {
  id: string;
  userId: string;
  type: 'suspicious_budget' | 'seq_jump' | 'rate_exceeded' | 'invalid_payload';
  details: string;
  timestamp: number;
}

export interface ServerBackup {
  version: number;
  timestamp: number;
  tower: MpTowerState;
  userCount: number;
  checksum: string;
  usersData?: string;
}

export interface ServerMetrics {
  serverTime: number;
  uptimeSeconds: number;
  activeUsers: number;
  totalCultivations: number;
  towerLevel: number;
  anomaliesCount: number;
  recentAnomalies: AnomalyRecord[];
}

export interface GameStore {
  authOrCreateGuest(deviceId: string, now: number): Promise<GuestAccount>;
  getUserById(userId: string): Promise<GuestAccount | null>;
  /** Read-only — không mutate state (gate 7). */
  readSnapshot(userId: string, now: number): Promise<SyncSnapshot>;
  submitActions(request: SubmitActionsRequest): Promise<SubmitActionsResult>;
  getLeaderboard(userId?: string): Promise<LeaderboardData>;
  onTowerUpdate(listener: TowerUpdateListener): () => void;
  importSaveData(userId: string, rawSave: unknown, now: number): Promise<MigrationResult>;
  claimOfflineReward(userId: string, now: number): Promise<OfflineClaimResult>;
  recordAnomaly(anomaly: Omit<AnomalyRecord, 'id'>): void;
  getAnomalies(limit?: number): AnomalyRecord[];
  createBackup(now: number): Promise<ServerBackup>;
  restoreBackup(backup: ServerBackup): Promise<boolean>;
  getMetrics(now: number): Promise<ServerMetrics>;
}
