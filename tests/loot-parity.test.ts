import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runGoldenScenario } from './golden-scenario';

/**
 * Gate 10 (P5.1) — Đường client (Math.random/Date.now, mặc định) phải cho kết quả
 * BYTE-IDENTICAL với trước refactor DI. Fixture sinh từ code gốc bằng `npm run gen:golden`.
 */

test('loot-parity — client path giữ nguyên 100% sau refactor DI (golden fixture)', () => {
  const fixture = JSON.parse(
    readFileSync(new URL('./fixtures/loot-golden.json', import.meta.url), 'utf8')
  );
  const fresh = runGoldenScenario();
  assert.deepStrictEqual(fresh, fixture);

  // Chốt thêm vài giá trị "nhìn thấy được" để diff dễ đọc khi hỏng.
  assert.equal(fresh.cultivate.tower.level, fixture.cultivate.tower.level);
  assert.ok(fresh.rolls.forcedRarity.length === 20);
});
