export function randomFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomFloat(min, max + 1));
}

export function pickRandom<T>(items: readonly T[]): T {
  const idx = Math.floor(Math.random() * items.length);
  return items[idx];
}

export function pickUniqueRandom<T>(items: readonly T[], count: number): T[] {
  const pool = [...items];
  const result: T[] = [];
  const targetCount = Math.min(count, pool.length);

  for (let i = 0; i < targetCount; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}

export function createUniqueId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .substring(2, 8)}`;
}
