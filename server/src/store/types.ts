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

export interface GameStore {
  authOrCreateGuest(deviceId: string, now: number): Promise<GuestAccount>;
  getUserById(userId: string): Promise<GuestAccount | null>;
  /** Read-only — không mutate state (gate 7). */
  readSnapshot(userId: string, now: number): Promise<SyncSnapshot>;
  submitActions(request: SubmitActionsRequest): Promise<SubmitActionsResult>;
}
