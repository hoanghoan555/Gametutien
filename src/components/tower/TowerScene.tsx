import React from 'react';
import { BeastIcon } from '../beast/BeastIcon';
import { BEAST_CONFIGS } from '../../data/beasts';
import { getRealmInfoForLevel } from '../../data/realms';
import { usePlayerStore } from '../../stores/player.store';
import { useTowerStore } from '../../stores/tower.store';
import { ContributionFloat } from './ContributionFloat';
import { LootAnimationLayer } from './LootAnimationLayer';

const BA_GUA_GLYPHS = ['☰ Càn', '☱ Đoài', '☲ Ly', '☳ Chấn', '☴ Tốn', '☵ Khảm', '☶ Cấn', '☷ Khôn'];

export const TowerScene: React.FC = () => {
  const { tower, cultivate, isCultivatingPulse } = useTowerStore();
  const { player } = usePlayerStore();
  const realmInfo = getRealmInfoForLevel(player.level);

  const activeBeastId = player.beastState?.activeBeastId;
  const activeBeast = activeBeastId ? BEAST_CONFIGS[activeBeastId] : null;
  const activeRecord = activeBeastId
    ? player.beastState?.beasts[activeBeastId]
    : null;

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
      {/* Background Tiên Sơn Mist Clouds */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
        <div className="absolute -top-10 -left-20 w-96 h-48 bg-gradient-to-r from-amber-500/10 via-emerald-500/15 to-transparent blur-3xl animate-mist-drift" />
        <div className="absolute bottom-10 -right-20 w-96 h-48 bg-gradient-to-l from-teal-500/10 via-cyan-500/15 to-transparent blur-3xl animate-mist-drift" style={{ animationDelay: '-11s' }} />
      </div>

      {/* Floating Contribution Numbers */}
      <ContributionFloat />

      {/* Flying Loot Animation Layer */}
      <LootAnimationLayer />

      {/* Upper Zone: The Divine Peak & Immortal Cauldron (Vạn Đạo Tiên Đỉnh) */}
      <div className="relative flex flex-col items-center justify-center mt-1">
        {/* Rotating Ba Gua Ancient Rune Ring */}
        <div className="pointer-events-none absolute w-56 h-56 rounded-full border border-amber-500/20 animate-spin-slow flex items-center justify-center">
          <div className="w-48 h-48 rounded-full border border-dashed border-amber-400/25 animate-spin-reverse-slow" />
          {BA_GUA_GLYPHS.map((glyph, i) => {
            const angle = (i * 360) / BA_GUA_GLYPHS.length;
            return (
              <span
                key={glyph}
                style={{
                  transform: `rotate(${angle}deg) translateY(-108px) rotate(-${angle}deg)`,
                }}
                className="absolute text-[9px] font-display font-bold text-amber-400/50 tracking-wider animate-rune-pulse"
              >
                {glyph}
              </span>
            );
          })}
        </div>

        {/* Spiritual Aura Glow */}
        <div
          className={`pointer-events-none absolute w-44 h-44 rounded-full bg-gradient-to-tr from-amber-500/20 via-emerald-500/20 to-amber-300/15 blur-2xl transition-transform duration-150 ${
            isCultivatingPulse ? 'scale-135 opacity-95' : 'animate-pulse-aura'
          }`}
        />

        {/* Click Shockwave Ripple */}
        {isCultivatingPulse && (
          <div className="pointer-events-none absolute w-36 h-36 rounded-full border-2 border-amber-400/70 animate-ripple" />
        )}

        {/* SVG Divine Floating Peak & Ancient Immortal Cauldron (Tiên Đỉnh) */}
        <div
          className={`relative z-10 transition-transform duration-150 ${
            isCultivatingPulse ? 'scale-105' : 'animate-float-slow'
          }`}
        >
          <svg
            width="196"
            height="196"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_12px_28px_rgba(245,158,11,0.32)]"
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
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="40%" stopColor="#f59e0b" />
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
                <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#10b981" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#047857" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Distant Floating Immortal Peaks */}
            <path
              d="M32 135L52 92L72 135H32Z"
              fill="#1e293b"
              fillOpacity="0.75"
            />
            <path
              d="M128 135L148 88L168 135H128Z"
              fill="#1e293b"
              fillOpacity="0.75"
            />

            {/* Floating Mountain Base (Tiên Sơn) */}
            <path
              d="M48 132H152L134 162L116 150L100 182L84 150L66 162L48 132Z"
              fill="#0f172a"
              stroke="#d97706"
              strokeWidth="1.8"
            />

            {/* Vạn Đạo Tiên Đỉnh (Sacred Cauldron on the Peak) */}
            {/* Cauldron Handles (Tai Đỉnh) */}
            <path
              d="M56 72C42 72 40 52 54 50C62 49 65 58 65 65"
              stroke="url(#peakGrad)"
              strokeWidth="4.2"
              strokeLinecap="round"
            />
            <path
              d="M144 72C158 72 160 52 146 50C138 49 135 58 135 65"
              stroke="url(#peakGrad)"
              strokeWidth="4.2"
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

            {/* Glowing Dao Core on Cauldron */}
            <circle
              cx="100"
              cy="90"
              r="15"
              stroke="url(#jadeGlow)"
              strokeWidth="2.5"
              fill="#064e3b"
              fillOpacity="0.45"
            />
            <path
              d="M100 77V103M87 90H113"
              stroke="#fde047"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Ascending Immortal Qi Flame above Cauldron */}
            <path
              d="M100 22C110 38 120 46 114 58C108 63 92 63 86 58C80 46 90 38 100 22Z"
              fill="url(#jadeGlow)"
            />
            <circle cx="100" cy="44" r="5.5" fill="#fde68a" />

            {/* Cloud Mist Ribbons */}
            <path
              d="M30 140C52 134 74 144 100 138C126 132 148 142 170 136"
              stroke="#94a3b8"
              strokeOpacity="0.45"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Spiritual Qi Stream connecting Tower to Cultivator */}
        <div className="w-0.5 h-7 bg-gradient-to-b from-amber-400/70 via-emerald-400/50 to-transparent" />
      </div>

      {/* Lower Zone: Cultivator Character Meditating */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative flex items-center justify-center">
          {/* Cultivator Aura Circle (Realm Colored) */}
          <div className="pointer-events-none absolute w-20 h-20 rounded-full bg-emerald-500/20 blur-lg animate-pulse-aura" />

          {/* Meditating Cultivator SVG */}
          <div className="w-15 h-15 rounded-2xl bg-slate-900/95 border border-amber-500/40 flex items-center justify-center shadow-[0_0_16px_rgba(16,185,129,0.25)] relative animate-lotus-shimmer">
            <svg
              width="42"
              height="42"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Halo behind head */}
              <circle
                cx="24"
                cy="14"
                r="8.5"
                stroke="#fbbf24"
                strokeOpacity="0.6"
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
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              {/* Crossed Legs */}
              <path
                d="M11 36C15 33 33 33 37 36"
                stroke="#fde68a"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              {/* Lotus Seat Platform */}
              <path
                d="M7 40H41"
                stroke="#f59e0b"
                strokeOpacity="0.75"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>

            {/* Active Spirit Beast Flying Beside Cultivator */}
            {activeBeast && (
              <div
                title={`${activeBeast.name} (Lv.${activeRecord?.level ?? 1}) - ${activeBeast.skillName}`}
                className="absolute -right-12 -top-2 flex flex-col items-center animate-float-slow pointer-events-none"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-950/95 border border-amber-400/70 shadow-[0_0_14px_rgba(245,158,11,0.45)] flex items-center justify-center">
                  <BeastIcon id={activeBeast.id} size={18} />
                </div>
                <span className="text-[8px] font-mono-num font-bold text-amber-300 mt-0.5 whitespace-nowrap bg-slate-950/90 px-1 rounded border border-amber-500/40">
                  +{activeRecord?.level ?? 1}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-1 text-center">
          <span className="text-xs font-semibold text-slate-200 tracking-wide">
            Đạo Hữu · {realmInfo.fullName}
          </span>
        </div>
      </div>
    </div>
  );
};
