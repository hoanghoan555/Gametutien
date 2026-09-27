import React from 'react';
import { getRealmInfoForLevel } from '../../data/realms';
import { usePlayerStore } from '../../stores/player.store';
import { useTowerStore } from '../../stores/tower.store';
import { ContributionFloat } from './ContributionFloat';
import { LootAnimationLayer } from './LootAnimationLayer';

export const TowerScene: React.FC = () => {
  const { tower, cultivate, isCultivatingPulse } = useTowerStore();
  const { player } = usePlayerStore();
  const realmInfo = getRealmInfoForLevel(player.level);

  return (
    <div
      onClick={cultivate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          cultivate();
        }
      }}
      aria-label="Khai Đỉnh nhận EXP và Pháp Bảo"
      className="relative flex-1 w-full flex flex-col items-center justify-between py-2 overflow-hidden cursor-pointer select-none group"
    >
      {/* Floating Contribution Numbers */}
      <ContributionFloat />

      {/* Flying Loot Animation Layer */}
      <LootAnimationLayer />

      {/* Upper Zone: The Divine Peak & Immortal Cauldron (Vạn Đạo Tiên Đỉnh) */}
      <div className="relative flex flex-col items-center justify-center mt-1">
        {/* Rotating Talismanic Rune Ring */}
        <div className="pointer-events-none absolute w-52 h-52 rounded-full border border-amber-500/20 animate-spin-slow flex items-center justify-center">
          <div className="w-44 h-44 rounded-full border border-dashed border-amber-400/25 animate-spin-reverse-slow" />
        </div>

        {/* Spiritual Aura Glow */}
        <div
          className={`pointer-events-none absolute w-40 h-40 rounded-full bg-amber-500/15 blur-2xl transition-transform duration-150 ${
            isCultivatingPulse ? 'scale-125 opacity-90' : 'animate-pulse-aura'
          }`}
        />

        {/* SVG Divine Floating Peak & Ancient Immortal Cauldron (Tiên Đỉnh) */}
        <div
          className={`relative z-10 transition-transform duration-150 ${
            isCultivatingPulse ? 'scale-105' : 'animate-float-slow'
          }`}
        >
          <svg
            width="188"
            height="188"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_10px_25px_rgba(245,158,11,0.28)]"
          >
            <defs>
              <linearGradient
                id="peakGrad"
                x1="100"
                y1="20"
                x2="100"
                y2="185"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="45%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#451a03" />
              </linearGradient>
              <linearGradient
                id="jadeGlow"
                x1="60"
                y1="40"
                x2="140"
                y2="140"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Distant Floating Immortal Peaks */}
            <path
              d="M32 135L52 92L72 135H32Z"
              fill="#1e293b"
              fillOpacity="0.65"
            />
            <path
              d="M128 135L148 88L168 135H128Z"
              fill="#1e293b"
              fillOpacity="0.65"
            />

            {/* Floating Mountain Base (Tiên Sơn) */}
            <path
              d="M48 132H152L134 162L116 150L100 182L84 150L66 162L48 132Z"
              fill="#0f172a"
              stroke="#b45309"
              strokeWidth="1.5"
            />

            {/* Vạn Đạo Tiên Đỉnh (Sacred Cauldron on the Peak) */}
            {/* Cauldron Handles (Tai Đỉnh) */}
            <path
              d="M56 72C42 72 40 52 54 50C62 49 65 58 65 65"
              stroke="url(#peakGrad)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M144 72C158 72 160 52 146 50C138 49 135 58 135 65"
              stroke="url(#peakGrad)"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Cauldron Legs (Chân Đỉnh) */}
            <path
              d="M74 114L66 134M126 114L134 134M100 116V136"
              stroke="url(#peakGrad)"
              strokeWidth="4.5"
              strokeLinecap="round"
            />

            {/* Cauldron Body (Thân Đỉnh) */}
            <path
              d="M62 64H138L132 102C130 114 116 120 100 120C84 120 70 114 68 102L62 64Z"
              fill="#1c1917"
              stroke="url(#peakGrad)"
              strokeWidth="3"
            />

            {/* Glowing Dao Runes on Cauldron */}
            <circle
              cx="100"
              cy="90"
              r="14"
              stroke="url(#jadeGlow)"
              strokeWidth="2"
            />
            <path
              d="M100 79V101M89 90H111"
              stroke="#fbbf24"
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            {/* Ascending Immortal Qi Flame above Cauldron */}
            <path
              d="M100 24C109 38 118 46 112 58C106 62 94 62 88 58C82 46 91 38 100 24Z"
              fill="url(#jadeGlow)"
            />
            <circle cx="100" cy="46" r="5" fill="#fde68a" />

            {/* Cloud Mist Ribbons */}
            <path
              d="M30 140C52 134 74 144 100 138C126 132 148 142 170 136"
              stroke="#94a3b8"
              strokeOpacity="0.35"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Subtle Spiritual Stream connecting Tower to Cultivator */}
        <div className="w-0.5 h-8 bg-gradient-to-b from-amber-400/60 via-emerald-400/40 to-transparent" />
      </div>

      {/* Lower Zone: Cultivator Character Meditating */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative flex items-center justify-center">
          {/* Cultivator Aura Circle */}
          <div className="pointer-events-none absolute w-16 h-16 rounded-full bg-emerald-500/15 blur-md animate-pulse-aura" />

          {/* Meditating Cultivator SVG */}
          <div className="w-14 h-14 rounded-2xl bg-slate-900/90 border border-amber-500/35 flex items-center justify-center shadow-lg">
            <svg
              width="38"
              height="38"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Halo behind head */}
              <circle
                cx="24"
                cy="14"
                r="8"
                stroke="#fbbf24"
                strokeOpacity="0.45"
                strokeWidth="1.5"
              />
              {/* Head & Daoist Topknot */}
              <circle cx="24" cy="14" r="4.5" fill="#fde68a" />
              <path
                d="M22 8.5H26L25 6H23L22 8.5Z"
                fill="#f59e0b"
              />
              {/* Meditating Lotus Robe Body */}
              <path
                d="M14 34C14 25 18 20 24 20C30 20 34 25 34 34"
                stroke="#34d399"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Crossed Legs */}
              <path
                d="M11 36C15 33 33 33 37 36"
                stroke="#fde68a"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Lotus Seat Platform */}
              <path
                d="M8 40H40"
                stroke="#f59e0b"
                strokeOpacity="0.6"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        <div className="mt-1 text-center">
          <span className="text-xs font-medium text-slate-300">
            Đạo Hữu · {realmInfo.fullName}
          </span>
        </div>
      </div>
    </div>
  );
};
