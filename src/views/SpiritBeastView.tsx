import { Sparkles } from 'lucide-react';
import React from 'react';
import { RARITY_CONFIG, RARITY_ORDER } from '../data/rarities';
import { RarityBadge } from '../components/common/RarityBadge';
import { useTowerStore } from '../stores/tower.store';

export const SpiritBeastView: React.FC = () => {
  const { tower } = useTowerStore();

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4 custom-scrollbar">
      {/* Spirit Beast Sanctuary Preview (Section 3.2) */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-amber-500/25 text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-300">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="font-display text-xl font-bold text-amber-100">
          Linh Thú Tiên Uyển
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Hệ thống ấp trứng Linh Thú & Huyết Mạch Thượng Cổ đang được phong ấn
          trong phiên bản MVP 0.1. Hãy tiếp tục Khai Đỉnh nâng cấp Vạn Đạo Tiên
          Đỉnh để chuẩn bị đón Tiên Thú xuất thế!
        </p>
      </div>

      {/* Tower Loot Codex & Rarity Table (Section 7.2 & 7.3) */}
      <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/90 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-200 tracking-wide">
            Phẩm Chất Pháp Bảo Vạn Đạo Đỉnh
          </h3>
          <span className="text-xs font-mono-num text-amber-300">
            Cấp Rơi Hiện Tại: Lv.{tower.level}
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Cấp độ trang bị sinh ra luôn bằng đúng cấp độ hiện tại của Vạn Đạo
          Tiên Đỉnh (<strong className="text-slate-200">Lv.{tower.level}</strong>
          ). Phẩm chất quyết định hệ số thuộc tính và số dòng cộng thêm:
        </p>

        <div className="divide-y divide-slate-800/70 text-xs">
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
      </div>
    </div>
  );
};
