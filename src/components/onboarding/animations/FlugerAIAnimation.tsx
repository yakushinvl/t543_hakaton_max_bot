import React from 'react';
import './Animations.css';
import './FlugerAIAnimation.css';
import { EmojiIcon, EmojiText } from '../../icons/EmojiIcon';

export type FlugerVaneMode = 'idle' | 'thinking' | 'result' | 'demo';

export interface FlugerAIAnimationProps {
  /** idle — покачивается на ветру, thinking — крутится и думает,
   *  result — останавливается на compassAngle, demo — цикл «думает → нашёл» для онбординга */
  mode?: FlugerVaneMode;
  /** compact — уменьшенный флюгер для нижней части экранов вопросов/результатов */
  size?: 'full' | 'compact';
  compassAngle?: number;
  /** Смена значения заставляет стрелку коротко крутануться (реакция на ответ) */
  nudgeKey?: string | number;
  className?: string;
}

// Траектории порывов в координатах сцены ветра (мачта флюгера — x=220, стрелка — y≈84)
const GUSTS = [
  // Верхний порыв закручивается в петлю перед флюгером
  { d: 'M -30 70 C 50 50 110 96 160 80 C 192 70 204 44 184 36 C 164 30 154 56 176 64 C 222 82 300 56 470 72', dur: 3.4, shift: 0 },
  // Нижний — плавная волна у розы ветров
  { d: 'M -30 158 C 70 136 150 182 250 156 S 390 124 470 146', dur: 4.2, shift: 0.3 },
  // Средний — петля уже после флюгера
  { d: 'M -30 116 C 90 104 200 126 282 108 C 322 99 340 74 320 66 C 300 60 292 84 314 92 C 352 104 402 98 470 94', dur: 3.8, shift: 0.6 },
];

const PARTICLES: { kind: 'leaf' | 'spark' | 'dot'; gust: number; dur: number; begin: number; color: string }[] = [
  { kind: 'leaf', gust: 0, dur: 4.2, begin: 0, color: '#5bbd5e' },
  { kind: 'leaf', gust: 2, dur: 4.8, begin: 2.2, color: '#ffb020' },
  { kind: 'spark', gust: 0, dur: 3.6, begin: 1.6, color: '#ffc53d' },
  { kind: 'dot', gust: 1, dur: 5, begin: 0.8, color: '#8fb4ff' },
  { kind: 'leaf', gust: 1, dur: 5.4, begin: 3.4, color: '#7ccf6e' },
  { kind: 'spark', gust: 2, dur: 4.2, begin: 0.4, color: '#ff8fb1' },
];

/**
 * Стрелка вращается вокруг вертикальной оси (rotateY), и при ~90° она становится ребром
 * к зрителю и пропадает. Сжимаем направление в диапазон ±54° вокруг «влево/вправо»,
 * чтобы стрелка на экране результата всегда была хорошо видна.
 */
const toVisibleAngle = (angle: number) => {
  const a = ((angle % 360) + 360) % 360;
  const base = a < 180 ? 0 : 180;
  return base + ((a % 180) - 90) * 0.6;
};

const DEMO_CHIPS = [
  { text: '🎭 Иммерсивный театр', cls: 'chip-left-top' },
  { text: '🎷 Джаз на крыше', cls: 'chip-right-top' },
  { text: '☕ Кофе-дегустация', cls: 'chip-left-bottom' },
];

export const FlugerAIAnimation: React.FC<FlugerAIAnimationProps> = ({
  mode = 'idle',
  size = 'full',
  compassAngle = 45,
  nudgeKey,
  className = '',
}) => {
  const style = { '--fv-angle': `${toVisibleAngle(compassAngle)}deg` } as React.CSSProperties;
  // Во время «раздумий» ветер дует заметно сильнее
  const speed = mode === 'thinking' || mode === 'demo' ? 0.45 : mode === 'result' ? 1.3 : 1;

  return (
    <div
      className={`fv-root fv-mode-${mode} fv-size-${size} ${className}`.trim()}
      style={style}
      aria-hidden="true"
    >
      {/* Сцена флюгера фиксированного размера (масштабируется для compact) */}
      <div className="fv-stage">
        {/* Ветер: порывы с завитками летят вдоль траекторий и уносят листья и искры */}
        <svg className="fv-wind" viewBox="0 0 440 270">
          {GUSTS.map((g, i) => (
            <g key={i}>
              <path className="fv-gust-trace" d={g.d} />
              <path
                className="fv-gust"
                d={g.d}
                pathLength={100}
                style={{ animationDuration: `${g.dur * speed}s`, animationDelay: `${-g.shift * g.dur}s` }}
              />
              <path
                className="fv-gust fv-gust-thin"
                d={g.d}
                pathLength={100}
                style={{ animationDuration: `${g.dur * speed}s`, animationDelay: `${-(g.shift + 0.45) * g.dur}s` }}
              />
            </g>
          ))}

          {PARTICLES.map((p, i) => (
            <g key={`p${i}`} opacity="0">
              {p.kind === 'leaf' ? (
                <path d="M -8 0 Q 0 -6.5 8 0 Q 0 6.5 -8 0 Z M -8 0 L -11 -1" fill={p.color} stroke={p.color} strokeWidth="1" strokeLinecap="round" />
              ) : p.kind === 'spark' ? (
                <path d="M 0 -4.5 Q 0 0 4.5 0 Q 0 0 0 4.5 Q 0 0 -4.5 0 Q 0 0 0 -4.5 Z" fill={p.color} />
              ) : (
                <circle r="2.2" fill={p.color} />
              )}
              <animateMotion
                path={GUSTS[p.gust].d}
                dur={`${p.dur * speed}s`}
                begin={`${-p.begin * speed}s`}
                repeatCount="indefinite"
                rotate="auto"
              />
              {p.kind === 'leaf' && (
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="0;40;-30;0"
                  dur="1.4s"
                  repeatCount="indefinite"
                  additive="sum"
                />
              )}
              <animate
                attributeName="opacity"
                values="0;1;1;0"
                keyTimes="0;0.12;0.85;1"
                dur={`${p.dur * speed}s`}
                begin={`${-p.begin * speed}s`}
                repeatCount="indefinite"
              />
            </g>
          ))}
        </svg>

        <svg className="fv-base" viewBox="0 0 200 270">
          <defs>
            <radialGradient id="fvGround" cx="50%" cy="100%" r="50%">
              <stop offset="0%" stopColor="#0077ff" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0077ff" stopOpacity="0" />
            </radialGradient>
          </defs>

          <ellipse className="fv-ground" cx="100" cy="270" rx="90" ry="34" fill="url(#fvGround)" />

          {/* Мачта: рисуется снизу вверх прямо из нижнего края */}
          <line className="fv-mast" x1="100" y1="272" x2="100" y2="60" pathLength={1} />

          {/* Роза ветров в перспективе */}
          <g className="fv-cross">
            <line x1="52" y1="152" x2="148" y2="152" className="fv-cross-arm" />
            <line x1="84" y1="164" x2="116" y2="140" className="fv-cross-arm fv-cross-arm-short" />
            <circle cx="52" cy="152" r="3" className="fv-cross-tip" />
            <circle cx="148" cy="152" r="3" className="fv-cross-tip" />
            <text x="38" y="156" className="fv-dir">З</text>
            <text x="162" y="156" className="fv-dir">В</text>
            <text x="122" y="138" className="fv-dir fv-dir-small">С</text>
            <text x="76" y="176" className="fv-dir fv-dir-small">Ю</text>
          </g>

          {/* Навершие */}
          <circle className="fv-finial" cx="100" cy="56" r="6" />
        </svg>

        {/* Втулка и сияние ИИ */}
        <div className="fv-hub-glow" />
        <div className="fv-orbit">
          <span className="fv-orbit-dot d-1" />
          <span className="fv-orbit-dot d-2" />
          <span className="fv-orbit-dot d-3" />
        </div>

        {/* Стрелка флюгера: вращается вокруг мачты в 3D */}
        <div className="fv-rotor">
          <div key={nudgeKey} className={`fv-arrow ${nudgeKey !== undefined ? 'fv-nudge' : ''}`}>
            <svg viewBox="0 0 150 44" className="fv-arrow-svg">
              <defs>
                <linearGradient id="fvArrowGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6c5ce7" />
                  <stop offset="100%" stopColor="#0077ff" />
                </linearGradient>
              </defs>
              <path d="M 2 5 L 34 15 L 34 29 L 2 39 L 13 22 Z" fill="url(#fvArrowGrad)" opacity="0.9" />
              <rect x="26" y="19.5" width="104" height="5" rx="2.5" fill="url(#fvArrowGrad)" />
              <path d="M 124 8 L 150 22 L 124 36 L 130 22 Z" fill="#0077ff" />
              <circle cx="75" cy="22" r="6" fill="var(--max-card-bg)" stroke="#0077ff" strokeWidth="3" />
            </svg>
          </div>
        </div>

        {/* Облачко «думаю…» */}
        <div className="fv-thought">
          <span className="fv-thought-tail t-1" />
          <span className="fv-thought-tail t-2" />
          <div className="fv-thought-bubble">
            <span className="fv-think-dot" />
            <span className="fv-think-dot" />
            <span className="fv-think-dot" />
          </div>
        </div>

        {/* Идея найдена */}
        <div className="fv-idea">
          <EmojiIcon e="✨" />
        </div>
      </div>

      {/* Подсказки ИИ, вылетающие после «озарения» (только demo) */}
      {mode === 'demo' &&
        DEMO_CHIPS.map((c, i) => (
          <div key={i} className={`fv-chip ${c.cls}`}>
            <EmojiText text={c.text} />
          </div>
        ))}
    </div>
  );
};
