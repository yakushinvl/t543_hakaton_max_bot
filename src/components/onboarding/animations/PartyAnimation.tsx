import React from 'react';
import './Animations.css';

export const PartyAnimation: React.FC = () => {
  return (
    <div className="party-anim-container clean-large-style">
      {/* Минималистичная сцена тусовки: элегантная виниловая пластинка и гармонические волны */}
      <div className="party-minimal-stage">
        {/* Фоновые мягкие звуковые волны */}
        <div className="party-wave-ring wave-outer" />
        <div className="party-wave-ring wave-mid" />
        <div className="party-wave-ring wave-inner" />

        {/* Минималистичный стилизованный винил / ритмический круг */}
        <div className="party-disc-minimal">
          <div className="disc-groove groove-1" />
          <div className="disc-groove groove-2" />
          <div className="disc-core">
            <span className="disc-core-icon">🪩</span>
          </div>
        </div>

        {/* Минималистичный эквалайзер: чистые широкие полосы с плавным ритмом */}
        <div className="party-minimal-bars">
          <div className="m-bar m-bar-1" />
          <div className="m-bar m-bar-2" />
          <div className="m-bar m-bar-3" />
          <div className="m-bar m-bar-4" />
          <div className="m-bar m-bar-5" />
          <div className="m-bar m-bar-6" />
          <div className="m-bar m-bar-7" />
        </div>

        {/* Несколько лаконичных плавающих акцентов */}
        <div className="party-float-accent accent-left">
          <span>🎵</span>
        </div>
        <div className="party-float-accent accent-right">
          <span>✨</span>
        </div>
      </div>
    </div>
  );
};
