import { calculateStatsAndPower } from '../src/systems/progression';
import { MpPlayerState } from '../src/shared/authority';
import { ActionDepsFactory, AuthorityDeps, Clock } from '../src/shared/deps';
import { createSeededRngFromString } from '../src/shared/rng';
import { Item } from '../src/types/item';

/**
 * Helper dùng chung cho test P5.1 — deps TẤT ĐỊNH (seeded RNG + counter ID + clock cố định).
 * Đây là mô phỏng client/dev; bản HMAC thật của server được test riêng trong server-rng.test.ts.
 */

export const FIXED_NOW = 1_700_000_000_000;

export function fixedClock(now = FIXED_NOW): Clock {
  return { now: () => now };
}

export function createMutableClock(start = FIXED_NOW) {
  let current = start;
  return {
    clock: { now: () => current } as Clock,
    set(value: number) {
      current = value;
    },
    advance(ms: number) {
      current += ms;
    },
  };
}

export function makeTestDeps(seedLabel: string, clock: Clock = fixedClock()): AuthorityDeps {
  const actionDeps: ActionDepsFactory = {
    forAction(userId: string, seq: number) {
      let counter = 0;
      return {
        rng: createSeededRngFromString(`${seedLabel}|${userId}|${seq}`),
        ids: {
          nextId: (prefix: string) => `${prefix}_${userId}_${seq}_${counter++}`,
        },
      };
    },
  };
  return { actionDeps, clock };
}

export function makeTestItem(overrides: Partial<Item> & Pick<Item, 'type'>): Item {
  return {
    id: 'test-item',
    name: 'Test Item',
    level: 10,
    rarity: 'white',
    power: 10,
    baseStats: { atk: 10 },
    affixes: [],
    createdAt: 0,
    ...overrides,
  };
}

/** Trang bị item vào ô của nó rồi tính lại stats/power — giữ state nhất quán như engine thật. */
export function equipItem(player: MpPlayerState, item: Item): MpPlayerState {
  const equipment = { ...player.equipment, [item.type]: item };
  const { stats, power } = calculateStatsAndPower(player.level, equipment);
  return { ...player, equipment, stats, power };
}
