import React from 'react';
import './Animations.css';
import './MapAnimation.css';
import { SvgEmoji } from '../../icons/EmojiIcon';

interface MapPin {
  x: number;
  y: number;
  emoji: string;
  color: string;
  delay: number;
  best?: boolean;
}

// Позиция пользователя и точки мероприятий на карте (координаты viewBox)
const ME = { x: 172, y: 200 };

const PINS: MapPin[] = [
  { x: 72, y: 118, emoji: '🎸', color: '#6c5ce7', delay: 0 },
  { x: 268, y: 104, emoji: '🎨', color: '#ff6b9d', delay: 0.18 },
  { x: 118, y: 196, emoji: '🍕', color: '#ffb020', delay: 0.36 },
  { x: 214, y: 132, emoji: '🎭', color: '#0077ff', delay: 0.54, best: true },
  { x: 300, y: 196, emoji: '⚽', color: '#2ed3b7', delay: 0.72 },
];

const PIN_PATH =
  'M 0 0 C -5 -7 -15 -15 -15 -26 A 15 15 0 1 1 15 -26 C 15 -15 5 -7 0 0 Z';

export const MapAnimation: React.FC = () => {
  return (
    <div className="map-anim-container clean-large-style anim-bleed">
      <svg className="map-svg" viewBox="0 0 360 270" preserveAspectRatio="xMidYMax meet">
        <defs>
          <clipPath id="mapCardClip">
            <rect x="8" y="16" width="344" height="290" rx="26" />
          </clipPath>
          <linearGradient id="mapSweepLin" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#0077ff" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#0077ff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Карточка-карта, уходящая за нижний край */}
        <g className="map-card">
          <rect x="8" y="16" width="344" height="290" rx="26" className="map-card-bg" />

          <g clipPath="url(#mapCardClip)">
            {/* Парк */}
            <path
              className="map-park"
              d="M 20 40 C 70 30 120 44 128 78 C 134 104 96 120 56 112 C 24 106 8 72 20 40 Z"
            />
            {/* Кварталы */}
            <rect className="map-block" x="150" y="36" width="70" height="44" rx="8" />
            <rect className="map-block" x="238" y="36" width="96" height="44" rx="8" />
            <rect className="map-block" x="24" y="140" width="70" height="36" rx="8" />
            <rect className="map-block" x="236" y="150" width="96" height="30" rx="8" />
            <rect className="map-block" x="24" y="220" width="96" height="60" rx="8" />
            <rect className="map-block" x="236" y="220" width="100" height="60" rx="8" />

            {/* Река */}
            <path
              className="map-river"
              d="M -10 250 C 60 230 90 262 150 244 S 250 214 370 238"
              fill="none"
            />

            {/* Улицы */}
            <path className="map-road" d="M 0 128 L 360 128" />
            <path className="map-road" d="M 0 200 C 120 196 240 206 360 198" />
            <path className="map-road" d="M 140 16 L 140 300" />
            <path className="map-road" d="M 228 16 C 222 120 234 200 226 300" />
            <path className="map-road map-road-thin" d="M 20 90 L 340 90" />

            {/* Сканирующий луч алгоритма */}
            <g transform={`translate(${ME.x} ${ME.y})`}>
              <g className="map-sweep">
                <path d="M 0 0 L 0 -210 A 210 210 0 0 1 120 -172 Z" fill="url(#mapSweepLin)" />
              </g>
            </g>

            {/* Линии рекомендаций от пользователя к событиям */}
            {PINS.map((p, i) => (
              <path
                key={`l${i}`}
                className={`map-link ${p.best ? 'is-best' : ''}`}
                style={{ animationDelay: `${p.delay}s` }}
                d={`M ${ME.x} ${ME.y} Q ${(ME.x + p.x) / 2} ${Math.min(ME.y, p.y) - 30} ${p.x} ${p.y}`}
                pathLength={100}
                fill="none"
              />
            ))}
          </g>

          {/* Фильтры-чипсы */}
          <g className="map-chips">
            <rect x="24" y="30" width="78" height="24" rx="12" className="map-chip map-chip-active" />
            <text x="63" y="46" className="map-chip-text map-chip-text-active">Для тебя</text>
            <rect x="108" y="30" width="70" height="24" rx="12" className="map-chip" />
            <text x="143" y="46" className="map-chip-text">Сегодня</text>
            <rect x="184" y="30" width="62" height="24" rx="12" className="map-chip" />
            <text x="215" y="46" className="map-chip-text">Рядом</text>
          </g>
        </g>

        {/* Пины мероприятий */}
        {PINS.map((p, i) => (
          <g key={`p${i}`} transform={`translate(${p.x} ${p.y})`}>
            <g className={`map-pin ${p.best ? 'is-best' : ''}`} style={{ animationDelay: `${p.delay}s` }}>
              <g transform="scale(1.25)">
                {p.best && <circle className="map-best-ring" cx="0" cy="-26" r="22" />}
                <ellipse className="map-pin-shadow" cx="0" cy="1" rx="7" ry="2.5" />
                <path d={PIN_PATH} fill={p.color} stroke="#ffffff" strokeWidth="2.5" />
                <circle cx="0" cy="-26" r="10.5" fill="#ffffff" />
                <SvgEmoji e={p.emoji} cx={0} cy={-26} size={15} />
              </g>
            </g>
          </g>
        ))}

        {/* Бейдж совпадения над лучшим событием */}
        <g transform="translate(214 58)">
          <g className="map-match-badge">
            <rect x="-58" y="-15" width="116" height="28" rx="14" className="map-badge-bg" />
            <SvgEmoji e="✨" cx={-38} cy={-1} size={15} />
            <text x="8" y="4" className="map-badge-text">97% для тебя</text>
          </g>
        </g>

        {/* Пользователь */}
        <g transform={`translate(${ME.x} ${ME.y})`}>
          <circle className="map-me-pulse" r="12" />
          <circle className="map-me-pulse pulse-2" r="12" />
          <circle r="9" fill="#ffffff" />
          <circle r="6.5" fill="var(--max-primary)" />
        </g>
      </svg>
    </div>
  );
};
