import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '../../types/social';
import type { EventItem } from '../../types/event';
import type { UserProfile } from '../../types/user';
import { fetchEventChat, postChatMessage } from '../../lib/api';
import { triggerHaptic } from '../../lib/maxBridge';
import { showAppToast } from '../ui/AppPopup';
import { X, Send, MessageCircle } from 'lucide-react';
import './SocialScreen.css';
import { EmojiText } from '../icons/EmojiIcon';

interface EventChatModalProps {
  event: EventItem;
  profile: UserProfile | null;
  onClose: () => void;
}

export const EventChatModal: React.FC<EventChatModalProps> = ({
  event,
  profile,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchEventChat(event.id).then((msgs) => {
      if (msgs.length > 0) {
        setMessages(msgs);
      } else {
        // Стартовое приветственное сообщение чата
        setMessages([
          {
            id: 'init-1',
            eventId: event.id,
            userId: 'system',
            userName: 'Чат мероприятия',
            text: `Добро пожаловать в обсуждение события "${event.title}"! Здесь можно договориться о встрече и задать вопросы организаторам.`,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    });
  }, [event.id, event.title]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    triggerHaptic('light');
    setSending(true);

    try {
      const newMsg = await postChatMessage(event.id, {
        userId: profile?.id || 'me',
        userName: profile?.name || 'Пользователь MAX',
        userAvatar: profile?.avatarUrl,
        text: text.trim(),
      });
      setMessages((prev) => [...prev, newMsg]);
      setText('');
      triggerHaptic('success');
    } catch {
      showAppToast('Не удалось отправить сообщение. Попробуйте снова.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="social-modal-overlay" onClick={onClose}>
      <div className="social-modal-card chat-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <div className="chat-header-info">
            <MessageCircle size={20} className="chat-icon-primary" />
            <div>
              <h3>Чат встречи</h3>
              <p className="chat-event-name truncate">{event.title}</p>
            </div>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Список сообщений */}
        <div className="chat-messages-container">
          {messages.map((msg) => {
            const isMe = msg.userId === (profile?.id || 'me');
            return (
              <div key={msg.id} className={`chat-message-row ${isMe ? 'msg-me' : 'msg-other'}`}>
                <div className="chat-bubble">
                  {!isMe && <span className="bubble-author">{msg.userName}</span>}
                  <p className="bubble-text"><EmojiText text={msg.text} /></p>
                  <span className="bubble-time">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Форма отправки сообщения */}
        <form onSubmit={handleSend} className="chat-input-bar">
          <input
            type="text"
            className="chat-input"
            placeholder="Напишите сообщение..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" className="btn-send-message" disabled={!text.trim() || sending}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};
