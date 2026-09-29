import React, { useState, useEffect, useRef } from 'react';
import { Compass, Sparkles, Check, MapPin } from 'lucide-react';
import './AppLoadingScreen.css';
import { EmojiIcon } from '../icons/EmojiIcon';

interface AppLoadingScreenProps {
  onFinished?: () => void;
  isReady?: boolean;
  cityName?: string;
  eventsCount?: number;
  minDurationMs?: number;
}

const LOADING_HINTS = [
  'Инициализируем интерактивную карту...',
  'Ищем актуальные события и площадки...',
  'ИИ-Флюгер калибрует компас интересов...',
  'Расставляем метки мероприятий на карте...',
  'Почти готово! Открываем карту...',
];

export const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({
  onFinished,
  isReady = false,
  cityName = 'твоём городе',
  eventsCount = 0,
  minDurationMs = 2600,
}) => {
  const [progress, setProgress] = useState(15);
  const [hintIndex, setHintIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const startTimeRef = useRef(Date.now());
  const isFinishedRef = useRef(false);

  // Плавная смена подсказок
  useEffect(() => {
    const hintInterval = setInterval(() => {
      setHintIndex((prev) => (prev + 1) % LOADING_HINTS.length);
    }, 1100);
    return () => clearInterval(hintInterval);
  }, []);

  // Плавное продвижение прогресса с синхронизацией готовности карты и мероприятий
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const minTimePassed = elapsed >= minDurationMs;

      setProgress((prev) => {
        // Если карта и события готовы и минимальное время прошло
        if (isReady && minTimePassed) {
          if (prev < 100) {
            return Math.min(100, prev + 14);
          }
          return 100;
        }

        // Если ещё не все данные пришли, плавно приближаемся к 88%
        if (prev < 88) {
          const step = Math.max(1, Math.round((88 - prev) / 8));
          return prev + step;
        }
        return prev;
      });

      // Завершение экрана
      if (isReady && minTimePassed && progress >= 100 && !isFinishedRef.current) {
        isFinishedRef.current = true;
        clearInterval(interval);
        setIsFadingOut(true);
        setTimeout(() => {
          onFinished?.();
        }, 420);
      }

      // Страховочный таймаут (7 секунд максимум на случай сбоя сети)
      if (elapsed > 7000 && !isFinishedRef.current) {
        isFinishedRef.current = true;
        clearInterval(interval);
        setProgress(100);
        setIsFadingOut(true);
        setTimeout(() => {
          onFinished?.();
        }, 420);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isReady, minDurationMs, onFinished, progress]);

  return (
    <div
      className={`onboarding-root-fullscreen app-loading-onboarding-screen ${
        isFadingOut ? 'stage-fade-leave-left' : 'stage-fade-enter-right'
      }`}
    >
      {/* 1. Верхний блок в фирменном чат-стиле онбординга */}
      <div className="stage-content stage-layout-bottom-anim">
        <div className="stage-text-block">
          <h1 className="stage-chat-line">
            <span className="anim-line anim-delay-1">Подготавливаем карту </span>
            <span className="anim-line anim-delay-2">и события в городе</span>
            <span className="anim-line anim-delay-3 app-loading-city-pill">
              <EmojiIcon e="📍" /> {cityName}
            </span>
          </h1>
        </div>

        {/* 2. Центральная минималистичная анимация карты в стиле онбординга */}
        <div className="stage-bottom-visual anim-line anim-delay-3">
          <div className="app-loading-visual-stage clean-large-style">
            {/* Картографический макет с дорогами и контурами */}
            <div className="loading-map-minimal-box">
              {/* Радарные волны поиска мероприятий */}
              <div className="loading-radar-ring lr-1" />
              <div className="loading-radar-ring lr-2" />
              <div className="loading-radar-ring lr-3" />

              {/* Гео-линии улиц */}
              <div className="loading-geo-line road-h" />
              <div className="loading-geo-line road-v" />
              <div className="loading-river-curve" />

              {/* Векторный маршрут с бегущей точкой */}
              <svg className="loading-route-svg" viewBox="0 0 340 200">
                <path
                  className="loading-route-path"
                  d="M 50,145 C 110,40 230,165 290,65"
                  fill="none"
                  stroke="var(--max-primary, #6c5ce7)"
                  strokeWidth="3"
                  strokeDasharray="6 6"
                />
                <circle className="loading-route-dot" r="5" fill="var(--max-primary, #6c5ce7)">
                  <animateMotion
                    path="M 50,145 C 110,40 230,165 290,65"
                    dur="3.4s"
                    repeatCount="indefinite"
                  />
                </circle>
              </svg>

              {/* Интерактивные пины мероприятий, появляющиеся по мере загрузки */}
              <div className={`loading-map-pin l-pin-1 ${progress >= 20 ? 'pin-visible' : ''}`}>
                <div className="l-pin-badge">
                  <EmojiIcon e="🎸" />
                </div>
                <span className="l-pin-tag">Концерт</span>
              </div>

              <div className={`loading-map-pin l-pin-2 ${progress >= 45 ? 'pin-visible' : ''}`}>
                <div className="l-pin-badge">
                  <EmojiIcon e="🎨" />
                </div>
                <span className="l-pin-tag">Выставка</span>
              </div>

              <div className={`loading-map-pin l-pin-3 ${progress >= 70 ? 'pin-visible' : ''}`}>
                <div className="l-pin-badge">
                  <EmojiIcon e="🍕" />
                </div>
                <span className="l-pin-tag">Фестиваль</span>
              </div>

              <div className={`loading-map-pin l-pin-4 ${progress >= 85 ? 'pin-visible' : ''}`}>
                <div className="l-pin-badge">
                  <EmojiIcon e="🎭" />
                </div>
                <span className="l-pin-tag">Театр</span>
              </div>

              {/* Центральная пульсирующая точка компаса/пользователя */}
              <div className="loading-user-pulsar">
                <Compass size={17} className="pulsar-icon" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Нижняя панель прогресса в дизайн-системе онбординга */}
      <div className="app-loading-bottom-bar anim-line anim-delay-2">
        <div className="app-loading-progress-card">
          <div className="app-loading-meta-row">
            <div className="app-loading-hint-wrap">
              {progress >= 100 ? (
                <Check size={14} className="loading-status-icon text-success" />
              ) : (
                <Sparkles size={14} className="loading-status-icon spinning-sparkle" />
              )}
              <span className="app-loading-hint-text" key={hintIndex}>
                {progress >= 100
                  ? eventsCount > 0
                    ? `Готово! Найдено ${eventsCount} мероприятий`
                    : 'Всё готово! Открываем карту'
                  : LOADING_HINTS[hintIndex]}
              </span>
            </div>
            <span className="app-loading-pct-val">{progress}%</span>
          </div>

          <div className="app-loading-track">
            <div
              className="app-loading-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
