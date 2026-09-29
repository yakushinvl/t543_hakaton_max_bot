import React, { useState } from 'react';
import type { EventItem } from '../../types/event';
import type { UserProfile } from '../../types/user';
import { shareEventToMax, triggerHaptic } from '../../lib/maxBridge';
import { recordReferralShare, loadReferralStats } from '../../lib/storage';
import { X, Copy, Check, Share2, Users, Sparkles, MessageCircle, Gift, ArrowUpRight, Lock } from 'lucide-react';
import './SocialScreen.css';
import { EmojiText } from '../icons/EmojiIcon';

interface ReferralLinkModalProps {
  event: EventItem;
  profile: UserProfile | null;
  onClose: () => void;
  onOpenChat?: () => void;
}

export const ReferralLinkModal: React.FC<ReferralLinkModalProps> = ({
  event,
  profile,
  onClose,
  onOpenChat,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [stats, setStats] = useState(() => loadReferralStats(event.id));

  // Персональная реферальная ссылка участника/организатора
  const authorTag = profile?.id || 'me';
  const referralUrl = `https://vane.yakuhost.ru/?startapp=ref_${authorTag}_event_${event.id}`;
  const referralCode = `REF-${event.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || 'MAX777'}`;

  const formattedDate = new Date(event.date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  const inviteMessage = `👋 Привет! Приглашаю тебя на закрытую встречу «${event.title}»!
📅 Дата: ${formattedDate}
📍 Место: ${event.place}
🔒 Доступ только по персональному приглашению.

Присоединяйся по ссылке:
${referralUrl}`;

  const handleCopyLink = () => {
    triggerHaptic('selection');
    navigator.clipboard?.writeText(referralUrl);
    setCopiedLink(true);
    const updated = recordReferralShare(event.id);
    setStats(updated);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleCopyMessage = () => {
    triggerHaptic('selection');
    navigator.clipboard?.writeText(inviteMessage);
    setCopiedMessage(true);
    const updated = recordReferralShare(event.id);
    setStats(updated);
    setTimeout(() => setCopiedMessage(false), 2200);
  };

  const handleShareMax = () => {
    triggerHaptic('medium');
    const updated = recordReferralShare(event.id);
    setStats(updated);
    shareEventToMax(event.title, referralUrl);
  };

  return (
    <div className="social-modal-overlay" onClick={onClose}>
      <div className="social-modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Заголовок */}
        <div className="modal-header-light">
          <div>
            <div className="referral-badge-pill">
              <Gift size={13} />
              <span>Реферальная ссылка</span>
            </div>
            <h3 className="modal-title-light">Приглашение на встречу</h3>
          </div>
          <button className="btn-close-light" onClick={onClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>

        {/* Превью встречи */}
        <div className="referral-event-preview">
          <img src={event.image} alt={event.title} className="referral-event-img" />
          <div className="referral-event-info">
            <h4 className="truncate">{event.title}</h4>
            <p className="truncate">{formattedDate} • {event.place}</p>
            <span className="referral-price-tag">
              <Lock size={11} style={{ marginRight: 3, verticalAlign: -1 }} />
              Только по ссылке
            </span>
          </div>
        </div>

        <p className="referral-explainer">
          В отличие от обычных событий, на созданное вами мероприятие действует персональная реферальная ссылка.
          Приглашайте друзей — перешедшие сразу увидят подробности и подключатся к чату встречи!
        </p>

        {/* Блок самой реферальной ссылки */}
        <div className="referral-link-box">
          <div className="referral-link-header">
            <span className="referral-link-label">Ваша ссылка:</span>
            <span className="referral-code-label">Код: <strong>{referralCode}</strong></span>
          </div>

          <div className="referral-input-row">
            <input
              type="text"
              className="referral-input"
              value={referralUrl}
              readOnly
              onClick={handleCopyLink}
            />
            <button
              className={`btn-referral-copy ${copiedLink ? 'copied' : ''}`}
              onClick={handleCopyLink}
            >
              {copiedLink ? (
                <>
                  <Check size={16} />
                  <span>Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Копировать</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Кнопка отправки прямо в MAX */}
        <button className="btn-share-max-direct" onClick={handleShareMax}>
          <Share2 size={17} />
          <span>Поделиться в чате MAX</span>
          <ArrowUpRight size={16} style={{ marginLeft: 'auto', opacity: 0.8 }} />
        </button>

        {/* Готовый текст приглашения */}
        <div className="invitation-text-block">
          <div className="invitation-text-header">
            <span>Готовое сообщение для друзей:</span>
            <button className="btn-copy-text-link" onClick={handleCopyMessage}>
              {copiedMessage ? 'Скопировано!' : 'Скопировать текст'}
            </button>
          </div>
          <pre className="invitation-text-preview"><EmojiText text={inviteMessage} /></pre>
        </div>

        {/* Статистика по реферальной ссылке */}
        <div className="referral-stats-strip">
          <div className="ref-stat-col">
            <span className="ref-stat-num">{stats.clicks}</span>
            <span className="ref-stat-text">Переходов</span>
          </div>
          <div className="ref-stat-sep" />
          <div className="ref-stat-col">
            <span className="ref-stat-num">{stats.joins}</span>
            <span className="ref-stat-text">В чате</span>
          </div>
          <div className="ref-stat-sep" />
          <div className="ref-stat-col">
            <span className="ref-stat-num">100%</span>
            <span className="ref-stat-text">Доступно</span>
          </div>
        </div>

        {onOpenChat && (
          <button
            className="btn-modal-chat-secondary"
            onClick={() => {
              onClose();
              onOpenChat();
            }}
          >
            <MessageCircle size={16} />
            <span>Перейти в чат встречи</span>
          </button>
        )}
      </div>
    </div>
  );
};
