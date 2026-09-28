import { OfflineRewardSummary, SettingsState } from '../types/game';
import { Item } from '../types/item';
import { PlayerState } from '../types/player';
import { TowerState } from '../types/tower';
import { calculateSingleActionGains, cultivateTowerSystem } from './cultivation';
import { addPlayerCultivationExp } from './progression';
import { addTowerExp } from './tower';

export const MAX_OFFLINE_SECONDS = 8 * 3600; // 8 giờ
export const MIN_OFFLINE_SECONDS_FOR_POPUP = 15; // Tối thiểu 15 giây rời game mới hiện popup

// Trần mô phỏng chính xác: phủ trọn 8 giờ offline ở tốc độ tối đa ~40 hành động/giây.
export const MAX_EXACT_ACTIONS = 1_200_000;
const REPORTED_ITEMS_LIMIT = 40;
const TICK_SECONDS = 1; // §30: vòng lặp tick trung tâm chạy mỗi 1 giây

/**
 * TASK 002A — Bug #2: mô phỏng offline theo TỪNG TICK 1 GIÂY (đúng ngữ nghĩa vòng lặp
 * trung tâm §30) thay vì chốt cứng số hành động theo cultivationRate tại thời điểm bắt đầu.
 *
 * Trước đây `totalActions = elapsed × rate(lúc rời)` khiến kết quả offline lệch với chạy online
 * cùng khoảng thời gian khi tốc độ tu luyện thay đổi giữa chừng (auto-equip trang bị có
 * cultivationRate). Nay mỗi tick lấy rate HIỆN TẠI:
 *   actions = floor(fractional + currentRate) — giống hệt tick online, độ dư được giữ nguyên.
 *
 * - Mô phỏng chính xác tối đa MAX_EXACT_ACTIONS hành động.
 * - Phần thời gian vượt trần (không thể xảy ra với cấu hình hiện tại): ngoại suy EXP +
 *   tiến độ loot theo tốc độ cuối, KHÔNG sinh thêm vật phẩm (tránh item ảo).
 * - `itemsGenerated` chỉ giữ tối đa REPORTED_ITEMS_LIMIT món cuối để hiển thị UI;
 *   tổng số thực nằm ở `itemsGeneratedTotal`.
 */
export function calculateOfflineProgression(
  player: PlayerState,
  tower: TowerState,
  settings: SettingsState,
  lastSavedAt: number,
  nowTimestamp = Date.now()
): {
  player: PlayerState;
  tower: TowerState;
  summary: OfflineRewardSummary | null;
} {
  if (!lastSavedAt || lastSavedAt <= 0 || !player.autoCultivation) {
    return { player, tower, summary: null };
  }

  const rawElapsedSeconds = Math.floor((nowTimestamp - lastSavedAt) / 1000);
  if (rawElapsedSeconds < MIN_OFFLINE_SECONDS_FOR_POPUP) {
    return { player, tower, summary: null };
  }

  const elapsedSeconds = Math.min(MAX_OFFLINE_SECONDS, Math.max(0, rawElapsedSeconds));

  let currentPlayer = player;
  let currentTower = tower;
  let playerExpGained = 0;
  let towerExpGained = 0;
  let towerLevelsGained = 0;
  let totalActions = 0;
  let simulatedActions = 0;
  let fractionalActions = 0;
  let itemsGeneratedTotal = 0;
  let autoEquippedCount = 0;
  let dismantledCount = 0;
  const recentItems: Item[] = [];
  let remainingSeconds = elapsedSeconds;

  while (remainingSeconds >= TICK_SECONDS && simulatedActions < MAX_EXACT_ACTIONS) {
    const tickBudget = fractionalActions + currentPlayer.stats.cultivationRate;
    let actionsThisTick = Math.floor(tickBudget);
    fractionalActions = tickBudget - actionsThisTick;

    // Chạm trần ngay giữa tick: cắt phần dư — phần này được ngoại suy ở bước sau.
    if (actionsThisTick > MAX_EXACT_ACTIONS - simulatedActions) {
      actionsThisTick = MAX_EXACT_ACTIONS - simulatedActions;
    }

    if (actionsThisTick > 0) {
      const result = cultivateTowerSystem(currentPlayer, currentTower, settings, actionsThisTick);
      currentPlayer = result.player;
      currentTower = result.tower;
      towerExpGained += result.towerExpGain;
      playerExpGained += result.playerExpGain;
      towerLevelsGained += result.towerLevelsGained;

      for (const generated of result.generatedItems) {
        itemsGeneratedTotal += 1;
        if (generated.autoEquipped) autoEquippedCount += 1;
        else if (generated.dismantled) dismantledCount += 1;
        recentItems.push(generated.item);
        if (recentItems.length > REPORTED_ITEMS_LIMIT) recentItems.shift();
      }
    }

    simulatedActions += actionsThisTick;
    totalActions += actionsThisTick;
    remainingSeconds -= TICK_SECONDS;
  }

  if (remainingSeconds > 0) {
    const gains = calculateSingleActionGains(
      currentPlayer,
      currentTower.totalCultivations + 1
    );
    const extrapolatedActions = Math.floor(
      fractionalActions + remainingSeconds * currentPlayer.stats.cultivationRate
    );

    if (extrapolatedActions > 0) {
      const extraTowerExp = gains.towerExpGain * extrapolatedActions;
      const extraPlayerExp = gains.playerExpGain * extrapolatedActions;
      const extraLootProgress = gains.lootProgressGain * extrapolatedActions;

      const towerRes = addTowerExp(currentTower, extraTowerExp);
      const playerRes = addPlayerCultivationExp(
        { ...currentPlayer, contribution: currentPlayer.contribution + extraTowerExp },
        extraPlayerExp
      );

      currentTower = {
        ...towerRes.tower,
        totalCultivations: currentTower.totalCultivations + extrapolatedActions,
        lootProgress:
          Math.round((towerRes.tower.lootProgress + extraLootProgress) * 100) / 100,
      };
      currentPlayer = playerRes.player;
      towerExpGained += extraTowerExp;
      playerExpGained += extraPlayerExp;
      towerLevelsGained += towerRes.levelsGained;
      totalActions += extrapolatedActions;
    }
  }

  return {
    player: currentPlayer,
    tower: currentTower,
    summary: {
      elapsedSeconds,
      actionsCount: totalActions,
      playerExpGained,
      towerExpGained,
      towerLevelsGained,
      itemsGenerated: recentItems,
      itemsGeneratedTotal,
      autoEquippedCount,
      dismantledCount,
    },
  };
}
