import React from 'react';
import './Animations.css';
import './PartyAnimation.css';

interface Dancer {
  x: number;
  y: number;
  scale: number;
  color: string;
  arms: 'up' | 'wave' | 'none';
  beat: number;
  delay: number;
  back?: boolean;
}

// Толпа: задний ряд мельче и бледнее, передний — крупнее и ярче.
// Тела уходят ниже viewBox, поэтому толпа «растёт» прямо из нижнего края.
const DANCERS: Dancer[] = [
  { x: 42, y: 214, scale: 0.78, color: '#6c5ce7', arms: 'wave', beat: 0.52, delay: 0.1, back: true },
  { x: 112, y: 206, scale: 0.74, color: '#2ed3b7', arms: 'up', beat: 0.48, delay: 0.3, back: true },
  { x: 250, y: 206, scale: 0.74, color: '#ff7a45', arms: 'none', beat: 0.5, delay: 0.2, back: true },
  { x: 320, y: 214, scale: 0.78, color: '#0077ff', arms: 'up', beat: 0.46, delay: 0.05, back: true },
  { x: 78, y: 236, scale: 1, color: '#ff6b9d', arms: 'up', beat: 0.5, delay: 0 },
  { x: 180, y: 230, scale: 1.08, color: '#0077ff', arms: 'wave', beat: 0.5, delay: 0.25 },
  { x: 282, y: 236, scale: 1, color: '#ffb020', arms: 'up', beat: 0.5, delay: 0.12 },
];

const CONFETTI = [
  { x: 30, c: '#ff6b9d', d: 0, s: 3.4, r: 'rect' },
  { x: 70, c: '#ffb020', d: 1.2, s: 4.1, r: 'circle' },
  { x: 110, c: '#2ed3b7', d: 0.6, s: 3.8, r: 'rect' },
  { x: 150, c: '#6c5ce7', d: 2.1, s: 4.4, r: 'rect' },
  { x: 205, c: '#0077ff', d: 0.3, s: 3.6, r: 'circle' },
  { x: 240, c: '#ff7a45', d: 1.7, s: 4.2, r: 'rect' },
  { x: 280, c: '#ff6b9d', d: 0.9, s: 3.9, r: 'rect' },
  { x: 320, c: '#ffb020', d: 2.5, s: 4.6, r: 'circle' },
  { x: 345, c: '#2ed3b7', d: 1.4, s: 3.7, r: 'rect' },
  { x: 12, c: '#0077ff', d: 2.8, s: 4.3, r: 'circle' },
];

// Векторные ноты вместо текстовых символов ♪ ♫
const NoteSingle: React.FC = () => (
  <>
    <rect x="6.2" y="0" width="2" height="14" rx="1" />
    <ellipse cx="4" cy="14.5" rx="4.2" ry="3" transform="rotate(-20 4 14.5)" />
    <path d="M8.2 0q6 2.2 6 8.5-1.8-3.4-6-4z" />
  </>
);

const NoteDouble: React.FC = () => (
  <>
    <rect x="6.2" y="2" width="2" height="13" rx="1" />
    <rect x="18.2" y="0" width="2" height="13" rx="1" />
    <path d="M6.2 2l14-2v3.6l-14 2z" />
    <ellipse cx="4" cy="15.5" rx="4.2" ry="3" transform="rotate(-20 4 15.5)" />
    <ellipse cx="16" cy="13.5" rx="4.2" ry="3" transform="rotate(-20 16 13.5)" />
  </>
);

const Person: React.FC<{ d: Dancer }> = ({ d }) => (
  <g transform={`translate(${d.x} ${d.y}) scale(${d.scale})`} opacity={d.back ? 0.55 : 1}>
    <g
      className="party-dancer"
      style={{ animationDuration: `${d.beat}s`, animationDelay: `${d.delay}s` }}
    >
      {d.arms !== 'none' && (
        <>
          <path
            className={`party-arm party-arm-l ${d.arms === 'wave' ? 'is-wave' : ''}`}
            style={{ animationDelay: `${d.delay}s` }}
            d="M -15 30 L -28 -6"
            stroke={d.color}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            className={`party-arm party-arm-r ${d.arms === 'wave' ? 'is-wave' : ''}`}
            style={{ animationDelay: `${d.delay + 0.25}s` }}
            d="M 15 30 L 28 -6"
            stroke={d.color}
            strokeWidth="8"
            strokeLinecap="round"
          />
        </>
      )}
      <path d="M -26 90 L -26 44 Q -26 20 0 20 Q 26 20 26 44 L 26 90 Z" fill={d.color} />
      <circle cx="0" cy="0" r="15" fill={d.color} />
      <circle cx="-5" cy="-4" r="4" fill="#ffffff" opacity="0.35" />
    </g>
  </g>
);

export const PartyAnimation: React.FC = () => {
  return (
    <div className="party-anim-container clean-large-style anim-bleed">
      <svg className="party-svg" viewBox="0 0 360 320" preserveAspectRatio="xMidYMax meet">
        <defs>
          <linearGradient id="partyBeamA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6c5ce7" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#6c5ce7" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="partyBeamB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0077ff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0077ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="partyBeamC" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff6b9d" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ff6b9d" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="partyFloor" cx="50%" cy="100%" r="60%">
            <stop offset="0%" stopColor="#6c5ce7" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#6c5ce7" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="partyBall" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#c9d6ea" />
            <stop offset="100%" stopColor="#7d8aa3" />
          </radialGradient>
          <clipPath id="partyBallClip">
            <circle cx="180" cy="62" r="25" />
          </clipPath>
        </defs>

        {/* Свечение танцпола */}
        <ellipse className="party-floor-glow" cx="180" cy="320" rx="210" ry="130" fill="url(#partyFloor)" />

        {/* Прожекторы */}
        <polygon className="party-beam beam-a" points="20,0 -40,320 80,320" fill="url(#partyBeamA)" />
        <polygon className="party-beam beam-b" points="340,0 280,320 400,320" fill="url(#partyBeamB)" />
        <polygon className="party-beam beam-c" points="180,62 110,320 250,320" fill="url(#partyBeamC)" />

        {/* Диско-шар */}
        <g className="party-ball-swing">
          <line x1="180" y1="0" x2="180" y2="37" stroke="var(--max-text-secondary)" strokeWidth="1.5" />
          <circle cx="180" cy="62" r="25" fill="url(#partyBall)" />
          <g clipPath="url(#partyBallClip)">
            <g className="party-ball-facets">
              {Array.from({ length: 12 }).map((_, i) => (
                <line
                  key={`v${i}`}
                  x1={140 + i * 8}
                  y1="30"
                  x2={140 + i * 8}
                  y2="95"
                  stroke="#ffffff"
                  strokeOpacity="0.7"
                  strokeWidth="1"
                />
              ))}
            </g>
            {[44, 52, 60, 68, 76, 84].map((y) => (
              <line key={`h${y}`} x1="150" y1={y} x2="210" y2={y} stroke="#6f7c94" strokeOpacity="0.45" strokeWidth="1" />
            ))}
          </g>
          <circle cx="172" cy="53" r="4" fill="#ffffff" opacity="0.9" />
        </g>

        {/* Блики вокруг шара */}
        {[
          { x: 138, y: 44, d: 0 },
          { x: 226, y: 38, d: 0.7 },
          { x: 216, y: 96, d: 1.3 },
          { x: 146, y: 98, d: 1.9 },
        ].map((s, i) => (
          <path
            key={i}
            className="party-sparkle"
            style={{ animationDelay: `${s.d}s` }}
            transform={`translate(${s.x} ${s.y})`}
            d="M 0 -7 L 1.6 -1.6 L 7 0 L 1.6 1.6 L 0 7 L -1.6 1.6 L -7 0 L -1.6 -1.6 Z"
            fill="#ffb020"
          />
        ))}

        {/* Конфетти */}
        {CONFETTI.map((c, i) =>
          c.r === 'rect' ? (
            <rect
              key={i}
              className="party-confetti"
              style={{ animationDelay: `${c.d}s`, animationDuration: `${c.s}s` }}
              x={c.x}
              y="-10"
              width="6"
              height="10"
              rx="1.5"
              fill={c.c}
            />
          ) : (
            <circle
              key={i}
              className="party-confetti"
              style={{ animationDelay: `${c.d}s`, animationDuration: `${c.s}s` }}
              cx={c.x}
              cy="-8"
              r="3.5"
              fill={c.c}
            />
          )
        )}

        {/* Ноты */}
        <g transform="translate(36 190)">
          <g className="party-note note-1" fill="#6c5ce7">
            <NoteSingle />
          </g>
        </g>
        <g transform="translate(306 180)">
          <g className="party-note note-2" fill="#ff6b9d">
            <NoteDouble />
          </g>
        </g>
        <g transform="translate(226 198) scale(0.85)">
          <g className="party-note note-3" fill="#0077ff">
            <NoteSingle />
          </g>
        </g>

        {/* Толпа */}
        {DANCERS.map((d, i) => (
          <Person key={i} d={d} />
        ))}
      </svg>
    </div>
  );
};
