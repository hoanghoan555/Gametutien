import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BEAST_CONFIGS, BEAST_IDS } from '../src/data/beasts';
import {
  canAffordMaterials,
  createInitialBeastState,
  deployBeast,
  getBeastStats,
  getBeastUpgradeCost,
  hatchSpiritEgg,
  HATCH_EGG_COST,
  MAX_BEAST_LEVEL,
  upgradeBeast,
} from '../src/systems/beast';
import { createInitialPlayerState } from '../src/systems/progression';

test('Spirit Beast: cấu hình đầy đủ 6 Thần Thú', () => {
  assert.equal(BEAST_IDS.length, 6);
  for (const id of BEAST_IDS) {
    const cfg = BEAST_CONFIGS[id];
    assert.ok(cfg.name.length > 0);
    assert.ok(cfg.skillName.length > 0);
    assert.ok(cfg.dialogue.length > 0);
  }
});

test('Spirit Beast: khởi tạo trạng thái rỗng và không có thú xuất chiến', () => {
  const initial = createInitialBeastState();
  assert.equal(initial.activeBeastId, null);
  for (const id of BEAST_IDS) {
    assert.equal(initial.beasts[id].unlocked, false);
    assert.equal(initial.beasts[id].level, 0);
  }
});

test('Spirit Beast: ấp trứng thành công, trừ tài nguyên và mở khóa hoặc tăng cấp thú', () => {
  const player = createInitialPlayerState();
  player.materials.basicMaterial = 5000;
  player.materials.linhStone = 2000;

  const res = hatchSpiritEgg(player);
  assert.ok(!('error' in res), 'Ấp trứng phải thành công khi đủ tài nguyên');
  if ('error' in res) return;

  assert.ok(BEAST_IDS.includes(res.beastId));
  assert.equal(res.player.materials.basicMaterial, 5000 - HATCH_EGG_COST.basicMaterial);
  assert.equal(res.player.materials.linhStone, 2000 - HATCH_EGG_COST.linhStone);
  assert.equal(res.player.beastState?.beasts[res.beastId]?.unlocked, true);
  assert.ok(res.player.beastState?.beasts[res.beastId]?.level! >= 1);
});

test('Spirit Beast: bồi dưỡng tăng cấp, gia tăng thuộc tính và chiến lực', () => {
  const player = createInitialPlayerState();
  player.beastState = {
    activeBeastId: 'thanh_long',
    beasts: {
      thanh_long: { unlocked: true, level: 1 },
      bach_ho: { unlocked: false, level: 0 },
      chu_tuoc: { unlocked: false, level: 0 },
      huyen_vu: { unlocked: false, level: 0 },
      ky_lan: { unlocked: false, level: 0 },
      thien_ho: { unlocked: false, level: 0 },
    },
  };
  player.materials.basicMaterial = 50000;
  player.materials.linhStone = 20000;

  const statsLv1 = getBeastStats('thanh_long', 1);
  const statsLv2 = getBeastStats('thanh_long', 2);
  assert.ok(statsLv2.atk! > statsLv1.atk!);

  const initialPower = player.power;
  const upgradeRes = upgradeBeast(player, 'thanh_long');
  assert.equal(upgradeRes.success, true);
  assert.equal(upgradeRes.player.beastState?.beasts.thanh_long.level, 2);
  assert.ok(upgradeRes.player.power > initialPower, 'Chiến lực phải tăng khi nâng cấp thú xuất chiến');
});

test('Spirit Beast: xuất chiến & thu hồi thay đổi chiến lực chính xác', () => {
  const player = createInitialPlayerState();
  player.beastState = {
    activeBeastId: null,
    beasts: {
      thanh_long: { unlocked: true, level: 10 },
      bach_ho: { unlocked: false, level: 0 },
      chu_tuoc: { unlocked: false, level: 0 },
      huyen_vu: { unlocked: false, level: 0 },
      ky_lan: { unlocked: false, level: 0 },
      thien_ho: { unlocked: false, level: 0 },
    },
  };

  const powerWithoutBeast = player.power;
  const deployed = deployBeast(player, 'thanh_long');
  assert.equal(deployed.beastState?.activeBeastId, 'thanh_long');
  assert.ok(deployed.power > powerWithoutBeast, 'Xuất chiến phải tăng chiến lực');

  const recalled = deployBeast(deployed, null);
  assert.equal(recalled.beastState?.activeBeastId, null);
  assert.equal(recalled.power, powerWithoutBeast, 'Thu hồi phải trở về chiến lực ban đầu');
});
