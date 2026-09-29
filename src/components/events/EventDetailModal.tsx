import React from 'react';
import type { EventItem } from '../../types/event';
import type { UserProfile } from '../../types/user';
import { getEventCategoryConfig } from '../../config/categories.config';
import { triggerHaptic, shareEventToMax } from '../../lib/maxBridge';
import { Calendar, MapPin, Heart, Share2, MessageCircle, Check, X, ExternalLink } from 'lucide-react';
import './EventsScreen.css';
import { EmojiIcon } from '../icons/EmojiIcon';

interface EventDetailModalProps {
  event: EventItem;
  onClose: () => void;
  profile: UserProfile | null;
  isSaved: boolean;
  isWantToAttend: boolean;
  onToggleSaved: () => void;
  onToggleWant: () => void;
  onOpenChat: (eventId: string) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  onClose,
  profile,
  isSaved,
  isWantToAttend,
  onToggleSaved,
  onToggleWant,
  onOpenChat,
}) => {
  const categoryConfig = getEventCategoryConfig(event.category);

  const handleShare = () => {
    triggerHaptic('light');
    shareEventToMax(event.title, window.location.href);
  };

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div className="event-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <button className="event-modal-close" onClick={onClose} aria-label="Закрыть">
          <X size={20} />
        </button>

        <div className="event-modal-hero">
          <img src={event.image} alt={event.title} />
          <div className="event-modal-badges">
            {categoryConfig && (
              <span className="badge-interest" style={{ backgroundColor: categoryConfig.color }}>
                <EmojiIcon e={categoryConfig.emoji} /> {categoryConfig.label}
              </span>
            )}
            {event.sourceName && (
              <span className="badge-custom" style={{ background: 'linear-gradient(135deg, #6c5ce7, #0984e3)' }}>
                {event.sourceName}
              </span>
            )}
            {event.ageRestricted && <span className="badge-age">18+</span>}
            {event.isCustom && <span className="badge-custom">От участника</span>}
          </div>
        </div>

        <div className="event-modal-scroll">
          <h2 className="event-modal-title">{event.title}</h2>

          <div className="event-modal-meta">
            <div className="meta-card">
              <Calendar size={18} className="meta-icon" />
              <div>
                <span className="meta-label">Когда</span>
                <span className="meta-val">
                  {new Date(event.date).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    weekday: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            <div className="meta-card">
              <MapPin size={18} className="meta-icon" />
              <div>
                <span className="meta-label">Где</span>
                <span className="meta-val">{event.place}</span>
                {event.address && <span className="meta-subval">{event.address}</span>}
              </div>
            </div>
          </div>

          <div className="event-modal-section">
            <h4 className="section-title">О событии</h4>
            <p className="event-modal-description">{event.description}</p>
          </div>


          {/* Внешняя ссылка на первоисточник / запись / подробности */}
          {event.externalUrl && (
            <div style={{ marginTop: '12px', marginBottom: '8px' }}>
              <a
                href={event.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--tg-theme-secondary-bg-color, #f1f2f6)',
                  color: 'var(--tg-theme-link-color, #0984e3)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  boxSizing: 'border-box',
                }}
              >
                <ExternalLink size={16} />
                <span>Страница мероприятия на источнике</span>
              </a>
            </div>
          )}

          {/* Кнопка чата участников */}
          <div className="event-chat-prompt">
            <button
              className="btn-open-chat"
              onClick={() => {
                triggerHaptic('light');
                onClose();
                onOpenChat(event.id);
              }}
            >
              <MessageCircle size={18} />
              <span>Чат и обсуждение участников</span>
            </button>
          </div>
        </div>

        {/* Нижний бар действий */}
        <div className="event-modal-actions">
          <button
            className={`modal-btn-heart ${isSaved ? 'active' : ''}`}
            onClick={() => {
              triggerHaptic('selection');
              onToggleSaved();
            }}
            title="Сохранить"
          >
            <Heart size={20} fill={isSaved ? 'currentColor' : 'none'} />
          </button>

          <button
            className={`modal-btn-want ${isWantToAttend ? 'active' : ''}`}
            onClick={() => {
              triggerHaptic('success');
              onToggleWant();
            }}
          >
            {isWantToAttend ? (
              <>
                Вы идёте! <Check size={16} strokeWidth={3} />
              </>
            ) : (
              'Хочу пойти'
            )}
          </button>

          <button className="modal-btn-share" onClick={handleShare} title="Поделиться">
            <Share2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
