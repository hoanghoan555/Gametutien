import { useGameStore } from './gameStore';

export function useTowerStore() {
  const {
    tower,
    cultivateTower,
    floatingContributions,
    flyingLootItems,
    isCultivatingPulse,
    debugAddTowerExp,
    debugSetTowerLevel,
  } = useGameStore();

  return {
    tower,
    cultivate: () => cultivateTower(1, true),
    floatingContributions,
    flyingLootItems,
    isCultivatingPulse,
    debugAddTowerExp,
    debugSetTowerLevel,
  };
}
