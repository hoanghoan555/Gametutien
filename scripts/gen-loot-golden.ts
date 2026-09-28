/**
 * Sinh lại fixture golden cho test hồi quy loot (`tests/fixtures/loot-golden.json`).
 *
 * CHỈ chạy script này khi thay đổi cân bằng có chủ đích (phải cập nhật Phụ lục A + changelog
 * GAME_DESIGN §31); mọi thay đổi khác làm `npm run mp:test` đỏ là dấu hiệu refactor đã đổi
 * hành vi draw-order — không được phép.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runGoldenScenario } from '../tests/golden-scenario';

const outPath = fileURLToPath(new URL('../tests/fixtures/loot-golden.json', import.meta.url));
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(runGoldenScenario(), null, 2)}\n`, 'utf8');
console.log(`Golden fixture: ${outPath}`);
