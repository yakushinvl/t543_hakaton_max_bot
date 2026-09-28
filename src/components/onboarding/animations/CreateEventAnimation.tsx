import React from 'react';
import './Animations.css';

export const CreateEventAnimation: React.FC = () => {
  return (
    <div className="create-event-anim-container clean-large-style">
      {/* Просторная карточка создаваемого мероприятия в чистом стиле */}
      <div className="create-minimal-stage">
        <div className="clean-event-sheet">
          <div className="clean-sheet-header">
            <span className="clean-date-badge">СБ 19:30</span>
            <span className="clean-type-label">Встреча с друзьями</span>
          </div>

          <h3 className="clean-event-name">Вечер пиццы и настолок 🍕🎲</h3>
          <p className="clean-event-location">Лофт «На крыше», Парк Горького</p>

          <div className="clean-avatars-row">
            <div className="clean-avatar a-host" title="Вы (Организатор)">👑</div>
            <div className="clean-avatar a-1" title="Друг 1">🧑</div>
            <div className="clean-avatar a-2" title="Друг 2">👩</div>
            <div className="clean-avatar a-add" title="Пригласить еще">+</div>
          </div>
        </div>

        {/* Чистый индикатор отправки инвайта */}
        <div className="clean-invite-pill">
          <span>✈️ Инвайт отправлен друзьям в MAX</span>
        </div>
      </div>
    </div>
  );
};
