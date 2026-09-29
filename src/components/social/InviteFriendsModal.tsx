import React, { useState } from 'react';
import type { EventItem } from '../../types/event';
import { shareEventToMax, triggerHaptic } from '../../lib/maxBridge';
import { X, Share2, Copy, Check, Users, MessageSquare } from 'lucide-react';
import './SocialScreen.css';

interface InviteFriendsModalProps {
  event: EventItem;
  onClose: () => void;
}

export const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({ event, onClose }) => {
  const [copied, setCopied] = useState(false);

  // Ссылка на чат-бот MAX с реферальным переходом на мероприятие
  const inviteUrl = `https://max.ru/t543_hakaton_max_bot?start=event_${event.id}`;

  const handleCopy = () => {
    triggerHaptic('selection');
    navigator.clipboard?.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareMax = () => {
    triggerHaptic('medium');
    shareEventToMax(event.title, inviteUrl);
  };

  return (
    <div className="social-modal-overlay" onClick={onClose}>
      <div className="social-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <h3>Пригласить друзей</h3>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="invite-content">
          <div className="invite-event-preview">
            <img src={event.image} alt={event.title} />
            <div>
              <h4>{event.title}</h4>
              <p>{new Date(event.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} • {event.place}</p>
            </div>
          </div>

          <p className="invite-desc">
            Отправьте приглашение друзьям в чаты MAX или скопируйте прямую ссылку:
          </p>

          <button className="btn-share-max-chat" onClick={handleShareMax}>
            <MessageSquare size={18} />
            <span>Отправить в чат MAX</span>
          </button>

          <div className="invite-link-row">
            <input type="text" className="invite-link-input" value={inviteUrl} readOnly />
            <button className="btn-copy-link" onClick={handleCopy}>
              {copied ? <Check size={18} color="#4bb34b" /> : <Copy size={18} />}
            </button>
          </div>
          {copied && <span className="copied-hint">Ссылка скопирована!</span>}
        </div>
      </div>
    </div>
  );
};
