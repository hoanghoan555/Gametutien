import { Trophy, Flame, Swords, X, Sparkles, RefreshCw, Crown } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { LeaderboardData, LeaderboardEntry } from '../../../server/src/store/types';
import { getRealmInfoForLevel } from '../../data/realms';
import { fetchLeaderboard, connectMultiplayerWebSocket } from '../../services/multiplayerApi';
import { useGameStore } from '../../stores/gameStore';
import { formatNumber, formatExactNumber } from '../../utils/number';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose }) => {
  const { player, tower } = useGameStore();
  const [activeTab, setActiveTab] = useState<'contribution' | 'power'>('contribution');
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [recentTicker, setRecentTicker] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchLeaderboard();
      setData(res);
      setOnlineCount(res.totalCultivators || 6);
    } catch {
      // Fallback local data if server offline
      const myRealm = getRealmInfoForLevel(player.level);
      const myEntry: LeaderboardEntry = {
        rank: 1,
        userId: 'me',
        name: 'Đạo Hữu (Bản Thân)',
        contribution: player.contribution,
        power: player.power,
        realmName: myRealm.realm.name,
        realmLayer: myRealm.layer,
        level: player.level,
      };
      setData({
        topContribution: [myEntry],
        topPower: [myEntry],
        globalTower: {
          level: tower.level,
          currentExp: tower.currentExp,
          expToNextLevel: tower.expToNextLevel,
          totalCultivations: tower.totalCultivations,
        },
        totalCultivators: 1,
        myRank: { contributionRank: 1, powerRank: 1 },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadData();

    const disconnect = connectMultiplayerWebSocket({
      onConnected: (count) => setOnlineCount(count),
      onPresence: (count) => setOnlineCount(count),
      onTowerUpdate: (towerState, count, recent) => {
        setOnlineCount(count);
        if (recent) {
          setRecentTicker(`${recent.contributorName} vừa cống hiến +${recent.exp} EXP cho Tiên Đỉnh!`);
        }
        setData((prev) => (prev ? { ...prev, globalTower: towerState } : prev));
      },
      onMilestone: (milestone) => {
        setRecentTicker(`🎉 ${milestone.message}`);
        loadData();
      },
    });

    return () => {
      disconnect();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentList = activeTab === 'contribution' ? data?.topContribution : data?.topPower;
  const currentTower = data?.globalTower ?? tower;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[390px] max-h-[84dvh] flex flex-col rounded-2xl bg-gradient-to-b from-[#121827] via-[#0b101b] to-[#060911] border border-amber-500/30 shadow-2xl shadow-amber-950/40 text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Sticky) */}
        <div className="shrink-0 px-3.5 py-2.5 border-b border-amber-500/20 bg-[#0d1424]/90 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-display font-bold text-amber-300 tracking-wide text-sm leading-tight">
                  BẢNG PHONG THẦN
                </h3>
                <span className="flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {onlineCount} Online
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5">
                Lục Giới Chí Tôn · Vạn Đạo Đồng Tu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Làm mới bảng xếp hạng"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-red-950/80 hover:text-red-300 text-slate-400 transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Tiên Đỉnh Info Strip */}
        <div className="shrink-0 mx-3 mt-2 p-2 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-900/80 to-purple-950/40 border border-amber-500/25 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[9px] text-amber-400 font-medium uppercase tracking-wider leading-none">
                Vạn Đạo Tiên Đỉnh
              </div>
              <div className="text-xs font-bold text-amber-200 mt-0.5 leading-none">
                Cấp {currentTower.level} · {formatExactNumber(currentTower.totalCultivations)} Khai Đỉnh
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[9px] text-slate-400 leading-none">Tiến Độ</div>
            <div className="text-xs font-mono text-amber-300 font-bold leading-none mt-0.5">
              {Math.min(100, Math.round((currentTower.currentExp / Math.max(1, currentTower.expToNextLevel)) * 100))}%
            </div>
          </div>
        </div>

        {/* Realtime Live Ticker */}
        {recentTicker && (
          <div className="shrink-0 mx-3 mt-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-500/25 text-[10px] text-emerald-300 truncate">
            ⚡ {recentTicker}
          </div>
        )}

        {/* Tabs */}
        <div className="shrink-0 grid grid-cols-2 gap-1 p-1 mx-3 mt-2 rounded-xl bg-slate-950/80 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('contribution')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer ${
              activeTab === 'contribution'
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <Flame className="w-3 h-3" />
            Top Cống Hiến
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('power')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer ${
              activeTab === 'power'
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <Swords className="w-3 h-3" />
            Top Chiến Lực
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1.5 custom-scrollbar">
          {loading && !currentList ? (
            <div className="flex flex-col items-center justify-center h-36 text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin text-amber-400 mb-2" />
              Đang tiếp nhận ý niệm từ Thiên Địa...
            </div>
          ) : !currentList || currentList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-36 text-slate-500 text-xs">
              Chưa có đạo hữu nào ghi danh trên bảng
            </div>
          ) : (
            currentList.map((entry) => renderRow(entry, activeTab))
          )}
        </div>

        {/* Sticky Footer: My Position */}
        <div className="shrink-0 p-2.5 bg-[#080d17] border-t border-amber-500/20 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Vị thế của bạn:</span>
          <div className="flex items-center gap-2">
            <span className="text-amber-300 font-medium">
              Cống Hiến: <span className="font-mono font-bold text-amber-200">#{data?.myRank?.contributionRank ?? 1}</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-300 font-medium">
              Chiến Lực: <span className="font-mono font-bold text-amber-200">#{data?.myRank?.powerRank ?? 1}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

function renderRow(entry: LeaderboardEntry, tab: 'contribution' | 'power') {
  const isTop1 = entry.rank === 1;
  const isTop2 = entry.rank === 2;
  const isTop3 = entry.rank === 3;

  let rankBadge = (
    <div className="w-6 h-6 rounded-md bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-[11px] font-mono text-slate-300 font-bold shrink-0">
      {entry.rank}
    </div>
  );

  let borderCard = 'border-slate-800/80 bg-slate-900/40';

  if (isTop1) {
    rankBadge = (
      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 flex items-center justify-center shadow-sm shrink-0">
        <Crown className="w-3.5 h-3.5 fill-current" />
      </div>
    );
    borderCard = 'border-amber-500/50 bg-gradient-to-r from-amber-950/30 via-slate-900/80 to-amber-950/20 shadow-sm';
  } else if (isTop2) {
    rankBadge = (
      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 flex items-center justify-center font-mono text-[11px] font-black shrink-0">
        2
      </div>
    );
    borderCard = 'border-slate-400/40 bg-slate-900/60';
  } else if (isTop3) {
    rankBadge = (
      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100 flex items-center justify-center font-mono text-[11px] font-bold shrink-0">
        3
      </div>
    );
    borderCard = 'border-amber-800/40 bg-slate-900/60';
  }

  return (
    <div
      key={`${entry.userId}-${entry.rank}`}
      className={`flex items-center justify-between p-2 rounded-xl border ${borderCard} transition-all`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {rankBadge}

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-xs text-slate-100 truncate max-w-[130px]">
              {entry.name}
            </span>
            {isTop1 && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 leading-none shrink-0">
                Tiên Tôn
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1 leading-none mt-0.5">
            <span className="text-purple-300">{entry.realmName} T.{entry.realmLayer}</span>
            <span>·</span>
            <span>Cấp {entry.level}</span>
          </div>
        </div>
      </div>

      <div className="text-right shrink-0">
        {tab === 'contribution' ? (
          <div>
            <div className="text-[9px] text-amber-400/80 font-medium leading-none">Cống Hiến</div>
            <div className="text-xs font-mono text-amber-300 font-bold mt-0.5 leading-none">
              {formatNumber(entry.contribution)}
            </div>
          </div>
        ) : (
          <div>
            <div className="text-[9px] text-amber-400/80 font-medium leading-none">Chiến Lực</div>
            <div className="text-xs font-mono text-amber-300 font-bold mt-0.5 leading-none">
              {formatExactNumber(entry.power)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
