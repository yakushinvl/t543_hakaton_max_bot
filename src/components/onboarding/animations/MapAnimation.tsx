import React from 'react';
import './Animations.css';

export const MapAnimation: React.FC = () => {
  return (
    <div className="map-anim-container clean-large-style">
      {/* Просторная интерактивная карта в минималистичном стиле */}
      <div className="map-minimal-stage">
        {/* Лаконичные контуры улиц и реки */}
        <div className="map-geo-line road-h-top" />
        <div className="map-geo-line road-h-bottom" />
        <div className="map-geo-line road-v-center" />
        <div className="map-river-curve" />

        {/* Плавный радарный импульс */}
        <div className="map-subtle-radar" />

        {/* Векторная линия маршрута с алгоритмической точкой */}
        <svg className="map-clean-svg" viewBox="0 0 340 200">
          <path
            className="clean-route-path"
            d="M 60,140 C 120,40 220,160 280,60"
            fill="none"
            stroke="var(--max-primary)"
            strokeWidth="3"
            strokeDasharray="6 6"
          />
          <circle className="clean-route-dot" r="5" fill="var(--max-primary)">
            <animateMotion
              path="M 60,140 C 120,40 220,160 280,60"
              dur="4s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>

        {/* 3 аккуратных минималистичных пина локаций */}
        <div className="clean-pin clean-pin-1">
          <div className="pin-dot">
            <span>🎸</span>
          </div>
          <span className="pin-text">Концерт</span>
        </div>

        <div className="clean-pin clean-pin-2">
          <div className="pin-dot">
            <span>🎨</span>
          </div>
          <span className="pin-text">Выставка</span>
        </div>

        <div className="clean-pin clean-pin-3">
          <div className="pin-dot">
            <span>🍕</span>
          </div>
          <span className="pin-text">Фестиваль</span>
        </div>
      </div>
    </div>
  );
};
