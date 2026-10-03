import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canAffordEnhancement,
  createEmptyEnhancements,
  enhanceAllBalanced,
  enhanceSlotMax,
  enhanceSlotOnce,
  getEnhancementCost,
  getEnhancementTier,
  getSlotEnhancementStats,
  MAX_ENHANCEMENT_LEVEL,
} from '../src/systems/enhancement';
import { createInitialPlayerState } from '../src/systems/progression';

test('Enhancement: cấp khởi đầu là 0 cho mọi ô', () => {
  const enhancements = createEmptyEnhancements();
  assert.equal(enhancements.weapon, 0);
  assert.equal(enhancements.helmet, 0);
  assert.equal(enhancements.armor, 0);
  assert.equal(enhancements.boots, 0);
  assert.equal(enhancements.ring, 0);
  assert.equal(enhancements.artifact, 0);
});

test('Enhancement: tính toán nguyên liệu và điều kiện đủ tài nguyên', () => {
  const cost0 = getEnhancementCost(0);
  assert.ok(cost0.basicMaterial > 0);
  assert.equal(cost0.linhStone, 0, 'Cấp 0 lên 1 không tốn Linh Thạch');
  assert.equal(cost0.advancedMaterial, 0);
  assert.equal(cost0.rareMaterial, 0);

  const materials = {
    basicMaterial: 50,
    linhStone: 0,
    advancedMaterial: 0,
    rareMaterial: 0,
  };
  assert.equal(canAffordEnhancement(materials, cost0), false, 'Không đủ Linh Thiết');

  materials.basicMaterial = 500;
  assert.equal(canAffordEnhancement(materials, cost0), true, 'Đã đủ Linh Thiết');
});

test('Enhancement: Cường Hóa +1 thành công tăng cấp, trừ nguyên liệu và tăng Chiến Lực', () => {
  const basePlayer = createInitialPlayerState();
  basePlayer.materials.basicMaterial = 5000;
  basePlayer.materials.linhStone = 1000;

  const initialPower = basePlayer.power;
  const initialAtk = basePlayer.stats.atk;

  const res = enhanceSlotOnce(basePlayer, 'weapon');
  assert.equal(res.success, true);
  assert.equal(res.levelsGained, 1);
  assert.equal(res.player.enhancements?.weapon, 1);
  assert.ok(res.player.materials.basicMaterial < 5000);
  assert.ok(res.player.power > initialPower, 'Chiến Lực phải tăng');
  assert.ok(res.player.stats.atk > initialAtk, 'Công Kích phải tăng');
});

test('Enhancement: Phân cấp Hào Quang (Tiers) chính xác theo cấp độ', () => {
  assert.equal(getEnhancementTier(0).tierName, 'Phàm Trận');
  assert.equal(getEnhancementTier(5).tierName, 'Khí Linh');
  assert.equal(getEnhancementTier(15).tierName, 'Huyền Linh');
  assert.equal(getEnhancementTier(25).tierName, 'Địa Linh');
  assert.equal(getEnhancementTier(35).tierName, 'Thiên Linh');
  assert.equal(getEnhancementTier(45).tierName, 'Thần Tiên');
});

test('Enhancement: Cường Hóa Tối Đa (Max) nâng nhiều cấp cùng lúc và dừng khi hết nguyên liệu', () => {
  const basePlayer = createInitialPlayerState();
  basePlayer.materials.basicMaterial = 50000;
  basePlayer.materials.linhStone = 10000;
  basePlayer.materials.advancedMaterial = 2000;
  basePlayer.materials.rareMaterial = 500;

  const res = enhanceSlotMax(basePlayer, 'armor');
  assert.equal(res.success, true);
  assert.ok(res.levelsGained >= 5, 'Phải nâng được ít nhất 5 cấp');
  assert.equal(res.player.enhancements?.armor, res.levelsGained);
});

test('Enhancement: Cân Bằng 6 Ô tự động nâng đều các vị trí', () => {
  const basePlayer = createInitialPlayerState();
  basePlayer.materials.basicMaterial = 20000;
  basePlayer.materials.linhStone = 5000;

  const res = enhanceAllBalanced(basePlayer);
  assert.ok(res.totalLevelsGained >= 6, 'Phải nâng được ít nhất 1 vòng 6 ô');
  const enh = res.player.enhancements!;
  assert.ok(enh.weapon > 0);
  assert.ok(enh.helmet > 0);
  assert.ok(enh.armor > 0);
  assert.ok(enh.boots > 0);
  assert.ok(enh.ring > 0);
  assert.ok(enh.artifact > 0);
});

test('Enhancement: Không thể vượt quá trần MAX_ENHANCEMENT_LEVEL', () => {
  const basePlayer = createInitialPlayerState();
  basePlayer.enhancements = {
    weapon: MAX_ENHANCEMENT_LEVEL,
    helmet: 0,
    armor: 0,
    boots: 0,
    ring: 0,
    artifact: 0,
  };
  basePlayer.materials.basicMaterial = 9999999;

  const res = enhanceSlotOnce(basePlayer, 'weapon');
  assert.equal(res.success, false);
  assert.equal(res.levelsGained, 0);
});
