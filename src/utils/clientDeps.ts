import { Clock, IdGenerator, Rng } from '../shared/deps';
import { createUniqueId, mathRandomRng } from './random';

/**
 * P5.1 — Client implementation của các contract DI (ràng buộc 1): giữ y nguyên hành vi
 * tiền-refactor — mọi giá trị đọc LAZY tại từng lần dùng (tương thích `withSeededRandom`
 * trong `scripts/simulate.ts` và golden test `tests/loot-parity.test.ts`).
 *
 * Server KHÔNG import file này — server dùng implementation HMAC tất định (`server/src/rng.ts`).
 */
export { mathRandomRng };

export const systemClock: Clock = {
  now: () => Date.now(),
};

export const clientIdGenerator: IdGenerator = {
  nextId: (prefix: string) => createUniqueId(prefix),
};
