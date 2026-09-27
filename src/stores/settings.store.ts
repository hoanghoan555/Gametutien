import { useGameStore } from './gameStore';

export function useSettingsStore() {
  const { settings, updateSettings, debugResetSave } = useGameStore();
  return {
    settings,
    updateSettings,
    resetSave: debugResetSave,
  };
}
