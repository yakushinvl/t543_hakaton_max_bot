import React from 'react';
import './Animations.css';

export interface FlugerAIAnimationProps {
  isSpinning?: boolean;
  statusText?: string;
  compassAngle?: number;
  className?: string;
}

export const FlugerAIAnimation: React.FC<FlugerAIAnimationProps> = ({
  isSpinning = false,
  statusText = '✨ ИИ Флюгер готов к поиску',
  compassAngle,
  className = '',
}) => {
  return (
    <div className={`fluger-anim-container clean-large-style ${className}`.trim()}>
      {/* Просторная и лаконичная визуализация флюгера */}
      <div className="fluger-minimal-stage">
        {/* Мягкие ветряные линии */}
        <svg className={`clean-wind-curves ${isSpinning ? 'fast-wind' : ''}`} viewBox="0 0 340 220">
          <path
            className="clean-wind-path wind-path-1"
            d="M 20,70 C 110,40 210,90 320,60"
            fill="none"
            stroke="var(--max-primary)"
            strokeWidth="2"
            strokeDasharray="8 8"
          />
          <path
            className="clean-wind-path wind-path-2"
            d="M 40,150 C 130,120 230,170 310,130"
            fill="none"
            stroke="var(--max-border)"
            strokeWidth="1.5"
            strokeDasharray="6 6"
          />
        </svg>

        {/* Элегантная конструкция флюгера */}
        <div className="clean-weathervane">
          {/* Мачта */}
          <div className="clean-mast" />

          {/* Стороны света */}
          <div className="clean-compass-cross">
            <span className="clean-dir c-dir-n">С</span>
            <span className="clean-dir c-dir-e">В</span>
            <span className="clean-dir c-dir-s">Ю</span>
            <span className="clean-dir c-dir-w">З</span>
            <div className="clean-cross-h" />
            <div className="clean-cross-v" />
          </div>

          {/* Вращающаяся стрелка флюгера */}
          <div
            className={`clean-vane-spinner ${isSpinning ? 'is-spinning' : ''}`}
            style={
              !isSpinning && typeof compassAngle === 'number'
                ? { transform: `rotate(${compassAngle}deg)` }
                : undefined
            }
          >
            <div className="clean-arrow">
              <div className="clean-arrow-spear">✦</div>
              <div className="clean-arrow-shaft" />
              <div className="clean-arrow-fin">🧭</div>
            </div>
          </div>
        </div>

        {/* Мягкая подсказка ответа ИИ */}
        {statusText ? (
          <div className="clean-ai-badge">
            <span>{statusText}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
