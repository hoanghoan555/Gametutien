import { useGameStore } from './gameStore';

export function usePlayerStore() {
  const {
    player,
    toggleAutoCultivation,
    equipItemFromInventory,
    unequipSlot,
    openEnhanceModal,
    enhanceSlot,
    enhanceSlotMax,
    enhanceAllBalanced,
    debugAddPlayerExp,
  } = useGameStore();

  return {
    player,
    toggleAutoCultivation,
    equipItem: equipItemFromInventory,
    unequipSlot,
    openEnhanceModal,
    enhanceSlot,
    enhanceSlotMax,
    enhanceAllBalanced,
    debugAddPlayerExp,
  };
}
