import { OfflineRewardSummary, SettingsState } from '../types/game';
import { PlayerState } from '../types/player';
import { TowerState } from '../types/tower';
import { calculateSingleActionGains, cultivateTowerSystem } from './cultivation';
import { addPlayerCultivationExp } from './progression';
import { addTowerExp } from './tower';

export const MAX_OFFLINE_SECONDS = 8 * 3600; // 8 giờ
export const MIN_OFFLINE_SECONDS_FOR_POPUP = 15; // Tối thiểu 15 giây rời game mới hiện popup

/**
 * Section 21 — Cân bằng v1.1: mô phỏng CHÍNH XÁC toàn bộ hành động offline
 * (thay vì lấy mẫu 600 bước như v1.0 khiến offline thiếu loot/EXP trầm trọng).
 *
 * - Trần mô phỏng chính xác: 1,200,000 hành động — phủ trọn 8 giờ offline ở tốc độ tối đa
 *   (~40 hành động/giây sau soft cap ≈ 1.15M hành động), nên thực tế luôn mô phỏng chính xác.
 * - Phần vượt trần được ngoại suy EXP + tiến độ loot theo tốc độ cuối (không sinh thêm vật phẩm).
 * - Danh sách vật phẩm trả về UI được rút gọn còn 40 món tiêu biểu; tổng số nằm ở itemsGeneratedTotal.
 */
const MAX_EXACT_ACTIONS = 1_200_000;
const REPORTED_ITEMS_LIMIT = 40;

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
  const totalActions = Math.max(1, Math.floor(elapsedSeconds * player.stats.cultivationRate));
  const exactActions = Math.min(totalActions, MAX_EXACT_ACTIONS);

  const result = cultivateTowerSystem(player, tower, settings, exactActions);
  let currentPlayer = result.player;
  let currentTower = result.tower;
  let playerExpGained = result.playerExpGain;
  let towerExpGained = result.towerExpGain;
  let towerLevelsGained = result.towerLevelsGained;

  const remainingActions = totalActions - exactActions;
  if (remainingActions > 0) {
    const gains = calculateSingleActionGains(
      currentPlayer,
      currentTower.totalCultivations + 1
    );
    const extraTowerExp = gains.towerExpGain * remainingActions;
    const extraPlayerExp = gains.playerExpGain * remainingActions;
    const extraLootProgress = gains.lootProgressGain * remainingActions;

    const towerRes = addTowerExp(currentTower, extraTowerExp);
    const playerRes = addPlayerCultivationExp(
      { ...currentPlayer, contribution: currentPlayer.contribution + extraTowerExp },
      extraPlayerExp
    );

    currentTower = {
      ...towerRes.tower,
      totalCultivations: currentTower.totalCultivations + remainingActions,
      lootProgress:
        Math.round((towerRes.tower.lootProgress + extraLootProgress) * 100) / 100,
    };
    currentPlayer = playerRes.player;
    towerExpGained += extraTowerExp;
    playerExpGained += extraPlayerExp;
    towerLevelsGained += towerRes.levelsGained;
  }

  const items = result.generatedItems;

  return {
    player: currentPlayer,
    tower: currentTower,
    summary: {
      elapsedSeconds,
      actionsCount: totalActions,
      playerExpGained,
      towerExpGained,
      towerLevelsGained,
      itemsGenerated: items.slice(-REPORTED_ITEMS_LIMIT).map((g) => g.item),
      itemsGeneratedTotal: items.length,
      autoEquippedCount: items.filter((g) => g.autoEquipped).length,
      dismantledCount: items.filter((g) => g.dismantled).length,
    },
  };
}
