import React from 'react';
import { useTowerStore } from '../../stores/tower.store';

export const TowerHeader: React.FC = () => {
  const { tower } = useTowerStore();

  return (
    <div className="text-center space-y-0.5">
      <div className="text-[11px] tracking-widest text-amber-400/80 font-medium">
        THÁI CỔ THẦN VẬT
      </div>
      <h1 className="font-display text-2xl font-bold tracking-wide text-amber-100">
        Vạn Đạo Tiên Đỉnh · Lv.{tower.level}
      </h1>
      <p className="text-xs text-slate-400">
        Pháp bảo sinh ra từ Đỉnh mang cấp độ{' '}
        <span className="font-mono-num text-amber-300 font-semibold">
          Lv.{tower.level}
        </span>
      </p>
    </div>
  );
};
