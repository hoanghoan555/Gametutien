import { Bug, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import React, { useState } from 'react';
import { RARITY_CONFIG, RARITY_ORDER } from '../../data/rarities';
import { useGameStore } from '../../stores/gameStore';

export const DebugPanel: React.FC = () => {
  const {
    player,
    tower,
    toggleAutoCultivation,
    debugAddTowerExp,
    debugAddPlayerExp,
    debugSetTowerLevel,
    debugGenerateItem,
    debugSimulateOffline,
    debugAddMaterials,
    debugClearInventory,
    debugResetSave,
  } = useGameStore();

  const [isOpen, setIsOpen] = useState(false);
  const [levelInput, setLevelInput] = useState(String(tower.level));

  // Section 24: Chỉ bật trong môi trường DEV
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="fixed bottom-3 right-3 z-50">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => {
            setLevelInput(String(tower.level));
            setIsOpen(true);
          }}
          className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-900/95 border border-amber-500/40 text-amber-300 text-xs font-medium flex items-center gap-1.5 shadow-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Bug className="w-3.5 h-3.5" />
          <span>Debug DEV</span>
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      ) : (
        <div className="w-72 bg-[#0b0f19]/95 backdrop-blur-md border border-amber-500/40 rounded-2xl shadow-2xl p-3 text-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 font-semibold text-amber-300">
              <Bug className="w-3.5 h-3.5" />
              <span>Debug Tools (DEV)</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-200"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* EXP & Materials Actions */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => debugAddTowerExp(1000)}
              className="px-2 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-amber-300 font-medium text-left truncate cursor-pointer"
            >
              +1000 Tower EXP
            </button>
            <button
              type="button"
              onClick={() => debugAddPlayerExp(10000)}
              className="px-2 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-emerald-300 font-medium text-left truncate cursor-pointer"
            >
              +10000 Player EXP
            </button>
            <button
              type="button"
              onClick={() => debugAddMaterials()}
              className="col-span-2 px-2 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-medium text-center truncate cursor-pointer"
            >
              +10,000 Nguyên Liệu Rèn Đúc
            </button>
          </div>

          {/* Set Tower Level */}
          <div className="space-y-1">
            <span className="text-slate-400">Set Tower Level (Hiện tại: Lv.{tower.level})</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={999}
                value={levelInput}
                onChange={(e) => setLevelInput(e.target.value)}
                className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono-num text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  const parsed = parseInt(levelInput, 10);
                  if (!Number.isNaN(parsed) && parsed >= 1) {
                    debugSetTowerLevel(parsed);
                  }
                }}
                className="px-2.5 py-1 rounded bg-amber-600/80 hover:bg-amber-500 text-slate-950 font-semibold cursor-pointer"
              >
                Set
              </button>
              <button
                type="button"
                onClick={() => {
                  debugSetTowerLevel(12);
                  setLevelInput('12');
                }}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Lv.12
              </button>
              <button
                type="button"
                onClick={() => {
                  debugSetTowerLevel(50);
                  setLevelInput('50');
                }}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Lv.50
              </button>
            </div>
          </div>

          {/* Generate Rarity Items */}
          <div className="space-y-1">
            <span className="text-slate-400">Generate Item (Lv.{tower.level})</span>
            <div className="grid grid-cols-3 gap-1">
              {RARITY_ORDER.map((rarity) => {
                const cfg = RARITY_CONFIG[rarity];
                return (
                  <button
                    key={rarity}
                    type="button"
                    onClick={() => debugGenerateItem(rarity)}
                    className={`px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border ${cfg.borderColor} ${cfg.textColor} font-medium truncate cursor-pointer`}
                  >
                    + {cfg.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* State & Offline Controls */}
          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800">
            <button
              type="button"
              onClick={toggleAutoCultivation}
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 truncate cursor-pointer"
            >
              Auto: {player.autoCultivation ? 'BẬT' : 'TẮT'}
            </button>
            <button
              type="button"
              onClick={() => debugSimulateOffline(3600)}
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 truncate cursor-pointer"
            >
              Test Offline 1h
            </button>
            <button
              type="button"
              onClick={debugClearInventory}
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-orange-300 truncate cursor-pointer"
            >
              Clear Inventory
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const deviceId = 'debug-device-tester';
                  const auth = await (await fetch('/api/auth/guest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ deviceId }),
                  })).json();
                  const rawSave = localStorage.getItem('vandao_tien_dinh_save_v1');
                  if (rawSave) {
                    await fetch('/api/migration/import', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${auth.token}`,
                      },
                      body: JSON.stringify({ rawSave: JSON.parse(rawSave) }),
                    });
                  }
                  alert('Đã test đồng bộ dữ liệu lên máy chủ thành công!');
                } catch {
                  // ignore
                }
              }}
              className="px-2 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 truncate cursor-pointer"
            >
              Cloud Sync
            </button>
            <button
              type="button"
              onClick={debugResetSave}
              className="col-span-2 px-2 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 flex items-center justify-center gap-1 truncate cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Save</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
