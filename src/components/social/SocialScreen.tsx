import React, { useState, useMemo, useEffect } from 'react';
import type { EventItem } from '../../types/event';
import type { UserProfile } from '../../types/user';
import { CreateEventModal } from './CreateEventModal';
import { EventChatFullScreen } from './EventChatFullScreen';
import { ReferralLinkModal } from './ReferralLinkModal';
import { loadStoredChatMessages } from '../../lib/storage';
import { triggerHaptic } from '../../lib/maxBridge';
import { showAppConfirm, showAppToast } from '../ui/AppPopup';
import {
  Plus,
  MessageCircle,
  Share2,
  Calendar,
  MapPin,
  Sparkles,
  Users,
  CheckCircle2,
  ArrowRight,
  Gift,
  BookmarkCheck,
  ChevronRight,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import './SocialScreen.css';

interface SocialScreenProps {
  events: EventItem[];
  profile: UserProfile | null;
  onEventCreated: (event: EventItem) => void;
  onSelectEvent: (event: EventItem) => void;
  initialChatEventId?: string | null;
  onClearInitialChat?: () => void;
  isWantToAttend?: (eventId: string) => boolean;
  isAttended?: (eventId: string) => boolean;
  onToggleStatus?: (eventId: string, key: 'saved' | 'wantToAttend' | 'attended') => void;
  onDeleteEvent?: (eventId: string) => void;
}

export const SocialScreen: React.FC<SocialScreenProps> = ({
  events,
  profile,
  onEventCreated,
  onSelectEvent,
  initialChatEventId,
  onClearInitialChat,
  isWantToAttend = () => false,
  isAttended = () => false,
  onToggleStatus,
  onDeleteEvent,
}) => {
  const [activeTab, setActiveTab] = useState<'chats' | 'mine'>('chats');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Полноэкранный открытый чат (отображая нижний TabBar)
  const [fullScreenChatEvent, setFullScreenChatEvent] = useState<EventItem | null>(null);

  // Модалка реферальной ссылки для встреч
  const [referralEvent, setReferralEvent] = useState<EventItem | null>(null);

  const [chatFilter, setChatFilter] = useState<'all' | 'want' | 'attended'>('all');

  const handleDeleteEvent = (event: EventItem) => {
    showAppConfirm({
      title: 'Удалить мероприятие?',
      message: `Вы уверены, что хотите удалить «${event.title}»?\nЭто действие нельзя отменить.`,
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      danger: true,
      onConfirm: () => {
        triggerHaptic('success');
        onDeleteEvent?.(event.id);
        showAppToast(`Мероприятие «${event.title}» удалено`, 'success');
      },
    });
  };


  // Если был передан initialChatEventId (например, при клике из карточки события в Афише)
  useEffect(() => {
    if (initialChatEventId) {
      const found = events.find((e) => e.id === initialChatEventId);
      if (found) {
        setFullScreenChatEvent(found);
      }
      onClearInitialChat?.();
    }
  }, [initialChatEventId, events, onClearInitialChat]);

  // Чаты по событиям, на которые пользователь "Хочу пойти" или уже был (а также созданные им)
  const relevantChatEvents = useMemo(() => {
    return events.filter((e) => {
      const want = isWantToAttend(e.id);
      const attended = isAttended(e.id);
      const isMyCustom = Boolean(e.isCustom && (e.authorId === profile?.id || e.authorId === 'me'));
      return want || attended || isMyCustom;
    });
  }, [events, isWantToAttend, isAttended, profile]);

  // Фильтрация чатов
  const filteredChatEvents = useMemo(() => {
    if (chatFilter === 'want') {
      return relevantChatEvents.filter((e) => isWantToAttend(e.id));
    }
    if (chatFilter === 'attended') {
      return relevantChatEvents.filter((e) => isAttended(e.id));
    }
    return relevantChatEvents;
  }, [relevantChatEvents, chatFilter, isWantToAttend, isAttended]);

  // Собственные созданные встречи пользователя
  const myEvents = useMemo(() => {
    return events.filter((e) => e.isCustom && (e.authorId === profile?.id || e.authorId === 'me'));
  }, [events, profile]);

  // Популярные рекомендации для чатов, если список пуст
  const suggestedEvents = useMemo(() => {
    return events.slice(0, 4);
  }, [events]);

  // Если открыт чат на полную страницу — рендерим его (нижний TabBar остаётся в App.tsx)
  if (fullScreenChatEvent) {
    return (
      <EventChatFullScreen
        event={fullScreenChatEvent}
        profile={profile}
        onBack={() => setFullScreenChatEvent(null)}
        onSelectEvent={onSelectEvent}
      />
    );
  }

  return (
    <div className="social-screen-clean">
      {/* Шапка экрана: легкая, без тяжелой подложки */}
      <header className="social-clean-header">
        <div className="social-clean-top">
          <div>
            <h1 className="social-clean-title">Социалка</h1>
            <p className="social-clean-subtitle">Обсуждения событий и свои встречи</p>
          </div>

          <button
            className="btn-create-clean"
            onClick={() => {
              triggerHaptic('medium');
              setShowCreateModal(true);
            }}
          >
            <Plus size={16} />
            <span>Создать встречу</span>
          </button>
        </div>

        {/* Легкий переключатель вкладок в стиле segmented control */}
        <div className="clean-segmented-tabs">
          <button
            className={`segmented-tab ${activeTab === 'chats' ? 'active' : ''}`}
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('chats');
            }}
          >
            <MessageCircle size={15} />
            <span>Чаты событий</span>
            {relevantChatEvents.length > 0 && (
              <span className="tab-count-badge">{relevantChatEvents.length}</span>
            )}
          </button>

          <button
            className={`segmented-tab ${activeTab === 'mine' ? 'active' : ''}`}
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('mine');
            }}
          >
            <Users size={15} />
            <span>Мои встречи</span>
            {myEvents.length > 0 && (
              <span className="tab-count-badge">{myEvents.length}</span>
            )}
          </button>
        </div>
      </header>

      {/* ВКЛАДКА 1: ЧАТЫ СОБЫТИЙ */}
      {activeTab === 'chats' && (
        <section className="chats-tab-content">
          {relevantChatEvents.length > 0 && (
            <div className="chat-filter-chips">
              <button
                className={`filter-chip ${chatFilter === 'all' ? 'active' : ''}`}
                onClick={() => setChatFilter('all')}
              >
                Все чаты ({relevantChatEvents.length})
              </button>
              <button
                className={`filter-chip ${chatFilter === 'want' ? 'active' : ''}`}
                onClick={() => setChatFilter('want')}
              >
                Хочу пойти
              </button>
              <button
                className={`filter-chip ${chatFilter === 'attended' ? 'active' : ''}`}
                onClick={() => setChatFilter('attended')}
              >
                Посещено
              </button>
            </div>
          )}

          {filteredChatEvents.length > 0 ? (
            <div className="chats-clean-list">
              {filteredChatEvents.map((event) => {
                const want = isWantToAttend(event.id);
                const attended = isAttended(event.id);
                const isAuthor = event.isCustom && (event.authorId === profile?.id || event.authorId === 'me');
                const storedMsgs = loadStoredChatMessages(event.id);
                const lastMsg = storedMsgs.length > 0 ? storedMsgs[storedMsgs.length - 1] : undefined;

                const eventDateFormatted = new Date(event.date).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={event.id}
                    className="chat-clean-row"
                    onClick={() => {
                      triggerHaptic('light');
                      setFullScreenChatEvent(event);
                    }}
                  >
                    <div className="chat-avatar-wrap">
                      <img src={event.image} alt={event.title} className="chat-thumb-img" />
                      <span className="chat-active-dot" />
                    </div>

                    <div className="chat-row-main">
                      <div className="chat-row-topline">
                        <h4 className="chat-row-title truncate">{event.title}</h4>
                        <span className="chat-row-time">
                          {lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      <div className="chat-row-status-badges">
                        {isAuthor && <span className="clean-badge author">Организатор</span>}
                        {want && <span className="clean-badge want">Хочу пойти</span>}
                        {attended && <span className="clean-badge attended">Посещено</span>}
                        <span className="chat-meta-inline truncate">
                          {eventDateFormatted} • {event.place}
                        </span>
                      </div>

                      <p className="chat-row-preview truncate">
                        <strong className="preview-sender">{lastMsg ? `${lastMsg.userName}: ` : ''}</strong>
                        {lastMsg ? lastMsg.text : 'Обсуждение мероприятия открыто. Напишите первым!'}
                      </p>
                    </div>

                    <ChevronRight size={18} className="chat-chevron" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="chats-empty-state">
              <div className="empty-icon-circle">
                <MessageCircle size={32} />
              </div>
              <h3 className="empty-title">Пока нет активных чатов</h3>
              <p className="empty-desc">
                Здесь будут отображаться чаты событий, на которые вы нажали <strong>«Хочу пойти»</strong> или которые уже посетили.
              </p>

              {/* Быстрое подключение к чатам популярных событий */}
              <div className="suggested-chats-block">
                <h4 className="suggested-heading">Присоединяйтесь к обсуждению:</h4>
                <div className="suggested-list">
                  {suggestedEvents.map((ev) => (
                    <div key={ev.id} className="suggested-item-row">
                      <img src={ev.image} alt={ev.title} className="suggested-img" />
                      <div className="suggested-info" onClick={() => setFullScreenChatEvent(ev)}>
                        <div className="suggested-title truncate">{ev.title}</div>
                        <div className="suggested-meta truncate">{ev.place}</div>
                      </div>
                      <button
                        className="btn-join-want"
                        onClick={() => {
                          triggerHaptic('medium');
                          onToggleStatus?.(ev.id, 'wantToAttend');
                        }}
                      >
                        <BookmarkCheck size={14} />
                        <span>Хочу пойти</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ВКЛАДКА 2: МОИ ВСТРЕЧИ */}
      {activeTab === 'mine' && (
        <section className="mine-tab-content">
          <div className="mine-top-actions">
            <p className="mine-intro-text">
              Создавайте свои встречи, зовите друзей и делитесь реферальной ссылкой!
            </p>
          </div>

          {myEvents.length > 0 ? (
            <div className="my-events-clean-list">
              {myEvents.map((event) => {
                const formattedDate = new Date(event.date).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <article key={event.id} className="my-event-clean-row">
                    <div className="my-event-top-info" onClick={() => onSelectEvent(event)}>
                      <img src={event.image} alt={event.title} className="my-event-thumb" />
                      <div className="my-event-details">
                        <div className="my-event-header-badges">
                          <span className="clean-badge author">Моё событие</span>
                          <span className="clean-badge private">Только по ссылке</span>
                        </div>
                        <h3 className="my-event-title">{event.title}</h3>
                        <p className="my-event-meta">
                          <Calendar size={12} /> {formattedDate}
                        </p>
                        <p className="my-event-meta truncate">
                          <MapPin size={12} /> {event.place}
                        </p>
                      </div>
                    </div>

                    {/* Панель действий со встречей */}
                    <div className="my-event-action-bar">
                      <button
                        className="btn-action-referral"
                        onClick={() => {
                          triggerHaptic('medium');
                          setReferralEvent(event);
                        }}
                        title="Поделиться мероприятием"
                      >
                        <Share2 size={15} />
                        <span>Поделиться</span>
                      </button>

                      <button
                        className="btn-action-chat"
                        onClick={() => {
                          triggerHaptic('light');
                          setFullScreenChatEvent(event);
                        }}
                        title="Открыть чат встречи"
                      >
                        <MessageCircle size={15} />
                        <span>Чат</span>
                      </button>

                      <button
                        className="btn-action-details"
                        onClick={() => {
                          triggerHaptic('light');
                          onSelectEvent(event);
                        }}
                        title="Подробнее"
                      >
                        <span>Детали</span>
                      </button>

                      {onDeleteEvent && (
                        <button
                          className="btn-action-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEvent(event);
                          }}
                          title="Удалить мероприятие"
                          aria-label="Удалить мероприятие"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="chats-empty-state">
              <div className="empty-icon-circle purple">
                <Users size={32} />
              </div>
              <h3 className="empty-title">У вас пока нет своих мероприятий</h3>
              <p className="empty-desc">
                Создайте первую встречу для друзей или открытое городское событие с персональной реферальной ссылкой!
              </p>
              <button
                className="btn-empty-create-clean"
                onClick={() => {
                  triggerHaptic('medium');
                  setShowCreateModal(true);
                }}
              >
                <Plus size={16} />
                <span>Создать встречу</span>
              </button>
            </div>
          )}
        </section>
      )}

      {/* Модалка создания мероприятия */}
      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(ev) => {
            onEventCreated(ev);
            setActiveTab('mine');
            // Сразу открываем реферальную ссылку на созданное событие
            setReferralEvent(ev);
          }}
          profile={profile}
        />
      )}

      {/* Модалка персональной реферальной ссылки */}
      {referralEvent && (
        <ReferralLinkModal
          event={referralEvent}
          profile={profile}
          onClose={() => setReferralEvent(null)}
          onOpenChat={() => {
            setFullScreenChatEvent(referralEvent);
            setReferralEvent(null);
          }}
        />
      )}
    </div>
  );
};
