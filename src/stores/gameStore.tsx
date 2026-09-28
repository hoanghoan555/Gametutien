import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RARITY_CONFIG } from '../data/rarities';
import {
  cultivateTowerSystem,
  processItemAcquisition,
} from '../systems/cultivation';
import {
  addMaterials,
  getDismantleReward,
  MAX_INVENTORY_SLOTS,
} from '../systems/equipment';
import { generateLootItem } from '../systems/loot';
import { calculateOfflineProgression } from '../systems/offline';
import {
  addPlayerCultivationExp,
  calculateStatsAndPower,
  createInitialPlayerState,
} from '../systems/progression';
import {
  addTowerExp,
  createInitialTowerState,
  setTowerLevelState,
} from '../systems/tower';
import {
  FloatingContribution,
  FlyingLootItem,
  InventoryFilter,
  NavigationTab,
  OfflineRewardSummary,
  SaveDataV1,
  SettingsState,
} from '../types/game';
import { EquipmentType, Item, Rarity } from '../types/item';
import { PlayerState } from '../types/player';
import { TowerState } from '../types/tower';
import { createUniqueId, randomFloat } from '../utils/random';
import { soundManager } from '../utils/sound';
import {
  clearSaveData,
  loadSaveData,
  readLastSavedAt,
  saveGameDebounced,
  saveGameImmediate,
} from '../utils/storage';

const INITIAL_SETTINGS: SettingsState = {
  autoEquip: true,
  autoDismantle: true,
  autoDismantleMaxRarity: 'green',
  soundEnabled: true,
};

export interface ToastNotice {
  id: string;
  message: string;
  rarity?: Rarity;
  powerDelta?: number;
}

interface GameContextValue {
  player: PlayerState;
  tower: TowerState;
  settings: SettingsState;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  selectedItem: Item | null;
  setSelectedItem: (item: Item | null) => void;
  inventoryFilter: InventoryFilter;
  setInventoryFilter: React.Dispatch<React.SetStateAction<InventoryFilter>>;
  floatingContributions: FloatingContribution[];
  flyingLootItems: FlyingLootItem[];
  toasts: ToastNotice[];
  offlineReward: OfflineRewardSummary | null;
  isCultivatingPulse: boolean;

  // Core Actions
  cultivateTower: (actionsCount?: number, isManual?: boolean) => void;
  toggleAutoCultivation: () => void;
  equipItemFromInventory: (itemId: string) => void;
  unequipSlot: (slot: EquipmentType) => void;
  dismantleSingleItem: (itemId: string) => void;
  dismantleBulkByRarity: (maxRarity: Rarity) => number;
  updateSettings: (partial: Partial<SettingsState>) => void;
  claimOfflineReward: () => void;

  // Debug Actions (Section 24)
  debugAddTowerExp: (amount: number) => void;
  debugAddPlayerExp: (amount: number) => void;
  debugSetTowerLevel: (level: number) => void;
  debugGenerateItem: (rarity: Rarity) => void;
  debugSimulateOffline: (seconds: number) => void;
  debugClearInventory: () => void;
  debugResetSave: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const initialBoot = useMemo(() => {
    const saved = loadSaveData();
    if (!saved) {
      return {
        player: createInitialPlayerState(),
        tower: createInitialTowerState(),
        settings: INITIAL_SETTINGS,
        offlineSummary: null as OfflineRewardSummary | null,
      };
    }

    const mergedSettings: SettingsState = {
      ...INITIAL_SETTINGS,
      ...saved.settings,
    };

    const recalc = calculateStatsAndPower(
      saved.player.level,
      saved.player.equipment
    );
    const hydratedPlayer: PlayerState = {
      ...createInitialPlayerState(),
      ...saved.player,
      stats: recalc.stats,
      power: recalc.power,
    };

    const hydratedTower: TowerState = {
      ...createInitialTowerState(),
      ...saved.tower,
    };

    const offlineRes = calculateOfflineProgression(
      hydratedPlayer,
      hydratedTower,
      mergedSettings,
      saved.lastSavedAt,
      Date.now()
    );

    return {
      player: offlineRes.player,
      tower: offlineRes.tower,
      settings: mergedSettings,
      offlineSummary: offlineRes.summary,
    };
  }, []);

  const [player, setPlayer] = useState<PlayerState>(initialBoot.player);
  const [tower, setTower] = useState<TowerState>(initialBoot.tower);
  const [settings, setSettings] = useState<SettingsState>(initialBoot.settings);
  const [offlineReward, setOfflineReward] =
    useState<OfflineRewardSummary | null>(initialBoot.offlineSummary);

  const [activeTab, setActiveTab] = useState<NavigationTab>('tower');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>({
    rarity: 'all',
    type: 'all',
  });

  const [floatingContributions, setFloatingContributions] = useState<
    FloatingContribution[]
  >([]);
  const [flyingLootItems, setFlyingLootItems] = useState<FlyingLootItem[]>([]);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);
  const [isCultivatingPulse, setIsCultivatingPulse] = useState(false);

  // TASK 002B: stateRef là bản sao đồng bộ của state (nguồn đọc duy nhất cho actions).
  // Mọi thay đổi state đi qua commit* — updater thuần, không race giữa snapshot và setState.
  const stateRef = useRef({ player, tower, settings });

  const commitPlayer = useCallback((next: PlayerState) => {
    if (next === stateRef.current.player) return;
    stateRef.current = { ...stateRef.current, player: next };
    setPlayer(next);
  }, []);

  const commitTower = useCallback((next: TowerState) => {
    if (next === stateRef.current.tower) return;
    stateRef.current = { ...stateRef.current, tower: next };
    setTower(next);
  }, []);

  const commitSettings = useCallback((next: SettingsState) => {
    if (next === stateRef.current.settings) return;
    stateRef.current = { ...stateRef.current, settings: next };
    setSettings(next);
  }, []);

  // Bug #1 (TASK 002A): mốc thời gian nền để tính tiến trình bế quan khi tab hidden → visible.
  const sessionStartedAtRef = useRef(Date.now());
  const hiddenAtRef = useRef(0);

  // Debounced Save on state change
  useEffect(() => {
    const payload: SaveDataV1 = {
      version: 1,
      player,
      tower,
      settings,
      lastSavedAt: Date.now(),
    };
    saveGameDebounced(payload, 500);
  }, [player, tower, settings]);

  // Bug #1 (TASK 002A): lưu khi rời tab, TÍNH TIẾN TRÌNH BẾ QUAN khi quay lại (không cộng trùng).
  useEffect(() => {
    const persistSnapshot = (
      snapshot: { player: PlayerState; tower: TowerState; settings: SettingsState },
      lastSavedAtOverride?: number
    ) => {
      saveGameImmediate(
        {
          version: 1,
          player: snapshot.player,
          tower: snapshot.tower,
          settings: snapshot.settings,
          lastSavedAt: lastSavedAtOverride ?? Date.now(),
        },
        lastSavedAtOverride
      );
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Rời tab: đóng dấu mốc bắt đầu "bế quan" rồi lưu ngay.
        hiddenAtRef.current = Date.now();
        persistSnapshot(stateRef.current);
        return;
      }

      // Quay lại tab: xác định thời gian rời đi từ mốc lưu gần nhất (không reset trước khi tính).
      const awaySince = Math.max(
        readLastSavedAt(),
        hiddenAtRef.current,
        sessionStartedAtRef.current
      );
      hiddenAtRef.current = 0;

      const {
        player: currentPlayer,
        tower: currentTower,
        settings: currentSettings,
      } = stateRef.current;
      const offline = calculateOfflineProgression(
        currentPlayer,
        currentTower,
        currentSettings,
        awaySince,
        Date.now()
      );
      if (!offline.summary) return;

      commitPlayer(offline.player);
      commitTower(offline.tower);
      setOfflineReward(offline.summary);
      // Chỉ sau khi đã áp dụng thưởng mới ghi mốc thời gian mới — tránh mất khoảng thời gian vừa tính.
      persistSnapshot({ player: offline.player, tower: offline.tower, settings: currentSettings });
    };

    const handleBeforeUnload = () => {
      const { player: p, tower: t, settings: s } = stateRef.current;
      if (document.visibilityState === 'hidden' && hiddenAtRef.current > 0) {
        // Đóng trình duyệt khi tab đang ẩn: giữ nguyên mốc rời tab để lần mở sau tính trọn
        // thời gian bế quan (mốc chỉ ghi một lần — không cộng trùng với visibilitychange).
        persistSnapshot({ player: p, tower: t, settings: s }, hiddenAtRef.current);
        return;
      }
      persistSnapshot({ player: p, tower: t, settings: s });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [commitPlayer, commitTower]);

  const pushToast = useCallback(
    (message: string, rarity?: Rarity, powerDelta?: number) => {
      const id = createUniqueId('toast');
      setToasts((prev) => [...prev.slice(-2), { id, message, rarity, powerDelta }]);
    },
    []
  );

  const enqueueVisualFeedback = useCallback(
    (
      towerExpGain: number,
      playerExpGain: number,
      isBurst: boolean,
      generatedItems: Array<{
        item: Item;
        autoEquipped: boolean;
        dismantled: boolean;
        powerDelta: number;
      }>,
      soundEnabled: boolean,
      isManual: boolean
    ) => {
      const now = Date.now();

      // 1. Floating Contribution number
      setFloatingContributions((prev) => [
        ...prev.slice(-5),
        {
          id: createUniqueId('float'),
          towerExp: towerExpGain,
          playerExp: playerExpGain,
          isBurst,
          xOffset: Math.round(randomFloat(-46, 46)),
          createdAt: now,
        },
      ]);

      if (isManual) {
        soundManager.playCultivateChime(soundEnabled);
      }

      // 2. Loot animation & toast
      if (generatedItems.length > 0) {
        const latestItems = generatedItems.slice(-3);
        const hasHighRarity = latestItems.some(
          (g) => RARITY_CONFIG[g.item.rarity].order >= 3
        );
        soundManager.playLootSpawn(soundEnabled, hasHighRarity);

        setFlyingLootItems((prev) => [
          ...prev.slice(-3),
          ...latestItems.map((g) => ({
            id: createUniqueId('fly'),
            item: g.item,
            autoEquipped: g.autoEquipped,
            powerDelta: g.powerDelta,
            createdAt: now,
          })),
        ]);

        for (const g of latestItems) {
          if (g.autoEquipped) {
            pushToast(
              `Tự động trang bị ${g.item.name} (Lv.${g.item.level})`,
              g.item.rarity,
              g.powerDelta
            );
          } else if (g.dismantled) {
            pushToast(
              `Phân giải ${g.item.name} nhận nguyên liệu`,
              g.item.rarity
            );
          } else {
            pushToast(
              `Nhận pháp bảo ${g.item.name} (Lv.${g.item.level})`,
              g.item.rarity
            );
          }
        }
      }
    },
    [pushToast]
  );

  const cultivateTower = useCallback(
    (actionsCount = 1, isManual = true) => {
      const { player: curPlayer, tower: curTower, settings: curSettings } =
        stateRef.current;

      const result = cultivateTowerSystem(
        curPlayer,
        curTower,
        curSettings,
        actionsCount
      );

      commitPlayer(result.player);
      commitTower(result.tower);

      if (result.towerLevelsGained > 0 || result.playerLevelsGained > 0) {
        soundManager.playLevelUp(curSettings.soundEnabled);
      }

      if (isManual) {
        setIsCultivatingPulse(true);
        setTimeout(() => setIsCultivatingPulse(false), 180);
      }

      enqueueVisualFeedback(
        result.towerExpGain,
        result.playerExpGain,
        result.isBurst,
        result.generatedItems,
        curSettings.soundEnabled,
        isManual
      );
    },
    [enqueueVisualFeedback, commitPlayer, commitTower]
  );

  // Section 30: Single Central Game Loop / Tick Manager
  const fractionalActionsRef = useRef(0);
  useEffect(() => {
    const TICK_MS = 1000;
    const interval = setInterval(() => {
      // Bug #1 (TASK 002A): tab đang ẩn — không tự chạy hành động nền để thời gian ẩn
      // được quy đổi trọn vẹn thành tiến trình bế quan lúc quay lại (tránh cộng trùng).
      if (document.visibilityState === 'hidden') return;

      const { player: curPlayer } = stateRef.current;
      const now = Date.now();

      // Cleanup expired DOM visual animations
      setFloatingContributions((prev) =>
        prev.length > 0 ? prev.filter((f) => now - f.createdAt < 950) : prev
      );
      setFlyingLootItems((prev) =>
        prev.length > 0 ? prev.filter((l) => now - l.createdAt < 1050) : prev
      );
      // §30: tick chỉ giới hạn tối đa 3 toast — việc hết hạn 2600ms do effect riêng lo.
      setToasts((prev) => (prev.length > 3 ? prev.slice(-3) : prev));

      // Auto cultivation batch processing
      if (curPlayer.autoCultivation) {
        const totalExact =
          fractionalActionsRef.current + curPlayer.stats.cultivationRate;
        const batchActions = Math.floor(totalExact);
        fractionalActionsRef.current = totalExact - batchActions;

        if (batchActions > 0) {
          cultivateTower(batchActions, false);
        }
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [cultivateTower]);

  // Clear oldest toast every 2.8s
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 2600);
    return () => clearTimeout(timer);
  }, [toasts]);

  const toggleAutoCultivation = useCallback(() => {
    const prev = stateRef.current.player;
    commitPlayer({ ...prev, autoCultivation: !prev.autoCultivation });
  }, [commitPlayer]);

  const equipItemFromInventory = useCallback(
    (itemId: string) => {
      // TASK 002B: đọc snapshot đồng bộ từ stateRef, tính thuần, toast ngoài updater.
      const prev = stateRef.current.player;
      const idx = prev.inventory.findIndex((i) => i.id === itemId);
      setSelectedItem(null);
      if (idx === -1) return;

      const targetItem = prev.inventory[idx];
      const currentEquipped = prev.equipment[targetItem.type];
      const nextInventory = [...prev.inventory];
      nextInventory.splice(idx, 1);

      if (currentEquipped) {
        nextInventory.unshift(currentEquipped);
      }

      const nextEquipment = {
        ...prev.equipment,
        [targetItem.type]: targetItem,
      };
      const { stats, power } = calculateStatsAndPower(prev.level, nextEquipment);
      commitPlayer({
        ...prev,
        equipment: nextEquipment,
        inventory: nextInventory,
        stats,
        power,
      });

      const delta = power - prev.power;
      pushToast(
        `Đã trang bị ${targetItem.name}`,
        targetItem.rarity,
        delta > 0 ? delta : undefined
      );
    },
    [commitPlayer, pushToast]
  );

  const unequipSlot = useCallback(
    (slot: EquipmentType) => {
      const prev = stateRef.current.player;
      const equipped = prev.equipment[slot];
      if (!equipped) return;
      if (prev.inventory.length >= MAX_INVENTORY_SLOTS) {
        pushToast('Túi đồ đã đầy (100/100)! Hãy phân giải bớt trang bị.');
        return;
      }

      const nextEquipment = {
        ...prev.equipment,
        [slot]: null,
      };
      const { stats, power } = calculateStatsAndPower(prev.level, nextEquipment);

      commitPlayer({
        ...prev,
        equipment: nextEquipment,
        inventory: [equipped, ...prev.inventory],
        stats,
        power,
      });
      setSelectedItem(null);
    },
    [commitPlayer, pushToast]
  );

  const dismantleSingleItem = useCallback(
    (itemId: string) => {
      const prev = stateRef.current.player;
      const target = prev.inventory.find((item) => item.id === itemId);
      if (!target) return;

      // TASK 002B: commit đồng bộ từ snapshot — updater không còn side effect.
      commitPlayer({
        ...prev,
        inventory: prev.inventory.filter((i) => i.id !== itemId),
        materials: addMaterials(prev.materials, getDismantleReward(target)),
      });

      pushToast(`Phân giải ${target.name} thành công`, target.rarity);
      setSelectedItem(null);
    },
    [commitPlayer, pushToast]
  );

  const dismantleBulkByRarity = useCallback(
    (maxRarity: Rarity): number => {
      const prev = stateRef.current.player;
      const maxOrder = RARITY_CONFIG[maxRarity].order;

      // TASK 002B: tính thuần từ snapshot đồng bộ rồi commit — số đếm trả về luôn khớp
      // đúng những gì được áp dụng (không còn khoảng hở giữa snapshot và updater).
      const kept: Item[] = [];
      let updatedMaterials = prev.materials;
      let removedCount = 0;

      for (const item of prev.inventory) {
        // Rule 14: Không cho auto-dismantle Red
        if (
          item.rarity !== 'red' &&
          RARITY_CONFIG[item.rarity].order <= maxOrder
        ) {
          updatedMaterials = addMaterials(
            updatedMaterials,
            getDismantleReward(item)
          );
          removedCount += 1;
        } else {
          kept.push(item);
        }
      }

      if (removedCount === 0) return 0;

      commitPlayer({ ...prev, inventory: kept, materials: updatedMaterials });
      pushToast(`Đã phân giải ${removedCount} trang bị dư thừa!`);
      return removedCount;
    },
    [commitPlayer, pushToast]
  );

  const updateSettings = useCallback(
    (partial: Partial<SettingsState>) => {
      commitSettings({ ...stateRef.current.settings, ...partial });
    },
    [commitSettings]
  );

  const claimOfflineReward = useCallback(() => {
    setOfflineReward(null);
  }, []);

  // --- DEBUG ACTIONS (Section 24) ---
  const debugAddTowerExp = useCallback(
    (amount: number) => {
      commitTower(addTowerExp(stateRef.current.tower, amount).tower);
    },
    [commitTower]
  );

  const debugAddPlayerExp = useCallback(
    (amount: number) => {
      commitPlayer(
        addPlayerCultivationExp(stateRef.current.player, amount).player
      );
    },
    [commitPlayer]
  );

  const debugSetTowerLevel = useCallback(
    (level: number) => {
      commitTower(setTowerLevelState(stateRef.current.tower, level));
    },
    [commitTower]
  );

  const debugGenerateItem = useCallback(
    (rarity: Rarity) => {
      const {
        player: curPlayer,
        tower: curTower,
        settings: curSettings,
      } = stateRef.current;

      const newItem = generateLootItem(curTower.level, rarity);
      const acq = processItemAcquisition(curPlayer, newItem, curSettings);
      commitPlayer(acq.player);

      enqueueVisualFeedback(
        0,
        0,
        false,
        [
          {
            item: newItem,
            autoEquipped: acq.autoEquipped,
            dismantled: acq.dismantled,
            powerDelta: acq.powerDelta,
          },
        ],
        curSettings.soundEnabled,
        true
      );
    },
    [commitPlayer, enqueueVisualFeedback]
  );

  const debugSimulateOffline = useCallback((seconds: number) => {
    const {
      player: curPlayer,
      tower: curTower,
      settings: curSettings,
    } = stateRef.current;
    const simulatedPast = Date.now() - seconds * 1000;
    const res = calculateOfflineProgression(
      curPlayer,
      curTower,
      curSettings,
      simulatedPast,
      Date.now()
    );
    commitPlayer(res.player);
    commitTower(res.tower);
    if (res.summary) {
      setOfflineReward(res.summary);
    }
  }, [commitPlayer, commitTower]);

  const debugClearInventory = useCallback(() => {
    commitPlayer({ ...stateRef.current.player, inventory: [] });
    setSelectedItem(null);
  }, [commitPlayer]);

  const debugResetSave = useCallback(() => {
    clearSaveData();
    const freshPlayer = createInitialPlayerState();
    const freshTower = createInitialTowerState();
    commitPlayer(freshPlayer);
    commitTower(freshTower);
    commitSettings(INITIAL_SETTINGS);
    setOfflineReward(null);
    setSelectedItem(null);
    setFloatingContributions([]);
    setFlyingLootItems([]);
    pushToast('Đã xóa dữ liệu lưu và khởi tạo lại Tiên Đỉnh!');
  }, [commitPlayer, commitSettings, commitTower, pushToast]);

  const value = useMemo<GameContextValue>(
    () => ({
      player,
      tower,
      settings,
      activeTab,
      setActiveTab,
      selectedItem,
      setSelectedItem,
      inventoryFilter,
      setInventoryFilter,
      floatingContributions,
      flyingLootItems,
      toasts,
      offlineReward,
      isCultivatingPulse,
      cultivateTower,
      toggleAutoCultivation,
      equipItemFromInventory,
      unequipSlot,
      dismantleSingleItem,
      dismantleBulkByRarity,
      updateSettings,
      claimOfflineReward,
      debugAddTowerExp,
      debugAddPlayerExp,
      debugSetTowerLevel,
      debugGenerateItem,
      debugSimulateOffline,
      debugClearInventory,
      debugResetSave,
    }),
    [
      player,
      tower,
      settings,
      activeTab,
      selectedItem,
      inventoryFilter,
      floatingContributions,
      flyingLootItems,
      toasts,
      offlineReward,
      isCultivatingPulse,
      cultivateTower,
      toggleAutoCultivation,
      equipItemFromInventory,
      unequipSlot,
      dismantleSingleItem,
      dismantleBulkByRarity,
      updateSettings,
      claimOfflineReward,
      debugAddTowerExp,
      debugAddPlayerExp,
      debugSetTowerLevel,
      debugGenerateItem,
      debugSimulateOffline,
      debugClearInventory,
      debugResetSave,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export function useGameStore(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGameStore phải được dùng bên trong GameProvider');
  }
  return ctx;
}
