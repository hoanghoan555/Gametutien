import { Rng } from '../shared/deps';
import {
  pickRandom as pickRandomWithRng,
  pickUniqueRandom as pickUniqueRandomWithRng,
  randomFloat as randomFloatWithRng,
} from '../shared/random';

/**
 * Client (solo) implementation — P5.1 ràng buộc 1.
 * `next()` đọc `Math.random` LAZY tại từng draw: `withSeededRandom` (simulate/golden test)
 * monkey-patch `Math.random` vẫn hoạt động y hệt trước refactor.
 */
export const mathRandomRng: Rng = {
  next: () => Math.random(),
};

export function randomFloat(min: number, max: number): number {
  return randomFloatWithRng(mathRandomRng, min, max);
}

export function pickRandom<T>(items: readonly T[]): T {
  return pickRandomWithRng(mathRandomRng, items);
}

export function pickUniqueRandom<T>(items: readonly T[], count: number): T[] {
  return pickUniqueRandomWithRng(mathRandomRng, items, count);
}

export function createUniqueId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .substring(2, 8)}`;
}
