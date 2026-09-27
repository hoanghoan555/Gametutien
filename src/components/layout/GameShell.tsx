import React from 'react';
import { RARITY_CONFIG } from '../../data/rarities';
import { useGameStore } from '../../stores/gameStore';
import { formatExactNumber } from '../../utils/number';
import { DebugPanel } from '../common/DebugPanel';
import { OfflineModal } from '../common/OfflineModal';
import { ItemDetail } from '../equipment/ItemDetail';
import { BottomNavigation } from './BottomNavigation';
import { TopStatusBar } from './TopStatusBar';

export const GameShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { toasts } = useGameStore();

  return (
    <div className="relative w-full h-dvh bg-[#05070b] flex items-center justify-center overflow-hidden">
      {/* Subtle Ambient Background on Desktop */}
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(circle at 50% 25%, rgba(217, 169, 78, 0.12), transparent 55%), radial-gradient(circle at 50% 80%, rgba(16, 185, 129, 0.08), transparent 60%)',
        }}
      />

      {/* Portrait 9:16 Mobile Container */}
      <div className="relative w-full max-w-[430px] h-dvh sm:h-[min(94dvh,880px)] bg-[#0b101b] sm:rounded-3xl sm:border sm:border-amber-500/25 shadow-2xl flex flex-col overflow-hidden">
        <TopStatusBar />

        {/* Toast Notification Layer */}
        {toasts.length > 0 && (
          <div className="pointer-events-none absolute top-[78px] left-3 right-3 z-30 flex flex-col items-center gap-1">
            {toasts.map((t) => {
              const rarityColor = t.rarity
                ? RARITY_CONFIG[t.rarity].textColor
                : 'text-amber-200';
              return (
                <div
                  key={t.id}
                  className="px-3 py-1.5 rounded-xl bg-slate-950/90 border border-amber-500/30 shadow-lg text-xs flex items-center gap-2 max-w-full"
                >
                  <span className={`font-medium truncate ${rarityColor}`}>
                    {t.message}
                  </span>
                  {t.powerDelta && t.powerDelta > 0 && (
                    <span className="font-mono-num font-bold text-emerald-400 shrink-0">
                      +{formatExactNumber(t.powerDelta)} Chiến Lực
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Main Active View Content */}
        <main className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
          {children}
        </main>

        <BottomNavigation />
      </div>

      {/* Modals & Dev Tools */}
      <ItemDetail />
      <OfflineModal />
      <DebugPanel />
    </div>
  );
};
