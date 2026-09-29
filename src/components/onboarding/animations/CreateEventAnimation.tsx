import React from 'react';
import './Animations.css';
import './CreateEventAnimation.css';
import { EmojiIcon } from '../../icons/EmojiIcon';

const FRIENDS = [
  { emoji: '🧑', bg: '#ffb020', cls: 'f-1' },
  { emoji: '👩', bg: '#ff6b9d', cls: 'f-2' },
  { emoji: '🧔', bg: '#2ed3b7', cls: 'f-3' },
  { emoji: '👱‍♀️', bg: '#6c5ce7', cls: 'f-4' },
];

const BURST = ['#ff6b9d', '#ffb020', '#2ed3b7', '#6c5ce7', '#0077ff', '#ff7a45', '#ff6b9d', '#2ed3b7'];

export const CreateEventAnimation: React.FC = () => {
  return (
    <div className="create-event-anim-container clean-large-style anim-bleed" aria-hidden="true">
      <div className="ce-scene">
        {/* Тост об отправке инвайтов */}
        <div className="ce-toast">
          <EmojiIcon e="✈️" /> Инвайты отправлены в MAX
        </div>

        {/* Бумажный самолётик с пунктирным следом */}
        <svg className="ce-plane-trail" viewBox="0 0 360 336">
          <path className="ce-trail-path" d="M 205 230 C 255 190 250 110 330 40" pathLength={100} />
        </svg>
        <div className="ce-plane">
          <svg viewBox="0 0 24 24" width="30" height="30">
            <path d="M 2 11 L 22 2 L 15 22 L 11 13 Z" fill="#0077ff" />
            <path d="M 11 13 L 22 2" stroke="#ffffff" strokeWidth="1.4" />
          </svg>
        </div>

        {/* Лист создания мероприятия, выезжающий из нижнего края */}
        <div className="ce-sheet">
          <div className="ce-sheet-handle" />

          <div className="ce-field">
            <span className="ce-field-label">Название</span>
            <div className="ce-field-value">
              <span className="ce-typed">
                Пицца и настолки <EmojiIcon e="🍕" />
              </span>
              <span className="ce-caret" />
            </div>
          </div>

          <div className="ce-chips-row">
            <span className="ce-chip ce-chip-date">
              <EmojiIcon e="📅" /> Сб, 19:30
            </span>
            <span className="ce-chip ce-chip-place">
              <EmojiIcon e="📍" /> Лофт на крыше
            </span>
          </div>

          <div className="ce-friends-row">
            <span className="ce-friends-label">Друзья</span>
            <div className="ce-friends">
              {FRIENDS.map((f) => (
                <div key={f.cls} className={`ce-friend ${f.cls}`} style={{ background: f.bg }}>
                  <EmojiIcon e={f.emoji} className="ce-friend-face" />
                  <span className="ce-friend-check">✓</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ce-button">
            <span className="ce-button-text ce-text-create">Создать и пригласить</span>
            <span className="ce-button-text ce-text-done">✓ Готово!</span>
            <span className="ce-ripple" />
            {/* Палец-тап по кнопке */}
            <span className="ce-tap" />
          </div>
        </div>

        {/* Конфетти-взрыв */}
        <div className="ce-burst">
          {BURST.map((c, i) => (
            <span
              key={i}
              className="ce-burst-bit"
              style={{ background: c, '--a': `${i * 45}deg` } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
