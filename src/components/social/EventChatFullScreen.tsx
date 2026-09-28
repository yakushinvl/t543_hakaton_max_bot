import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '../../types/social';
import type { EventItem } from '../../types/event';
import type { UserProfile } from '../../types/user';
import { fetchEventChat, postChatMessage } from '../../lib/api';
import { getMockDiscussionForEvent } from '../../data/chatDiscussions';
import { triggerHaptic } from '../../lib/maxBridge';
import { ArrowLeft, Send, Calendar, MapPin, Info, Users, Sparkles } from 'lucide-react';
import './SocialScreen.css';

interface EventChatFullScreenProps {
  event: EventItem;
  profile: UserProfile | null;
  onBack: () => void;
  onSelectEvent?: (event: EventItem) => void;
}

export const EventChatFullScreen: React.FC<EventChatFullScreenProps> = ({
  event,
  profile,
  onBack,
  onSelectEvent,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Load chat messages
  useEffect(() => {
    let isMounted = true;

    fetchEventChat(event.id).then((serverMsgs) => {
      if (!isMounted) return;
      if (serverMsgs && serverMsgs.length > 0) {
        setMessages(serverMsgs);
      } else {
        // Generate realistic conversation from attendees discussing this event
        const seedMessages = getMockDiscussionForEvent(event);
        setMessages(seedMessages);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [event]);

  // Auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = text.trim();
    if (!cleanText || sending) return;

    triggerHaptic('light');
    setSending(true);

    const optimisticMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      eventId: event.id,
      userId: profile?.id || 'me',
      userName: profile?.name || 'Вы',
      userAvatar: profile?.avatarUrl,
      text: cleanText,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setText('');

    try {
      await postChatMessage(event.id, {
        userId: profile?.id || 'me',
        userName: profile?.name || 'Вы',
        userAvatar: profile?.avatarUrl,
        text: cleanText,
      });
      triggerHaptic('success');
    } catch (err) {
      console.warn('Failed to post to server, stored locally:', err);
    } finally {
      setSending(false);
    }
  };

  const formattedDate = new Date(event.date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="event-chat-fullscreen">
      {/* Верхняя шапка чата */}
      <header className="chat-topbar">
        <button
          className="btn-chat-back"
          onClick={() => {
            triggerHaptic('light');
            onBack();
          }}
          aria-label="Назад к списку чатов"
        >
          <ArrowLeft size={20} />
          <span className="btn-chat-back-text">Чаты</span>
        </button>

        <div
          className="chat-topbar-center"
          onClick={() => {
            if (onSelectEvent) {
              triggerHaptic('light');
              onSelectEvent(event);
            }
          }}
        >
          <img
            src={event.image}
            alt={event.title}
            className="chat-event-avatar"
          />
          <div className="chat-event-titles">
            <h2 className="chat-title truncate">{event.title}</h2>
            <div className="chat-status-subtitle">
              <span className="online-indicator-dot" />
              <span>{event.registeredCount ? `${event.registeredCount} участников` : 'Чат события'}</span>
            </div>
          </div>
        </div>

        {onSelectEvent && (
          <button
            className="btn-chat-info"
            onClick={() => {
              triggerHaptic('light');
              onSelectEvent(event);
            }}
            title="О событии"
          >
            <Info size={19} />
          </button>
        )}
      </header>

      {/* Тонкая контекстная плашка мероприятия без тяжелой подложки */}
      <div className="chat-event-strip">
        <span className="strip-item">
          <Calendar size={12} />
          <span>{formattedDate}</span>
        </span>
        <span className="strip-divider">•</span>
        <span className="strip-item truncate">
          <MapPin size={12} />
          <span>{event.place}</span>
        </span>
        {!event.isCustom && event.price && (
          <>
            <span className="strip-divider">•</span>
            <span className="strip-price">{event.price}</span>
          </>
        )}
        {event.isCustom && (
          <>
            <span className="strip-divider">•</span>
            <span className="strip-price">Только по ссылке</span>
          </>
        )}
      </div>

      {/* Лента сообщений участников */}
      <main className="chat-feed">
        <div className="chat-intro-notice">
          <div className="chat-intro-icon">
            <Users size={18} />
          </div>
          <div className="chat-intro-text">
            <strong>Чат участников события</strong>
            <p>Здесь можно познакомиться, скоординироваться по времени и задать вопросы организаторам</p>
          </div>
        </div>

        {messages.map((msg, index) => {
          const isMe = String(msg.userId) === String(profile?.id || 'me') || msg.userName === 'Вы';
          const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <div
              key={msg.id || index}
              className={`chat-bubble-row ${isMe ? 'row-me' : 'row-other'}`}
            >
              {!isMe && (
                <div className="bubble-avatar">
                  {msg.userAvatar ? (
                    <img src={msg.userAvatar} alt={msg.userName} />
                  ) : (
                    <span>{msg.userName ? msg.userName[0].toUpperCase() : 'U'}</span>
                  )}
                </div>
              )}

              <div className={`chat-bubble ${isMe ? 'bubble-me' : 'bubble-other'}`}>
                {!isMe && <span className="bubble-author-name">{msg.userName}</span>}
                <div className="bubble-message-text">{msg.text}</div>
                <div className="bubble-meta">
                  <span className="bubble-timestamp">{time}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </main>

      {/* Нижняя панель ввода (расположена прямо над нижней панелью навигации TabBar) */}
      <footer className="chat-composer-wrap">
        <form onSubmit={handleSend} className="chat-composer-form">
          <input
            type="text"
            className="chat-composer-input"
            placeholder="Обсудить мероприятие..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoComplete="off"
          />
          <button
            type="submit"
            className={`btn-chat-send ${text.trim() ? 'active' : ''}`}
            disabled={!text.trim() || sending}
            aria-label="Отправить"
          >
            <Send size={18} />
          </button>
        </form>
      </footer>
    </div>
  );
};
