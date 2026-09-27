import { SaveDataV1 } from '../types/game';

export const STORAGE_KEY = 'vandao_tien_dinh_save_v1';

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export function loadSaveData(): SaveDataV1 | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveDataV1;
    if (!parsed || parsed.version !== 1 || !parsed.player || !parsed.tower) {
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn('Không thể đọc dữ liệu lưu:', err);
    return null;
  }
}

export function saveGameImmediate(data: SaveDataV1): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...data,
        lastSavedAt: Date.now(),
      })
    );
  } catch (err) {
    console.warn('Không thể lưu dữ liệu game:', err);
  }
}

export function saveGameDebounced(data: SaveDataV1, delayMs = 450): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    saveGameImmediate(data);
    saveTimeout = null;
  }, delayMs);
}

export function clearSaveData(): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Không thể xóa dữ liệu game:', err);
  }
}
