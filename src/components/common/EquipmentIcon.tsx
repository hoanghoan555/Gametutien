import React from 'react';
import { RARITY_CONFIG } from '../../data/rarities';
import { EquipmentType, Rarity } from '../../types/item';

interface EquipmentIconProps {
  type: EquipmentType;
  rarity?: Rarity;
  size?: number;
  className?: string;
}

export const EquipmentIcon: React.FC<EquipmentIconProps> = ({
  type,
  rarity = 'white',
  size = 22,
  className = '',
}) => {
  const color = RARITY_CONFIG[rarity].hexColor;

  switch (type) {
    case 'weapon':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={className}
        >
          <path
            d="M19.5 4.5L9 15M19.5 4.5L15 5.5L8 12.5L11.5 16L18.5 9L19.5 4.5Z"
            stroke={color}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.5 13.5L10.5 17.5M5 19L8.5 15.5M3.5 20.5L5.5 18.5"
            stroke={color}
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'helmet':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={className}
        >
          <path
            d="M12 3L15 7H9L12 3Z"
            stroke={color}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M5 14C5 9.5 8 7 12 7C16 7 19 9.5 19 14V18L16 16.5V14H8V16.5L5 18V14Z"
            stroke={color}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'armor':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={className}
        >
          <path
            d="M8 4L12 7L16 4L20 7.5L18 11L16 9.5V20H8V9.5L6 11L4 7.5L8 4Z"
            stroke={color}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M12 7V20"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'boots':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={className}
        >
          <path
            d="M8 4H14V13L19 16.5V19.5H6V15L8 12V4Z"
            stroke={color}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M6 19.5H19"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'ring':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={className}
        >
          <circle
            cx="12"
            cy="14"
            r="6"
            stroke={color}
            strokeWidth="1.8"
          />
          <path
            d="M9.5 8L12 4.5L14.5 8L12 9.5L9.5 8Z"
            stroke={color}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'artifact':
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={className}
        >
          <path
            d="M12 3L19 8.5L16.5 19H7.5L5 8.5L12 3Z"
            stroke={color}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="11.5" r="2.5" stroke={color} strokeWidth="1.6" />
        </svg>
      );
  }
};
