import { useGameStore } from './gameStore';

export function useInventoryStore() {
  const {
    player,
    inventoryFilter,
    setInventoryFilter,
    selectedItem,
    setSelectedItem,
    equipItemFromInventory,
    dismantleSingleItem,
    dismantleBulkByRarity,
    debugGenerateItem,
    debugClearInventory,
  } = useGameStore();

  const filteredItems = player.inventory.filter((item) => {
    if (
      inventoryFilter.rarity !== 'all' &&
      item.rarity !== inventoryFilter.rarity
    ) {
      return false;
    }
    if (inventoryFilter.type !== 'all' && item.type !== inventoryFilter.type) {
      return false;
    }
    return true;
  });

  return {
    inventory: player.inventory,
    materials: player.materials,
    filteredItems,
    inventoryFilter,
    setInventoryFilter,
    selectedItem,
    setSelectedItem,
    equipItem: equipItemFromInventory,
    dismantleItem: dismantleSingleItem,
    dismantleBulkByRarity,
    debugGenerateItem,
    debugClearInventory,
  };
}
