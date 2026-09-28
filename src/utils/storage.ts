import { SaveDataV1 } from '../types/game';
import { sanitizeSaveData } from './saveValidation';

export const STORAGE_KEY = 'vandao_tien_dinh_save_v1';

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export function loadSaveData(): SaveDataV1 | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    // Bug #4 (TASK 002A): không tin dữ liệu localStorage — luôn sanitize trước khi dùng.
    return sanitizeSaveData(JSON.parse(raw));
  } catch (err) {
    console.warn('Không thể đọc dữ liệu lưu:', err);
    return null;
  }
}

/**
 * Bug #1 (TASK 002A): mốc thời gian lưu gần nhất — dùng để tính tiến trình bế quan
 * khi tab từ hidden → visible mà không cần nạp lại toàn bộ save.
 */
export function readLastSavedAt(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { lastSavedAt?: unknown } | null;
    const value = parsed && typeof parsed.lastSavedAt === 'number' ? parsed.lastSavedAt : 0;
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function saveGameImmediate(data: SaveDataV1, lastSavedAt = Date.now()): void {
  // Huỷ bản debounce đang chờ: tránh ghi đè bản lưu mới nhất bằng dữ liệu cũ
  // và tránh đóng dấu thời gian mới cho trạng thái cũ (Bug #1).
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, lastSavedAt }));
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
