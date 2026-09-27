import { motion } from 'motion/react';
import React from 'react';
import { RARITY_CONFIG } from '../../data/rarities';
import { useTowerStore } from '../../stores/tower.store';
import { EquipmentIcon } from '../common/EquipmentIcon';

export const LootAnimationLayer: React.FC = () => {
  const { flyingLootItems } = useTowerStore();

  if (flyingLootItems.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {flyingLootItems.map((entry, idx) => {
        const rarityCfg = RARITY_CONFIG[entry.item.rarity];
        const horizontalCurve = idx % 2 === 0 ? -28 : 28;

        return (
          <motion.div
            key={entry.id}
            initial={{
              opacity: 0,
              scale: 0.2,
              x: '-50%',
              y: 80,
            }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.2, 1.18, 1.0, 0.55],
              x: ['-50%', `calc(-50% + ${horizontalCurve}px)`, '-50%'],
              y: [80, 42, 225, 255],
            }}
            transition={{
              duration: 0.88,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{
              left: '50%',
              top: '18%',
            }}
            className="absolute flex flex-col items-center"
          >
            <div
              className={`w-11 h-11 rounded-2xl bg-slate-950/95 border-2 ${rarityCfg.borderColor} flex items-center justify-center shadow-xl`}
              style={{
                boxShadow: `0 0 18px ${rarityCfg.hexColor}66`,
              }}
            >
              <EquipmentIcon
                type={entry.item.type}
                rarity={entry.item.rarity}
                size={24}
              />
            </div>
            <span
              className={`mt-1 px-2 py-0.5 rounded bg-slate-950/90 text-[10px] font-semibold whitespace-nowrap ${rarityCfg.textColor}`}
            >
              {entry.item.name} Lv.{entry.item.level}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
};
