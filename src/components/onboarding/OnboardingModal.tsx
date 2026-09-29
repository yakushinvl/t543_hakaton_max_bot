import React, { useState, useEffect, useRef } from 'react';
import type { UserProfile, AgeGroup, Gender } from '../../types/user';
import { getGenderOptions } from '../../types/user';
import { getMaxUser, triggerHaptic } from '../../lib/maxBridge';
import { DEFAULT_CITY } from '../../data/cities';
import { AppleWatchGrid } from './AppleWatchGrid';
import { PartyAnimation } from './animations/PartyAnimation';
import { MapAnimation } from './animations/MapAnimation';
import { FlugerAIAnimation } from './animations/FlugerAIAnimation';
import { CreateEventAnimation } from './animations/CreateEventAnimation';
import { HurricaneAnimation } from './animations/HurricaneAnimation';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { getAllInterests } from '../../config/interests.config';
import './Onboarding.css';
import { EmojiIcon } from '../icons/EmojiIcon';

interface OnboardingModalProps {
  onComplete: (profile: UserProfile) => void;
  initialProfile?: UserProfile | null;
}

const AGE_GROUPS: AgeGroup[] = ['6-11', '12-15', '16-21', '22-29', '30-44', '45-59', '60+'];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  onComplete,
  initialProfile,
}) => {
  // Этапы онбординга (0 - 9)
  const [step, setStep] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'prev'>('next');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Данные профиля
  const [name, setName] = useState('');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('22-29');
  const [gender, setGender] = useState<Gender>('young_man');
  const [interests, setInterests] = useState<string[]>(['concert', 'exhibition', 'food', 'walk']);
  const citySlug = DEFAULT_CITY.slug;

  // Таймер для шага 9 (5 секунд)
  const [welcomeSecondsLeft, setWelcomeSecondsLeft] = useState(5);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Поддержка свайп-жестов
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Загрузка начальных данных
  useEffect(() => {
    if (initialProfile) {
      setName(initialProfile.name.slice(0, 20));
      setAgeGroup(initialProfile.ageGroup);
      setGender(initialProfile.gender);
      setInterests(initialProfile.interests);
    } else {
      const maxUser = getMaxUser();
      const initialName = maxUser?.first_name || (maxUser?.username ? `@${maxUser.username}` : '');
      setName(initialName.slice(0, 20));
    }
  }, [initialProfile]);

  // Плавная смена шага
  const changeStep = (newStep: number, dir: 'next' | 'prev') => {
    setTransitionDirection(dir);
    setIsTransitioning(true);
    setTimeout(() => {
      setStep(newStep);
      setIsTransitioning(false);
    }, 360);
  };

  const handleNext = () => {
    triggerHaptic('light');
    if (step < 9) {
      changeStep(step + 1, 'next');
    }
  };

  const handleBack = () => {
    triggerHaptic('light');
    if (step > 0) {
      changeStep(step - 1, 'prev');
    }
  };

  const handleAgeSelect = (age: AgeGroup) => {
    setAgeGroup(age);
    triggerHaptic('selection');
    const options = getGenderOptions(age);
    if (!options.some((o) => o.value === gender)) {
      setGender(options[0].value);
    }
  };

  const toggleInterest = (id: string) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleFinishInterests = () => {
    if (interests.length === 0) return;
    triggerHaptic('success');
    changeStep(9, 'next');
  };

  // Таймер на 9 шаге (5 секунд)
  useEffect(() => {
    if (step === 9) {
      setWelcomeSecondsLeft(5);
      timerRef.current = setInterval(() => {
        setWelcomeSecondsLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            finishOnboardingAndLoadApp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [step, name, ageGroup, gender, interests]);

  const finishOnboardingAndLoadApp = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    triggerHaptic('success');

    const finalProfile: UserProfile = {
      name: name.trim() || 'Пользователь',
      ageGroup,
      gender,
      interests: interests.length > 0 ? interests : ['exhibition', 'walk'],
      citySlug,
      registrationData: initialProfile?.registrationData || {
        fullName: name,
        birthDate: '',
        phone: '',
        email: '',
      },
      onboardingCompleted: true,
    };

    onComplete(finalProfile);
  };

  // Обработка жестов свайпа влево/вправо
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.apple-watch-container') || (e.target as HTMLElement).closest('input')) {
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Горизонтальный свайп с порогом 45px
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0) {
        // Свайп влево -> Далее
        if (step === 5 && !name.trim()) {
          // Не переходим, если имя пустое
        } else if (step < 9) {
          handleNext();
        }
      } else {
        // Свайп вправо -> Назад
        if (step > 0 && step < 9) {
          handleBack();
        }
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const selectedInterestsData = getAllInterests().filter((i) => interests.includes(i.id));

  return (
    <div
      className={`onboarding-root-fullscreen ${step === 8 ? 'root-step-interests' : ''} ${
        step <= 3 ? 'root-bleed-visual' : ''
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Основной контент этапа */}
      <div
        key={step}
        className={`onboarding-stage-wrapper ${step === 8 ? 'stage-wrapper-interests' : ''} ${
          isTransitioning
            ? transitionDirection === 'next'
              ? 'stage-fade-leave-left'
              : 'stage-fade-leave-right'
            : transitionDirection === 'next'
            ? 'stage-fade-enter-right'
            : 'stage-fade-enter-left'
        }`}
      >
        {/* ===================================================
            ЭТАП 0: "Привет! Флюгер — твой гид по развлечениям и досугу"
            =================================================== */}
        {step === 0 && (
          <div className="stage-content stage-layout-bottom-anim">
            <div className="stage-text-block">
              <h1 className="stage-chat-line">
                <span className="anim-line anim-delay-1">Привет! </span>
                <span className="anim-line anim-delay-2">Это Флюгер — твой гид </span>
                <span className="anim-line anim-delay-3">по развлечениям и досугу</span>
              </h1>
            </div>

            <div className="stage-bottom-visual visual-bleed">
              <PartyAnimation />
            </div>
          </div>
        )}

        {/* ===================================================
            ЭТАП 1: "Ищи новые мероприятия на интерактивной карте с алгоритмами"
            =================================================== */}
        {step === 1 && (
          <div className="stage-content stage-layout-bottom-anim">
            <div className="stage-text-block">
              <h1 className="stage-chat-line">
                <span className="anim-line anim-delay-1">Ищи новые мероприятия </span>
                <span className="anim-line anim-delay-2">на интерактивной карте </span>
                <span className="anim-line anim-delay-3">с алгоритмами</span>
              </h1>
            </div>

            <div className="stage-bottom-visual visual-bleed">
              <MapAnimation />
            </div>
          </div>
        )}

        {/* ===================================================
            ЭТАП 2: "Есть желание где-то побывать, но не знаешь где? Воспользуйся нашим ИИ"
            =================================================== */}
        {step === 2 && (
          <div className="stage-content stage-layout-bottom-anim">
            <div className="stage-text-block">
              <h1 className="stage-chat-line">
                <span className="anim-line anim-delay-1">Есть желание где-то побывать, </span>
                <span className="anim-line anim-delay-2">но не знаешь где? </span>
                <span className="anim-line anim-delay-3">Воспользуйся нашим ИИ</span>
              </h1>
            </div>

            <div className="stage-bottom-visual visual-bleed">
              <FlugerAIAnimation mode="demo" />
            </div>
          </div>
        )}

        {/* ===================================================
            ЭТАП 3: "Планируешь встретиться с друзьями? Создай своё мероприятие и приглашай друзей"
            =================================================== */}
        {step === 3 && (
          <div className="stage-content stage-layout-bottom-anim">
            <div className="stage-text-block">
              <h1 className="stage-chat-line">
                <span className="anim-line anim-delay-1">Планируешь встретиться с друзьями? </span>
                <span className="anim-line anim-delay-2">Создай своё мероприятие </span>
                <span className="anim-line anim-delay-3">и приглашай друзей</span>
              </h1>
            </div>

            <div className="stage-bottom-visual visual-bleed">
              <CreateEventAnimation />
            </div>
          </div>
        )}

        {/* ===================================================
            ЭТАП 4: Ураган возможностей
            =================================================== */}
        {step === 4 && (
          <div className="stage-content stage-layout-bottom-anim">
            <div className="stage-text-block">
              <h1 className="stage-chat-line">
                <span className="anim-line anim-delay-1">И ещё ураган возможностей </span>
                <span className="anim-line anim-delay-2">в нашем приложении!</span>
              </h1>
            </div>

            <div className="stage-bottom-visual anim-line anim-delay-3">
              <HurricaneAnimation />
            </div>
          </div>
        )}

        {/* ===================================================
            ЭТАП 5: Поле имени СВЕРХУ с закругленной рамкой (без выбора города)
            =================================================== */}
        {step === 5 && (
          <div className="stage-content stage-layout-top-form">
            <div className="stage-top-block">
              <h1 className="stage-main-title anim-line anim-delay-1">
                А теперь давай познакомимся
              </h1>

              <div className="name-input-frame-wrap anim-line anim-delay-2">
                <div className="name-input-frame">
                  <input
                    type="text"
                    className="framed-name-input"
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 20))}
                    placeholder="Твоё имя или ник"
                    maxLength={20}
                    autoFocus
                  />
                  <span className="name-char-counter">
                    {name.length}/20
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            ЭТАП 6: Возраст СВЕРХУ, рамки с закругленными краями, без слова "лет", красивая компоновка
            =================================================== */}
        {step === 6 && (
          <div className="stage-content stage-layout-top-form">
            <div className="stage-top-block">
              <h1 className="stage-main-title anim-line anim-delay-1">
                Расскажи, сколько тебе лет
              </h1>

              <div className="age-framed-group anim-line anim-delay-2">
                {AGE_GROUPS.map((age) => (
                  <button
                    key={age}
                    type="button"
                    className={`age-framed-button ${ageGroup === age ? 'selected' : ''}`}
                    onClick={() => handleAgeSelect(age)}
                  >
                    <span className="age-framed-val">{age}</span>
                    {ageGroup === age && (
                      <div className="age-framed-check">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            ЭТАП 7: Кружки с полами ПО ЦЕНТРУ
            =================================================== */}
        {step === 7 && (
          <div className="stage-content stage-centered-layout">
            <div className="stage-top-block">
              <h1 className="stage-main-title anim-line anim-delay-1">
                Подскажи свой пол
              </h1>
            </div>

            <div className="gender-center-stage anim-line anim-delay-2">
              <div className="seamless-gender-circles">
                {getGenderOptions(ageGroup).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`gender-circle-btn ${gender === opt.value ? 'selected' : ''}`}
                    onClick={() => {
                      triggerHaptic('selection');
                      setGender(opt.value);
                    }}
                  >
                    <div className="gender-circle-inner">
                      <span className="gender-circle-icon"><EmojiIcon e={opt.icon} /></span>
                      <span className="gender-circle-label">{opt.label}</span>
                    </div>
                    {gender === opt.value && (
                      <div className="gender-circle-check">
                        <Check size={14} strokeWidth={3} color="#ffffff" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            ЭТАП 8: Кружки с интересами (Шестиугольный Apple Watch Grid)
            =================================================== */}
        {step === 8 && (
          <div className="stage-content stage-interests-layout">
            <div className="stage-top-block stage-interests-header-box">
              <h1 className="stage-main-title anim-line anim-delay-1">
                Осталось рассказать об интересах
              </h1>
            </div>

            <div className="stage-interests-grid-wrap anim-line anim-delay-2">
              <AppleWatchGrid
                selectedInterests={interests}
                onToggle={toggleInterest}
              />
            </div>
          </div>
        )}

        {/* ===================================================
            ЭТАП 9: "Ура, теперь мы знакомы!"
            =================================================== */}
        {step === 9 && (
          <div className="stage-content stage-layout-bottom-anim welcome-screen-content">
            <div className="stage-text-block">
              <div className="welcome-avatar-ring anim-line anim-delay-1">
                <span className="welcome-avatar-icon">
                  <EmojiIcon e={getGenderOptions(ageGroup).find((o) => o.value === gender)?.icon || '🌟'} />
                </span>
                <div className="welcome-sparkle-badge">
                  <Check size={14} strokeWidth={3} />
                </div>
              </div>

              <h1 className="stage-main-title welcome-title anim-line anim-delay-2">
                Ура, теперь мы знакомы!
              </h1>
            </div>

            <div className="stage-bottom-visual anim-line anim-delay-3">
              <div className="welcome-summary-card">
                <div className="summary-item">
                  <span className="summary-label">Возраст</span>
                  <span className="summary-val">{ageGroup}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Интересы</span>
                  <span className="summary-val">
                    {selectedInterestsData.slice(0, 3).map((i) => (
                      <EmojiIcon key={i.id} e={i.emoji} />
                    ))}
                    {selectedInterestsData.length > 3 && ` +${selectedInterestsData.length - 3}`}
                  </span>
                </div>
              </div>

              <div className="welcome-countdown-box">
                <div className="countdown-ring-track">
                  <span className="countdown-number">{welcomeSecondsLeft}</span>
                </div>
                <span className="countdown-label">
                  Переход к загрузке через {welcomeSecondsLeft} сек...
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================
          ЕДИНАЯ НИЖНЯЯ ПАНЕЛЬ ДЕЙСТВИЙ (ВСЕ КНОПКИ ВНИЗУ ЭКРАНА)
          =================================================== */}
      <div className="onboarding-bottom-actions-bar">
        {/* Левый угол: стрелочка назад (на всех этапах кроме 0 и 9) */}
        <div className="action-slot slot-left">
          {step > 0 && step < 9 && (
            <button
              type="button"
              className="onboarding-corner-arrow-btn corner-back"
              onClick={handleBack}
              aria-label="Назад"
            >
              <ArrowLeft size={19} />
            </button>
          )}
        </div>

        {/* Центральный слот: кнопки действий внизу экрана */}
        <div className="action-slot slot-center">
          {/* Этап 4: Кнопка "Продолжить" */}
          {step === 4 && (
            <button
              type="button"
              className="onboarding-bottom-main-btn anim-line anim-delay-3"
              onClick={handleNext}
            >
              <span>Продолжить</span>
              <ArrowRight size={17} />
            </button>
          )}

          {/* Этап 8: Кнопка "Завершить" при выборе >= 1 интереса */}
          {step === 8 && interests.length >= 1 && (
            <button
              type="button"
              className="onboarding-bottom-main-btn finish-btn anim-line anim-delay-2"
              onClick={handleFinishInterests}
            >
              <span>Завершить ({interests.length})</span>
              <Check size={18} strokeWidth={2.5} />
            </button>
          )}

          {/* Этап 9: Кнопка "Погнали сейчас!" */}
          {step === 9 && (
            <button
              type="button"
              className="onboarding-bottom-fast-btn anim-line anim-delay-3"
              onClick={finishOnboardingAndLoadApp}
            >
              <span>Погнали сейчас!</span>
              <ArrowRight size={15} />
            </button>
          )}
        </div>

        {/* Правый угол: стрелочка вперед (на этапах без явной центральной кнопки) */}
        <div className="action-slot slot-right">
          {step !== 4 && step !== 8 && step < 9 && (
            <button
              type="button"
              className="onboarding-corner-arrow-btn corner-next"
              onClick={handleNext}
              disabled={step === 5 && !name.trim()}
              aria-label="Вперед"
            >
              <ArrowRight size={19} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
