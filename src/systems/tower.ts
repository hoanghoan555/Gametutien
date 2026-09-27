import { TowerState } from '../types/tower';

export function calculateTowerExpToNextLevel(level: number): number {
  const safeLevel = Math.max(1, level);
  return Math.floor(1000 * Math.pow(safeLevel, 1.35));
}

export function createInitialTowerState(): TowerState {
  const initialLevel = 1;
  return {
    level: initialLevel,
    currentExp: 0,
    expToNextLevel: calculateTowerExpToNextLevel(initialLevel),
    lootProgress: 80, // Khởi đầu ở 80/100 để tân thủ sớm trải nghiệm rơi pháp bảo đầu tiên
    lootThreshold: 100,
    totalCultivations: 0,
  };
}

export interface TowerExpResult {
  tower: TowerState;
  levelsGained: number;
}

export function addTowerExp(tower: TowerState, expGain: number): TowerExpResult {
  let level = tower.level;
  let currentExp = tower.currentExp + Math.max(0, Math.floor(expGain));
  let expToNextLevel = tower.expToNextLevel;
  let levelsGained = 0;

  while (currentExp >= expToNextLevel) {
    currentExp -= expToNextLevel;
    level += 1;
    levelsGained += 1;
    expToNextLevel = calculateTowerExpToNextLevel(level);
  }

  return {
    tower: {
      ...tower,
      level,
      currentExp,
      expToNextLevel,
    },
    levelsGained,
  };
}

export function setTowerLevelState(tower: TowerState, targetLevel: number): TowerState {
  const safeLevel = Math.max(1, Math.floor(targetLevel));
  return {
    ...tower,
    level: safeLevel,
    currentExp: 0,
    expToNextLevel: calculateTowerExpToNextLevel(safeLevel),
  };
}
