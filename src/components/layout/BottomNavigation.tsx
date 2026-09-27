import { Backpack, Compass, Mountain, User } from 'lucide-react';
import React from 'react';
import { useGameStore } from '../../stores/gameStore';
import { MAX_INVENTORY_SLOTS } from '../../systems/equipment';
import { NavigationTab } from '../../types/game';

export const BottomNavigation: React.FC = () => {
  const { activeTab, setActiveTab, player } = useGameStore();

  const navItems: Array<{
    id: NavigationTab;
    label: string;
    icon: React.ReactNode;
    subtext?: string;
  }> = [
    {
      id: 'tower',
      label: 'Tiên Đỉnh',
      icon: <Mountain className="w-5 h-5" />,
    },
    {
      id: 'character',
      label: 'Nhân Vật',
      icon: <User className="w-5 h-5" />,
    },
    {
      id: 'inventory',
      label: 'Túi Đồ',
      icon: <Backpack className="w-5 h-5" />,
      subtext: `${player.inventory.length}/${MAX_INVENTORY_SLOTS}`,
    },
    {
      id: 'beast',
      label: 'Linh Thú',
      icon: <Compass className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      className="shrink-0 bg-[#0a0e18]/95 backdrop-blur-md border-t border-amber-500/20 px-2 py-1.5 z-20"
      aria-label="Điều hướng chính"
    >
      <div className="grid grid-cols-4 gap-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`min-h-[48px] py-1 px-2 rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/35'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <div className="relative flex items-center justify-center">
                {item.icon}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[11px] font-medium tracking-tight">
                  {item.label}
                </span>
                {item.subtext && (
                  <span className="text-[10px] font-mono-num text-slate-400">
                    ({item.subtext})
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
