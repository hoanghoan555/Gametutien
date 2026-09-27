import React from 'react';
import { RARITY_CONFIG } from '../../data/rarities';
import { Rarity } from '../../types/item';

interface RarityBadgeProps {
  rarity: Rarity;
  fullText?: boolean;
  className?: string;
}

export const RarityBadge: React.FC<RarityBadgeProps> = ({
  rarity,
  fullText = false,
  className = '',
}) => {
  const cfg = RARITY_CONFIG[rarity];
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold tracking-wide ${cfg.textColor} ${className}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: cfg.hexColor }}
        aria-hidden="true"
      />
      <span>{fullText ? cfg.fullName : cfg.name}</span>
    </span>
  );
};
