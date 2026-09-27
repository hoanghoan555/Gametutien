import { OfflineRewardSummary, SettingsState } from '../types/game';
import { PlayerState } from '../types/player';
import { TowerState } from '../types/tower';
import { cultivateTowerSystem } from './cultivation';
import { addPlayerCultivationExp } from './progression';
import { addTowerExp } from './tower';

export const MAX_OFFLINE_SECONDS = 8 * 3600; // 8 giờ
export const MIN_OFFLINE_SECONDS_FOR_POPUP = 15; // Tối thiểu 15 giây rời game mới hiện popup

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

  const elapsedSeconds = Math.min(
    MAX_OFFLINE_SECONDS,
    Math.max(0, rawElapsedSeconds)
  );

  // Giới hạn số batch mô phỏng tối đa 2,500 bước trực tiếp và scale phần dư để mượt mà không lag trình duyệt
  const totalActions = Math.max(
    1,
    Math.floor(elapsedSeconds * player.stats.cultivationRate)
  );

  const maxSimulatedSteps = 600;
  if (totalActions <= maxSimulatedSteps) {
    const result = cultivateTowerSystem(player, tower, settings, totalActions);
    return {
      player: result.player,
      tower: result.tower,
      summary: {
        elapsedSeconds,
        actionsCount: totalActions,
        playerExpGained: result.playerExpGain,
        towerExpGained: result.towerExpGain,
        towerLevelsGained: result.towerLevelsGained,
        itemsGenerated: result.generatedItems.map((g) => g.item),
        autoEquippedCount: result.generatedItems.filter((g) => g.autoEquipped).length,
        dismantledCount: result.generatedItems.filter((g) => g.dismantled).length,
      },
    };
  }

  // Nếu offline dài (nhiều giờ), chia thành 600 bước đại diện để giữ tốc độ xử lý < 30ms
  const scaleFactor = totalActions / maxSimulatedSteps;
  const sampleResult = cultivateTowerSystem(
    player,
    tower,
    settings,
    maxSimulatedSteps
  );

  const extraTowerExp = Math.floor(
    sampleResult.towerExpGain * (scaleFactor - 1)
  );
  const extraPlayerExp = Math.floor(
    sampleResult.playerExpGain * (scaleFactor - 1)
  );

  // Áp dụng phần EXP cộng thêm từ thời gian dài
  const towerAfterExtra = addTowerExp(sampleResult.tower, extraTowerExp);
  const playerAfterExtra = addPlayerCultivationExp(
    {
      ...sampleResult.player,
      contribution: sampleResult.player.contribution + extraTowerExp,
    },
    extraPlayerExp
  );

  return {
    player: playerAfterExtra.player,
    tower: towerAfterExtra.tower,
    summary: {
      elapsedSeconds,
      actionsCount: totalActions,
      playerExpGained: sampleResult.playerExpGain + extraPlayerExp,
      towerExpGained: sampleResult.towerExpGain + extraTowerExp,
      towerLevelsGained:
        sampleResult.towerLevelsGained + towerAfterExtra.levelsGained,
      itemsGenerated: sampleResult.generatedItems.map((g) => g.item),
      autoEquippedCount: sampleResult.generatedItems.filter((g) => g.autoEquipped)
        .length,
      dismantledCount: sampleResult.generatedItems.filter((g) => g.dismantled)
        .length,
    },
  };
}
