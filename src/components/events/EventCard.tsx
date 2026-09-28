import React, { useState, useRef, useEffect } from 'react';
import type { EventItem } from '../../types/event';
import { triggerHaptic } from '../../lib/maxBridge';
import { MapPin, Heart, EyeOff, Calendar } from 'lucide-react';
import './EventsScreen.css';

interface EventCardProps {
  event: EventItem;
  onClick: () => void;
  onToggleSaved: () => void;
  onDismiss: () => void;
  isSaved: boolean;
  isWantToAttend: boolean;
}

const SWIPE_THRESHOLD = 75;

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onClick,
  onToggleSaved,
  onDismiss,
  isSaved,
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [isSavedPing, setIsSavedPing] = useState(false);

  // Слайдшоу для мероприятий с несколькими картинками
  const images = event.images && event.images.length > 0 ? event.images : [event.image];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const cardRef = useRef<HTMLDivElement>(null);
  const imageFrameRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentXRef = useRef(0);
  const isHorizontalRef = useRef<boolean | null>(null);
  const isPointerDownRef = useRef(false);

  // Вертикальные координаты картинки для свечения по границе экрана
  const [glowVertical, setGlowVertical] = useState<{ top: number; height: number } | null>(null);

  const captureGlowPosition = () => {
    if (imageFrameRef.current) {
      const rect = imageFrameRef.current.getBoundingClientRect();
      setGlowVertical({ top: Math.round(rect.top), height: Math.round(rect.height) });
    }
  };

  // Таймеры фокуса для слайдшоу (5 секунд фокуса -> запуск слайдшоу)
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideshowIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Отслеживание фокуса на карточке (в зоне видимости экрана)
  useEffect(() => {
    if (images.length <= 1) return;

    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          // Пользователь смотрит на мероприятие: взводим таймер на 5 секунд
          if (!focusTimerRef.current && !slideshowIntervalRef.current) {
            focusTimerRef.current = setTimeout(() => {
              // Прошло 5 секунд непрерывного фокуса -> запускаем плавное слайдшоу
              slideshowIntervalRef.current = setInterval(() => {
                setCurrentImageIndex((prev) => (prev + 1) % images.length);
              }, 2800);
            }, 5000);
          }
        } else {
          // Пользователь прокрутил от мероприятия -> сбрасываем и плавно возвращаем 1-ю картинку
          if (focusTimerRef.current) {
            clearTimeout(focusTimerRef.current);
            focusTimerRef.current = null;
          }
          if (slideshowIntervalRef.current) {
            clearInterval(slideshowIntervalRef.current);
            slideshowIntervalRef.current = null;
          }
          setCurrentImageIndex(0);
        }
      },
      {
        threshold: 0.6,
        rootMargin: '-10% 0px -10% 0px',
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      if (slideshowIntervalRef.current) clearInterval(slideshowIntervalRef.current);
    };
  }, [images.length]);

  // Обработка жестов только на картинке: Touch
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDismissing) return;
    captureGlowPosition();
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    currentXRef.current = touch.clientX;
    isHorizontalRef.current = null;
    isPointerDownRef.current = true;
    setIsSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPointerDownRef.current || isDismissing) return;
    const touch = e.touches[0];
    currentXRef.current = touch.clientX;
    const diffX = touch.clientX - startXRef.current;
    const diffY = touch.clientY - startYRef.current;

    // Определяем направление: если движение больше вертикальное — немедленно отпускаем для штатной прокрутки ленты!
    if (isHorizontalRef.current === null) {
      if (Math.abs(diffY) > 5 && Math.abs(diffY) >= Math.abs(diffX)) {
        isHorizontalRef.current = false;
        isPointerDownRef.current = false;
        return; // Свободная прокрутка ленты без задержек
      }
      if (Math.abs(diffX) > 8 && Math.abs(diffX) > Math.abs(diffY)) {
        isHorizontalRef.current = true;
        setIsSwiping(true);
      }
    }

    if (isHorizontalRef.current) {
      if (e.cancelable) e.preventDefault();
      // Строго горизонтальное смещение
      setOffsetX(diffX * 0.85);
    }
  };

  const handleTouchEnd = () => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    if (isHorizontalRef.current) {
      if (offsetX >= SWIPE_THRESHOLD) {
        // Свайп вправо -> Сохранить (красное свечение по границе экрана и сердечко)
        triggerHaptic('success');
        onToggleSaved();
        setIsSavedPing(true);
        setTimeout(() => setIsSavedPing(false), 800);
      } else if (offsetX <= -SWIPE_THRESHOLD) {
        // Свайп влево -> Неинтересно (только картинка улетает строго горизонтально влево!)
        triggerHaptic('medium');
        setIsDismissing(true);
        setTimeout(() => {
          onDismiss();
        }, 320);
        return;
      }
    }

    // Возврат картинки на место строго горизонтально
    setIsSwiping(false);
    setOffsetX(0);
    isHorizontalRef.current = null;
  };

  // Обработка жестов только на картинке: Mouse (для десктопа)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDismissing || e.button !== 0) return;
    captureGlowPosition();
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    currentXRef.current = e.clientX;
    isHorizontalRef.current = null;
    isPointerDownRef.current = true;
    setIsSwiping(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPointerDownRef.current || isDismissing) return;
    const diffX = e.clientX - startXRef.current;
    const diffY = e.clientY - startYRef.current;

    if (isHorizontalRef.current === null) {
      if (Math.abs(diffX) > 6 && Math.abs(diffX) > Math.abs(diffY)) {
        isHorizontalRef.current = true;
        setIsSwiping(true);
      } else if (Math.abs(diffY) > 6) {
        isHorizontalRef.current = false;
        isPointerDownRef.current = false;
        return;
      }
    }

    if (isHorizontalRef.current) {
      setOffsetX(diffX * 0.85);
    }
  };

  const handleMouseUp = () => {
    handleTouchEnd();
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (Math.abs(offsetX) > 8 || isDismissing) {
      e.stopPropagation();
      return;
    }
    onClick();
  };

  // Дата без цвета категорий
  const formattedDate = new Date(event.date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const swipeRatio = Math.min(Math.abs(offsetX) / SWIPE_THRESHOLD, 1);
  const isSwipingRight = offsetX > 8;
  const isSwipingLeft = offsetX < -8;

  // Строго горизонтальная трансформация (без поворота и закругления траектории)
  let imageTransform = `translateX(${offsetX}px)`;
  let imageTransition = isSwiping ? 'none' : 'transform 0.28s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease';
  let imageOpacity = 1;

  if (isDismissing) {
    // Картинка улетает строго горизонтально влево за экран
    imageTransform = 'translateX(-120vw)';
    imageOpacity = 0;
    imageTransition = 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease';
  }

  return (
    <div
      ref={cardRef}
      className={`event-flat-container ${isDismissing ? 'item-dismissing' : ''}`}
    >
      {/* Свечение по границе ЭКРАНА справа или слева ТОЛЬКО на уровне свайпаемой картинки */}
      {isSwipingRight && glowVertical && (
        <div
          className="screen-border-glow screen-border-glow-right"
          style={{
            top: `${glowVertical.top}px`,
            height: `${glowVertical.height}px`,
            opacity: swipeRatio,
          }}
        />
      )}
      {isSwipingLeft && glowVertical && (
        <div
          className="screen-border-glow screen-border-glow-left"
          style={{
            top: `${glowVertical.top}px`,
            height: `${glowVertical.height}px`,
            opacity: swipeRatio,
          }}
        />
      )}

      <article className="event-centered-card">
        {/* Картинка по центру БЕЗ рамки */}
        <div
          ref={imageFrameRef}
          className="event-image-frame frameless"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleImageClick}
        >
          {/* Сдвигаемый слой картинки (строго горизонтально) */}
          <div
            className="event-image-moving-layer"
            style={{
              transform: imageTransform,
              transition: imageTransition,
              opacity: imageOpacity,
            }}
          >
            {/* Слайдшоу: несколько картинок с плавным переключением */}
            {images.map((imgSrc, idx) => (
              <img
                key={imgSrc + idx}
                src={imgSrc}
                alt={event.title}
                className={`event-hero-photo ${idx === currentImageIndex ? 'active' : ''}`}
                loading="lazy"
                draggable={false}
              />
            ))}

            {/* Точки слайдшоу, если картинок несколько */}
            {images.length > 1 && (
              <div className="slideshow-dots-indicator">
                {images.map((_, idx) => (
                  <span
                    key={idx}
                    className={`slideshow-dot ${idx === currentImageIndex ? 'active' : ''}`}
                  />
                ))}
              </div>
            )}

            {event.ageRestricted && <span className="event-age-tag">18+</span>}

            {/* Оверлей при свайпе вправо: Красное сердечко для "Сохранить" */}
            <div
              className="gesture-icon-overlay gesture-heart"
              style={{
                opacity: isSwipingRight || isSavedPing ? (isSavedPing ? 1 : swipeRatio) : 0,
                transform: `scale(${0.7 + swipeRatio * 0.45})`,
              }}
            >
              <Heart size={54} fill="#e64646" color="#ffffff" strokeWidth={1.5} />
            </div>

            {/* Оверлей при свайпе влево: Перечёркнутый глаз для "Неинтересно" */}
            <div
              className="gesture-icon-overlay gesture-eyeoff"
              style={{
                opacity: isSwipingLeft ? swipeRatio : 0,
                transform: `scale(${0.7 + swipeRatio * 0.45})`,
              }}
            >
              <div className="eyeoff-badge">
                <EyeOff size={38} color="#ffffff" strokeWidth={2} />
              </div>
            </div>
          </div>
        </div>

        {/* Информация по мероприятию снизу */}
        <div className="event-info-block" onClick={onClick}>
          <div className="event-meta-line">
            <span className="event-date-text">
              <Calendar size={13} className="meta-icon" />
              <span>{formattedDate}</span>
            </span>

            <div className="meta-right-group">
              {event.price && <span className="event-price-label">{event.price}</span>}
              {isSaved && (
                <span className="saved-icon-badge" title="В сохранённых">
                  <Heart size={14} fill="var(--max-danger)" color="var(--max-danger)" />
                </span>
              )}
            </div>
          </div>

          <h3 className="event-title-heading">{event.title}</h3>

          <div className="event-venue-line">
            <MapPin size={13} className="venue-pin-icon" />
            <span className="venue-name">{event.place}</span>
          </div>
        </div>
      </article>
    </div>
  );
};
