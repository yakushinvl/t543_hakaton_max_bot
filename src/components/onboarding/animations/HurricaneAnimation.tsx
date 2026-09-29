import React from 'react';
import './Animations.css';
import { EmojiIcon, EmojiText } from '../../icons/EmojiIcon';

export const HurricaneAnimation: React.FC = () => {
  return (
    <div className="hurricane-anim-container clean-large-style">
      {/* Просторный минималистичный вихрь возможностей */}
      <div className="hurricane-minimal-stage">
        {/* Чистые концентрические кольца */}
        <div className="clean-vortex-ring ring-l1" />
        <div className="clean-vortex-ring ring-l2" />
        <div className="clean-vortex-ring ring-l3" />

        {/* Центр урагана */}
        <div className="clean-vortex-center">
          <span className="vortex-center-emoji">
            <EmojiIcon e="🌪️" />
          </span>
        </div>

        {/* 4 аккуратных минималистичных плашки возможностей на орбитах */}
        <div className="clean-orbit orbit-a">
          <div className="clean-chip chip-a">
            <span>
              <EmojiText text="🎟️ Билеты" />
            </span>
          </div>
        </div>

        <div className="clean-orbit orbit-b">
          <div className="clean-chip chip-b">
            <span>
              <EmojiText text="🗺️ Живая карта" />
            </span>
          </div>
        </div>

        <div className="clean-orbit orbit-c">
          <div className="clean-chip chip-c">
            <span>
              <EmojiText text="💬 Чаты MAX" />
            </span>
          </div>
        </div>

        <div className="clean-orbit orbit-d">
          <div className="clean-chip chip-d">
            <span>
              <EmojiText text="☕ Кофе & Еда" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
