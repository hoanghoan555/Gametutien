import { Bird, Cat, Flame, Shield, Sparkles, Zap } from 'lucide-react';
import React from 'react';
import { BeastId } from '../../types/beast';

interface BeastIconProps {
  id: BeastId;
  size?: number;
  className?: string;
}

export const BeastIcon: React.FC<BeastIconProps> = ({
  id,
  size = 24,
  className = '',
}) => {
  switch (id) {
    case 'thanh_long':
      // Dragon-like emblem (Zap / Sparkles celestial)
      return <Zap size={size} className={className || 'text-emerald-400'} />;
    case 'bach_ho':
      // White Tiger emblem
      return <Cat size={size} className={className || 'text-amber-300'} />;
    case 'chu_tuoc':
      // Vermilion Bird / Phoenix emblem
      return <Bird size={size} className={className || 'text-rose-400'} />;
    case 'huyen_vu':
      // Black Tortoise emblem
      return <Shield size={size} className={className || 'text-sky-400'} />;
    case 'ky_lan':
      // Qilin Holy Flame emblem
      return <Flame size={size} className={className || 'text-orange-400'} />;
    case 'thien_ho':
      // Nine-tailed Celestial Fox emblem
      return <Sparkles size={size} className={className || 'text-purple-400'} />;
    default:
      return <Sparkles size={size} className={className} />;
  }
};
