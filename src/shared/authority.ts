import { calculateSingleActionGains, processItemAcquisition } from '../systems/cultivation';
import { generateLootItemWithDeps } from '../systems/loot';
import { MAX_EXACT_ACTIONS, MAX_OFFLINE_SECONDS } from '../systems/offline';
import { addPlayerCultivationExp, createInitialPlayerState } from '../systems/progression';
import { addTowerExpToCore, calculateTowerExpToNextLevel } from '../systems/tower';
import { SettingsState } from '../types/game';
import { Item } from '../types/item';
import { PlayerState } from '../types/player';
import { ActionDeps, AuthorityDeps } from './deps';

/**
 * P5.1 — Lõi authoritative multiplayer (không React/DOM, không Math.random/Date.now).
 *
 * Tách ownership theo D5:
 *  - `MpTowerState`: Đỉnh chung — KHÔNG còn `lootProgress`/`lootThreshold`.
 *  - `MpPlayerState`: tiến trình loot per-user + bộ đếm hành động cá nhân + cửa sổ offline.
 *
 * Toàn bộ RNG/Clock/ID đi qua `AuthorityDeps` (ràng buộc 1); seed theo (userId, seq) (ràng buộc 2).
 * Hàm thuần: mọi thay đổi state nằm trong giá trị trả về — store/server chịu trách nhiệm transaction.
 */

export interface MpPlayerState extends PlayerState {
  /** D5 — tiến độ loot per-user (không còn thuộc Đỉnh chung). */
  lootProgress: number;
  /** D5 — ngưỡng loot per-user (v1.2: hằng 100; giữ cột để season/buff sau này). */
  lootThreshold: number;
  /** Bộ đếm hành động cá nhân — chỉ số burst (I2) + seq seed RNG. */
  cultivations: number;
  /** Lần cuối server ghi nhận tiến trình (mốc cửa sổ offline — ràng buộc 4). */
  lastGrantAt: number;
  /** Phần lẻ hành động chưa cấp — persist qua các cửa sổ (I4). */
  fractionalActions: number;
}

export interface MpTowerState {
  level: number;
  currentExp: number;
  expToNextLevel: number;
  totalCultivations: number;
}

/** Khởi đầu 80/100 giống v1.2 — tân thủ sớm trải nghiệm pháp bảo đầu tiên. */
export const MP_LOOT_PROGRESS_START = 80;
export const MP_LOOT_THRESHOLD = 100;

export interface MpLootEvent {
  item: Item;
  autoEquipped: boolean;
  dismantled: boolean;
  powerDelta: number;
}

export interface MpActionResult {
  player: MpPlayerState;
  tower: MpTowerState;
  actionsCount: number;
  towerExpGain: number;
  playerExpGain: number;
  towerLevelsGained: number;
  playerLevelsGained: number;
  isBurst: boolean;
  lootEvents: MpLootEvent[];
}

export function createInitialMpPlayerState(now: number): MpPlayerState {
  return {
    ...createInitialPlayerState(),
    lootProgress: MP_LOOT_PROGRESS_START,
    lootThreshold: MP_LOOT_THRESHOLD,
    cultivations: 0,
    lastGrantAt: now,
    fractionalActions: 0,
  };
}

export function createInitialMpTowerState(): MpTowerState {
  const level = 1;
  return {
    level,
    currentExp: 0,
    expToNextLevel: calculateTowerExpToNextLevel(level),
    totalCultivations: 0,
  };
}

function roundLootProgress(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Gắn lại các trường MP sau khi đi qua hàm thuần của client (chỉ nhận/trả PlayerState). */
function withMpFields(
  base: PlayerState,
  source: Pick<MpPlayerState, 'lastGrantAt' | 'fractionalActions' | 'lootThreshold'>,
  cultivations: number,
  lootProgress: number
): MpPlayerState {
  return {
    ...base,
    lootProgress,
    lootThreshold: source.lootThreshold,
    cultivations,
    lastGrantAt: source.lastGrantAt,
    fractionalActions: source.fractionalActions,
  };
}

export interface MpActionInput {
  userId: string;
  player: MpPlayerState;
  tower: MpTowerState;
  settings: SettingsState;
}

/**
 * Một hành động Khai Đỉnh authoritative — mirror v1.2 `cultivateTowerSystem` từng bước một.
 *
 * Khác biệt duy nhất theo thiết kế MP:
 *  - loot progress nằm trên PLAYER (D5);
 *  - burst index = seq cá nhân (I2) thay vì totalCultivations toàn cầu;
 *  - item level = Tower level TẠI TỪNG action (sau khi cộng exp action đó).
 */
export function applyAuthorityAction(deps: AuthorityDeps, input: MpActionInput): MpActionResult {
  const { userId, settings } = input;
  const player = input.player;
  const tower = input.tower;

  const seq = player.cultivations + 1;

  // seq cá nhân vừa là chỉ số burst vừa là khoá seed RNG (ràng buộc 2).
  const gains = calculateSingleActionGains(player, seq);

  // 1. Đỉnh chung: exp + level (D5: không đụng loot progress ở đây).
  const towerRes = addTowerExpToCore(tower, gains.towerExpGain);
  const nextTower: MpTowerState = {
    ...towerRes.tower,
    totalCultivations: tower.totalCultivations + 1,
  };

  // 2. Nhân vật: exp + cống hiến + bộ đếm hành động + loot progress per-user.
  const realmRes = addPlayerCultivationExp(player, gains.playerExpGain);
  let nextPlayer = withMpFields(
    {
      ...realmRes.player,
      contribution: realmRes.player.contribution + gains.towerExpGain,
    },
    player,
    seq,
    roundLootProgress(player.lootProgress + gains.lootProgressGain)
  );

  // 3. Sinh loot (RNG HMAC per-action, ID tất định) — lazy: chỉ tạo deps khi thực sự có loot.
  const lootEvents: MpLootEvent[] = [];
  let actionDeps: ActionDeps | null = null;
  while (nextPlayer.lootProgress >= nextPlayer.lootThreshold) {
    nextPlayer = {
      ...nextPlayer,
      lootProgress: roundLootProgress(nextPlayer.lootProgress - nextPlayer.lootThreshold),
    };

    actionDeps ??= deps.actionDeps.forAction(userId, seq);

    // Core Rule: item level == Tower level tại thời điểm sinh (từng action, I3/§5).
    const lootItem = generateLootItemWithDeps(
      { rng: actionDeps.rng, clock: deps.clock, ids: actionDeps.ids },
      nextTower.level
    );
    const acquisition = processItemAcquisition(nextPlayer, lootItem, settings);
    nextPlayer = withMpFields(
      acquisition.player,
      nextPlayer,
      seq,
      nextPlayer.lootProgress
    );
    lootEvents.push({
      item: lootItem,
      autoEquipped: acquisition.autoEquipped,
      dismantled: acquisition.dismantled,
      powerDelta: acquisition.powerDelta,
    });
  }

  return {
    player: nextPlayer,
    tower: nextTower,
    actionsCount: 1,
    towerExpGain: gains.towerExpGain,
    playerExpGain: gains.playerExpGain,
    towerLevelsGained: towerRes.levelsGained,
    playerLevelsGained: realmRes.levelsGained,
    isBurst: gains.isBurst,
    lootEvents,
  };
}

export interface MpBatchInput extends MpActionInput {
  /** Số hành động cần xử lý — SERVER quyết định (gate P5.2), không tin client. */
  count: number;
}

/**
 * Batch N hành động = N lần gọi `applyAuthorityAction` liên tiếp (gate 11).
 * Mỗi action có seed riêng theo seq nên kết quả KHÔNG phụ thuộc cách chia batch.
 */
export function cultivateAuthorityBatch(deps: AuthorityDeps, input: MpBatchInput): MpActionResult {
  const safeCount = Math.max(0, Math.floor(input.count));

  let player = input.player;
  let tower = input.tower;
  let towerExpGain = 0;
  let playerExpGain = 0;
  let towerLevelsGained = 0;
  let playerLevelsGained = 0;
  let isBurst = false;
  const lootEvents: MpLootEvent[] = [];

  for (let i = 0; i < safeCount; i += 1) {
    const step = applyAuthorityAction(deps, {
      userId: input.userId,
      player,
      tower,
      settings: input.settings,
    });
    player = step.player;
    tower = step.tower;
    towerExpGain += step.towerExpGain;
    playerExpGain += step.playerExpGain;
    towerLevelsGained += step.towerLevelsGained;
    playerLevelsGained += step.playerLevelsGained;
    isBurst = isBurst || step.isBurst;
    lootEvents.push(...step.lootEvents);
  }

  return {
    player,
    tower,
    actionsCount: safeCount,
    towerExpGain,
    playerExpGain,
    towerLevelsGained,
    playerLevelsGained,
    isBurst,
    lootEvents,
  };
}

export interface MpOfflineSummary {
  elapsedSeconds: number;
  actionsCount: number;
  playerExpGained: number;
  towerExpGained: number;
  towerLevelsGained: number;
  /** Toàn bộ loot sinh trong cửa sổ — endpoint P5.4 tự cắt bớt khi trả UI. */
  lootEvents: MpLootEvent[];
  autoEquippedCount: number;
  dismantledCount: number;
}

export interface MpOfflineClaimResult {
  applied: boolean;
  player: MpPlayerState;
  tower: MpTowerState;
  summary: MpOfflineSummary | null;
}

const TICK_SECONDS = 1; // §30: vòng lặp tick trung tâm 1 giây

/**
 * Offline claim authoritative (ràng buộc 4, D3/D4):
 * "offline" = server không nhận action từ client trong khoảng (lastGrantAt → now].
 *
 * - Chỉ áp dụng khi `autoCultivation = true` (D4); trần 8h (D3).
 * - Tick 1 giây, actions = floor(fractional + rate hiện hành) — cùng thuật toán §21 v1.2.
 * - Mọi action đi qua `applyAuthorityAction` ⇒ loot dùng Tower level TỪNG action, và
 *   RNG seed theo seq cá nhân — nên kết quả khớp tuyệt đối với xử lý online cùng chuỗi seq.
 * - Base Tower = trạng thái truyền vào (tại thời điểm claim — I3), gồm cả đóng góp người khác.
 * - `fractionalActions` được persist trả về (I4); `lastGrantAt` = now.
 *
 * Lưu ý I5: KHÔNG áp ngưỡng 15s của client v1.2 — mọi khoảng trống đều sinh hành động;
 * 15s chỉ còn là ngưỡng hiển thị popup phía client.
 */
export function claimOfflineAuthority(deps: AuthorityDeps, input: MpActionInput): MpOfflineClaimResult {
  const now = deps.clock.now();
  const { userId, settings } = input;
  const player = input.player;
  const tower = input.tower;

  if (!player.autoCultivation || !player.lastGrantAt || player.lastGrantAt <= 0) {
    return { applied: false, player, tower, summary: null };
  }

  const rawElapsedSeconds = Math.floor((now - player.lastGrantAt) / 1000);
  if (rawElapsedSeconds <= 0) {
    return { applied: false, player, tower, summary: null };
  }

  const elapsedSeconds = Math.min(MAX_OFFLINE_SECONDS, Math.max(0, rawElapsedSeconds));

  let currentPlayer = player;
  let currentTower = tower;
  let fractionalActions = player.fractionalActions;
  let remainingSeconds = elapsedSeconds;
  let simulatedActions = 0;
  let actionsCount = 0;
  let playerExpGained = 0;
  let towerExpGained = 0;
  let towerLevelsGained = 0;
  let autoEquippedCount = 0;
  let dismantledCount = 0;
  const lootEvents: MpLootEvent[] = [];

  while (remainingSeconds >= TICK_SECONDS && simulatedActions < MAX_EXACT_ACTIONS) {
    const tickBudget = fractionalActions + currentPlayer.stats.cultivationRate;
    let actionsThisTick = Math.floor(tickBudget);
    fractionalActions = tickBudget - actionsThisTick;

    if (actionsThisTick > MAX_EXACT_ACTIONS - simulatedActions) {
      actionsThisTick = MAX_EXACT_ACTIONS - simulatedActions;
    }

    if (actionsThisTick > 0) {
      const step = cultivateAuthorityBatch(deps, {
        userId,
        player: currentPlayer,
        tower: currentTower,
        settings,
        count: actionsThisTick,
      });
      currentPlayer = step.player;
      currentTower = step.tower;
      towerExpGained += step.towerExpGain;
      playerExpGained += step.playerExpGain;
      towerLevelsGained += step.towerLevelsGained;
      for (const event of step.lootEvents) {
        if (event.autoEquipped) autoEquippedCount += 1;
        else if (event.dismantled) dismantledCount += 1;
      }
      lootEvents.push(...step.lootEvents);
    }

    simulatedActions += actionsThisTick;
    actionsCount += actionsThisTick;
    remainingSeconds -= TICK_SECONDS;
  }

  // Ngoại suy phần vượt trần MAX_EXACT_ACTIONS (không chạm tới với trần 8h hiện tại):
  // EXP + loot progress theo tốc độ cuối, KHÔNG sinh item — đồng bộ hành vi client §21.
  if (remainingSeconds > 0) {
    const gains = calculateSingleActionGains(currentPlayer, currentPlayer.cultivations + 1);
    const extrapolatedActions = Math.floor(
      fractionalActions + remainingSeconds * currentPlayer.stats.cultivationRate
    );

    if (extrapolatedActions > 0) {
      const towerRes = addTowerExpToCore(currentTower, gains.towerExpGain * extrapolatedActions);
      const playerRes = addPlayerCultivationExp(
        {
          ...currentPlayer,
          contribution: currentPlayer.contribution + gains.towerExpGain * extrapolatedActions,
        },
        gains.playerExpGain * extrapolatedActions
      );

      currentTower = {
        ...towerRes.tower,
        totalCultivations: currentTower.totalCultivations + extrapolatedActions,
      };
      currentPlayer = withMpFields(
        playerRes.player,
        currentPlayer,
        currentPlayer.cultivations + extrapolatedActions,
        roundLootProgress(currentPlayer.lootProgress + gains.lootProgressGain * extrapolatedActions)
      );
      towerExpGained += gains.towerExpGain * extrapolatedActions;
      playerExpGained += gains.playerExpGain * extrapolatedActions;
      towerLevelsGained += towerRes.levelsGained;
      actionsCount += extrapolatedActions;
      fractionalActions =
        fractionalActions + remainingSeconds * currentPlayer.stats.cultivationRate - extrapolatedActions;
    }
  }

  return {
    applied: true,
    player: {
      ...currentPlayer,
      lastGrantAt: now,
      fractionalActions,
    },
    tower: currentTower,
    summary: {
      elapsedSeconds,
      actionsCount,
      playerExpGained,
      towerExpGained,
      towerLevelsGained,
      lootEvents,
      autoEquippedCount,
      dismantledCount,
    },
  };
}
