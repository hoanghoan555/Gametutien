import { useGameStore } from './gameStore';

export function usePlayerStore() {
  const {
    player,
    toggleAutoCultivation,
    equipItemFromInventory,
    unequipSlot,
    debugAddPlayerExp,
  } = useGameStore();

  return {
    player,
    toggleAutoCultivation,
    equipItem: equipItemFromInventory,
    unequipSlot,
    debugAddPlayerExp,
  };
}
