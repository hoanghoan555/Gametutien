import { Rng } from './deps';

/**
 * P5.1 — Các hàm random thuần theo `Rng` tường minh.
 * Client wrapper không tham số nằm ở `src/utils/random.ts` (hành vi cũ giữ nguyên).
 */

export function randomFloat(rng: Rng, min: number, max: number): number {
  return min + rng.next() * (max - min);
}

export function pickRandom<T>(rng: Rng, items: readonly T[]): T {
  const idx = Math.floor(rng.next() * items.length);
  return items[idx];
}

export function pickUniqueRandom<T>(rng: Rng, items: readonly T[], count: number): T[] {
  const pool = [...items];
  const result: T[] = [];
  const targetCount = Math.min(count, pool.length);

  for (let i = 0; i < targetCount; i++) {
    const idx = Math.floor(rng.next() * pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}
