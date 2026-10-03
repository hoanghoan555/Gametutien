import {
  Anvil,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Egg,
  MessageCircle,
  Sparkles,
  Swords,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { BeastIcon } from '../components/beast/BeastIcon';
import { RarityBadge } from '../components/common/RarityBadge';
import { BEAST_CONFIGS, BEAST_IDS } from '../data/beasts';
import { RARITY_CONFIG, RARITY_ORDER } from '../data/rarities';
import { useGameStore } from '../stores/gameStore';
import { useTowerStore } from '../stores/tower.store';
import {
  canAffordMaterials,
  getBeastStats,
  getBeastUpgradeCost,
  HATCH_EGG_COST,
  MAX_BEAST_LEVEL,
} from '../systems/beast';
import { BeastId } from '../types/beast';
import { formatExactNumber } from '../utils/number';

export const SpiritBeastView: React.FC = () => {
  const { tower } = useTowerStore();
  const {
    player,
    hatchEgg,
    upgradeBeastLevel,
    deployBeastCompanion,
  } = useGameStore();

  const [selectedBeastId, setSelectedBeastId] = useState<BeastId>('thanh_long');
  const [showCodex, setShowCodex] = useState(false);

  const beastState = player.beastState ?? {
    activeBeastId: null,
    beasts: {
      thanh_long: { unlocked: false, level: 0 },
      bach_ho: { unlocked: false, level: 0 },
      chu_tuoc: { unlocked: false, level: 0 },
      huyen_vu: { unlocked: false, level: 0 },
      ky_lan: { unlocked: false, level: 0 },
      thien_ho: { unlocked: false, level: 0 },
    },
  };

  const activeBeast = beastState.activeBeastId
    ? BEAST_CONFIGS[beastState.activeBeastId]
    : null;
  const activeRecord = beastState.activeBeastId
    ? beastState.beasts[beastState.activeBeastId]
    : null;
  const activeStats =
    activeBeast && activeRecord && activeRecord.level > 0
      ? getBeastStats(activeBeast.id, activeRecord.level)
      : null;

  const canHatch = canAffordMaterials(player.materials, HATCH_EGG_COST);

  const currentBeastCfg = BEAST_CONFIGS[selectedBeastId];
  const currentBeastRecord = beastState.beasts[selectedBeastId] ?? {
    unlocked: false,
    level: 0,
  };
  const isSelectedActive = beastState.activeBeastId === selectedBeastId;
  const currentBeastStats = getBeastStats(
    selectedBeastId,
    currentBeastRecord.level
  );
  const nextBeastStats = getBeastStats(
    selectedBeastId,
    currentBeastRecord.level + 1
  );
  const upgradeCost = getBeastUpgradeCost(currentBeastRecord.level);
  const canUpgrade =
    currentBeastRecord.unlocked &&
    currentBeastRecord.level < MAX_BEAST_LEVEL &&
    canAffordMaterials(player.materials, upgradeCost);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4 custom-scrollbar">
      {/* Active Companion Banner */}
      <div className="relative p-3.5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-amber-500/30 shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">
              Thần Thú Xuất Chiến
            </span>
          </div>
          {activeBeast ? (
            <button
              type="button"
              onClick={() => deployBeastCompanion(null)}
              className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer underline"
            >
              Thu Hồi
            </button>
          ) : (
            <span className="text-[11px] text-slate-500">Chưa xuất chiến</span>
          )}
        </div>

        {activeBeast && activeRecord ? (
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)] flex items-center justify-center shrink-0">
              <BeastIcon id={activeBeast.id} size={30} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5 truncate">
                  <span>{activeBeast.name}</span>
                  <span className={`text-xs ${activeBeast.elementColor}`}>
                    [{activeBeast.elementName}]
                  </span>
                </h3>
                <span className="text-xs font-mono-num font-bold text-amber-300">
                  Lv.{activeRecord.level}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {activeBeast.title} · {activeBeast.skillName}
              </p>

              {/* Dialogue speech */}
              <div className="mt-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 flex items-center gap-1.5">
                <MessageCircle className="w-3 h-3 text-amber-300 shrink-0" />
                <span className="italic truncate">"{activeBeast.dialogue[0]}"</span>
              </div>

              {/* Stats Boost Summary */}
              {activeStats && (
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-mono-num text-slate-300">
                  {activeStats.atk && (
                    <span>
                      Công Kích:{' '}
                      <strong className="text-amber-300">+{activeStats.atk}</strong>
                    </span>
                  )}
                  {activeStats.hp && (
                    <span>
                      Sinh Lực:{' '}
                      <strong className="text-emerald-400">+{activeStats.hp}</strong>
                    </span>
                  )}
                  {activeStats.def && (
                    <span>
                      Phòng Thủ:{' '}
                      <strong className="text-sky-300">+{activeStats.def}</strong>
                    </span>
                  )}
                  {activeStats.critRate && (
                    <span>
                      Bạo Kích:{' '}
                      <strong className="text-rose-300">
                        +{activeStats.critRate}%
                      </strong>
                    </span>
                  )}
                  {activeStats.cultivationRate && (
                    <span>
                      Tu Luyện:{' '}
                      <strong className="text-emerald-300">
                        +{activeStats.cultivationRate}/s
                      </strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-2 text-center text-xs text-slate-400">
            Hãy chọn một Thần Thú đã thức tỉnh bên dưới và bấm{' '}
            <strong className="text-amber-300">Xuất Chiến</strong> để đồng hành
            tăng mạnh thuộc tính!
          </div>
        )}
      </div>

      {/* Hatching Egg Chamber */}
      <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Egg className="w-4 h-4 text-amber-300" />
            <h3 className="text-xs font-bold text-slate-200">
              Thiên Địa Linh Noãn (Ấp Trứng Thần Thú)
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">
            Thức tỉnh Huyết Mạch Thượng Cổ
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Tụ khí ấp trứng có cơ hội thức tỉnh Thần Thú mới. Nếu đã sở hữu, cấp bồi
          dưỡng của Thần Thú đó sẽ tự động được gia tăng thêm 1 cấp!
        </p>

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="text-xs text-slate-300 font-mono-num flex items-center gap-2">
            <span>Tiêu hao:</span>
            <span
              className={
                player.materials.basicMaterial >= HATCH_EGG_COST.basicMaterial
                  ? 'text-slate-200'
                  : 'text-rose-400'
              }
            >
              {HATCH_EGG_COST.basicMaterial} Linh Thiết
            </span>
            <span>·</span>
            <span
              className={
                player.materials.linhStone >= HATCH_EGG_COST.linhStone
                  ? 'text-emerald-300'
                  : 'text-rose-400'
              }
            >
              {HATCH_EGG_COST.linhStone} Linh Thạch
            </span>
          </div>

          <button
            type="button"
            disabled={!canHatch}
            onClick={() => hatchEgg()}
            className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              canHatch
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
            }`}
          >
            <Egg className="w-4 h-4" />
            <span>Ấp Trứng Ngay</span>
          </button>
        </div>
      </div>

      {/* 6 Great Beasts Grid Selector */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Lục Đại Thần Thú Tiên Uyển
        </h3>

        <div className="grid grid-cols-3 gap-2">
          {BEAST_IDS.map((id) => {
            const cfg = BEAST_CONFIGS[id];
            const record = beastState.beasts[id] ?? {
              unlocked: false,
              level: 0,
            };
            const isSelected = selectedBeastId === id;
            const isDeployed = beastState.activeBeastId === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedBeastId(id)}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.2)]'
                    : record.unlocked
                    ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-950/60 border-slate-800/60 opacity-60 hover:opacity-80'
                }`}
              >
                {isDeployed && (
                  <span className="absolute -top-1.5 -right-1 text-[8px] font-bold px-1 rounded bg-amber-500 text-slate-950">
                    Xuất Chiến
                  </span>
                )}
                <div className="w-10 h-10 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center mb-1">
                  <BeastIcon id={id} size={22} />
                </div>
                <span className="text-xs font-bold text-slate-100 truncate w-full">
                  {cfg.name}
                </span>
                <span className="text-[10px] text-slate-400">
                  {record.unlocked ? `Lv.${record.level}` : 'Chưa mở'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Beast Detail & Cultivation Card */}
      <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center">
              <BeastIcon id={selectedBeastId} size={26} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-bold text-slate-100">
                  {currentBeastCfg.name}
                </h4>
                <RarityBadge rarity={currentBeastCfg.rarity} />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                <span className={currentBeastCfg.elementColor}>
                  {currentBeastCfg.elementName}
                </span>
                <span>·</span>
                <span>{currentBeastCfg.title}</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400">Cấp Bồi Dưỡng</span>
            <div className="text-xs font-mono-num font-bold text-amber-300">
              {currentBeastRecord.unlocked
                ? `Lv.${currentBeastRecord.level} / ${MAX_BEAST_LEVEL}`
                : 'Phong Ấn'}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
          {currentBeastCfg.description}
        </p>

        {/* Skill details */}
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
            <Zap className="w-3.5 h-3.5" />
            <span>Thiên Phú: {currentBeastCfg.skillName}</span>
          </div>
          <p className="text-xs text-amber-100/90 leading-relaxed">
            {currentBeastCfg.skillDesc}
          </p>
        </div>

        {/* Stats Preview & Growth */}
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 divide-y divide-slate-800/60 text-xs">
          <div className="pb-1 text-[11px] font-semibold text-slate-400">
            Thuộc Tính Gia Trì Khi Xuất Chiến:
          </div>

          {currentBeastStats.atk !== undefined && (
            <div className="py-1 flex justify-between">
              <span className="text-slate-400">Công Kích</span>
              <span className="font-mono-num text-slate-200">
                +{currentBeastStats.atk}{' '}
                {currentBeastRecord.unlocked && (
                  <span className="text-emerald-400">
                    (+{currentBeastCfg.growthPerLevel.atk ?? 0}/Lv)
                  </span>
                )}
              </span>
            </div>
          )}

          {currentBeastStats.hp !== undefined && (
            <div className="py-1 flex justify-between">
              <span className="text-slate-400">Sinh Lực</span>
              <span className="font-mono-num text-slate-200">
                +{currentBeastStats.hp}{' '}
                {currentBeastRecord.unlocked && (
                  <span className="text-emerald-400">
                    (+{currentBeastCfg.growthPerLevel.hp ?? 0}/Lv)
                  </span>
                )}
              </span>
            </div>
          )}

          {currentBeastStats.def !== undefined && (
            <div className="py-1 flex justify-between">
              <span className="text-slate-400">Phòng Thủ</span>
              <span className="font-mono-num text-slate-200">
                +{currentBeastStats.def}{' '}
                {currentBeastRecord.unlocked && (
                  <span className="text-emerald-400">
                    (+{currentBeastCfg.growthPerLevel.def ?? 0}/Lv)
                  </span>
                )}
              </span>
            </div>
          )}

          {currentBeastStats.critRate !== undefined && (
            <div className="py-1 flex justify-between">
              <span className="text-slate-400">Tỷ Lệ Bạo Kích</span>
              <span className="font-mono-num text-slate-200">
                +{currentBeastStats.critRate}%{' '}
                {currentBeastRecord.unlocked && (
                  <span className="text-emerald-400">
                    (+{currentBeastCfg.growthPerLevel.critRate ?? 0}%/Lv)
                  </span>
                )}
              </span>
            </div>
          )}

          {currentBeastStats.critDamage !== undefined && (
            <div className="py-1 flex justify-between">
              <span className="text-slate-400">Sát Thương Bạo Kích</span>
              <span className="font-mono-num text-slate-200">
                +{currentBeastStats.critDamage}%{' '}
                {currentBeastRecord.unlocked && (
                  <span className="text-emerald-400">
                    (+{currentBeastCfg.growthPerLevel.critDamage ?? 0}%/Lv)
                  </span>
                )}
              </span>
            </div>
          )}

          {currentBeastStats.cultivationRate !== undefined && (
            <div className="py-1 flex justify-between">
              <span className="text-slate-400">Tốc Độ Tu Luyện</span>
              <span className="font-mono-num text-emerald-300">
                +{currentBeastStats.cultivationRate}/giây
              </span>
            </div>
          )}
        </div>

        {/* Action Controls for Selected Beast */}
        {currentBeastRecord.unlocked ? (
          <div className="space-y-2 pt-1">
            {/* Upgrade Cost */}
            {currentBeastRecord.level < MAX_BEAST_LEVEL && (
              <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono-num">
                <span>Chi phí Bồi Dưỡng:</span>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      player.materials.linhStone >= upgradeCost.linhStone
                        ? 'text-emerald-300'
                        : 'text-rose-400'
                    }
                  >
                    {formatExactNumber(upgradeCost.linhStone)} Linh Thạch
                  </span>
                  <span>·</span>
                  <span
                    className={
                      player.materials.basicMaterial >= upgradeCost.basicMaterial
                        ? 'text-slate-200'
                        : 'text-rose-400'
                    }
                  >
                    {formatExactNumber(upgradeCost.basicMaterial)} Linh Thiết
                  </span>
                  {upgradeCost.advancedMaterial > 0 && (
                    <>
                      <span>·</span>
                      <span
                        className={
                          player.materials.advancedMaterial >=
                          upgradeCost.advancedMaterial
                            ? 'text-sky-300'
                            : 'text-rose-400'
                        }
                      >
                        {upgradeCost.advancedMaterial} Huyền Tinh
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!canUpgrade}
                onClick={() => upgradeBeastLevel(selectedBeastId)}
                className={`min-h-[44px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  canUpgrade
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                }`}
              >
                <Anvil className="w-4 h-4" />
                <span>
                  Bồi Dưỡng (+1 Cấp)
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  deployBeastCompanion(isSelectedActive ? null : selectedBeastId)
                }
                className={`min-h-[44px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isSelectedActive
                    ? 'bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40'
                }`}
              >
                <Swords className="w-4 h-4" />
                <span>{isSelectedActive ? 'Nghỉ Ngơi' : 'Xuất Chiến Ngay'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center text-xs text-slate-400">
            Linh thú này đang say ngủ. Hãy <strong>Ấp Trứng Thần Thú</strong> để
            đánh thức huyết mạch!
          </div>
        )}
      </div>

      {/* Collapsible Tower Loot Codex (Section 7.2 & 7.3) */}
      <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/90 space-y-2">
        <button
          type="button"
          onClick={() => setShowCodex(!showCodex)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-300 cursor-pointer"
        >
          <span>Bảo Điển Phẩm Chất & Tỷ Lệ Rơi Tiên Đỉnh</span>
          {showCodex ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showCodex && (
          <div className="pt-2 divide-y divide-slate-800/70 text-xs">
            <div className="py-1.5 grid grid-cols-4 text-slate-400 font-medium">
              <span>Phẩm chất</span>
              <span className="text-right">Hệ số</span>
              <span className="text-right">Dòng phụ</span>
              <span className="text-right">Tỷ lệ rơi</span>
            </div>
            {RARITY_ORDER.map((rarity) => {
              const cfg = RARITY_CONFIG[rarity];
              return (
                <div
                  key={rarity}
                  className="py-2 grid grid-cols-4 items-center font-mono-num"
                >
                  <RarityBadge rarity={rarity} fullText />
                  <span className="text-right text-slate-200">
                    x{cfg.multiplier.toFixed(2)}
                  </span>
                  <span className="text-right text-slate-300">
                    {cfg.affixCount} dòng
                  </span>
                  <span className="text-right text-amber-300">
                    {cfg.dropWeight}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
