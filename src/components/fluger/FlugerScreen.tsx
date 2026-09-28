import React, { useState, useMemo } from 'react';
import type { EventItem } from '../../types/event';
import type { UserProfile } from '../../types/user';
import { triggerHaptic } from '../../lib/maxBridge';
import { CITIES } from '../../data/cities';
import { FlugerAIAnimation } from '../onboarding/animations/FlugerAIAnimation';
import {
  generateFlugerQuestions,
  queryFlugerAI,
  type FlugerAnswers,
  type FlugerResult,
} from '../../lib/flugerAI';
import {
  Calendar,
  MapPin,
  Check,
  ArrowLeft,
  ArrowRight,
  Heart,
} from 'lucide-react';
import './FlugerScreen.css';

interface FlugerScreenProps {
  events: EventItem[];
  profile: UserProfile | null;
  onSelectEvent: (event: EventItem) => void;
  onToggleStatus: (eventId: string, key: 'saved' | 'wantToAttend') => void;
  isSaved: (eventId: string) => boolean;
  isWantToAttend: (eventId: string) => boolean;
}

type ViewMode = 'intro' | 'quiz' | 'analyzing' | 'results';

export const FlugerScreen: React.FC<FlugerScreenProps> = ({
  events,
  profile,
  onSelectEvent,
  onToggleStatus,
  isSaved,
  isWantToAttend,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('intro');
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<FlugerAnswers>({});
  const [aiResult, setAiResult] = useState<FlugerResult | null>(null);

  // Название текущего города в предложном падеже
  const currentCity = useMemo(() => {
    return CITIES.find((c) => c.slug === profile?.citySlug)?.name || 'Казани';
  }, [profile?.citySlug]);

  // Вопросы, динамически генерируемые по базе событий города и интересам пользователя
  const questions = useMemo(() => {
    return generateFlugerQuestions(events, profile, answers, currentCity);
  }, [events, profile, answers.mood, currentCity]);

  const activeQuestion = questions[currentStep] || questions[0];

  // Старт
  const handleStartFlow = () => {
    triggerHaptic('medium');
    setCurrentStep(0);
    setAnswers({});
    setViewMode('quiz');
  };

  // Выбор сферы
  const handleSelectOption = (optionId: string) => {
    triggerHaptic('selection');
    const questionId = activeQuestion.id;

    const nextAnswers: FlugerAnswers = {
      ...answers,
      [questionId]: optionId,
    };
    setAnswers(nextAnswers);

    setTimeout(() => {
      if (currentStep < questions.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        runAIAnalysis(nextAnswers);
      }
    }, 180);
  };

  // Назад
  const handleBack = () => {
    triggerHaptic('light');
    if (viewMode === 'results') {
      setViewMode('intro');
      return;
    }
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      setViewMode('intro');
    }
  };

  // Запуск ИИ анализа
  const runAIAnalysis = async (finalAnswers: FlugerAnswers) => {
    setViewMode('analyzing');
    triggerHaptic('medium');

    try {
      const citySlug = profile?.citySlug || 'kzn';
      const result = await queryFlugerAI(events, profile, finalAnswers, citySlug, currentCity);

      setTimeout(() => {
        setAiResult(result);
        setViewMode('results');
        triggerHaptic('success');
      }, 1000);
    } catch {
      setViewMode('intro');
    }
  };

  return (
    <div className="fluger-container">
      {/* ========================================================
          1. НАЧАЛЬНЫЙ ЭКРАН (ТОЧЬ-В-ТОЧЬ КАК В ОНБОРДИНГЕ)
          ======================================================== */}
      {viewMode === 'intro' && (
        <div className="fluger-intro-view">
          <div className="stage-content stage-layout-bottom-anim">
            <div className="stage-text-block">
              <div className="stage-chat-line anim-line anim-delay-1">Куда дует ветер</div>
              <div className="stage-chat-line anim-line anim-delay-2">событий сегодня?</div>
              <div className="stage-chat-line anim-line anim-delay-3">Спроси у Флюгера</div>
            </div>

            <div className="stage-bottom-visual anim-line anim-delay-4">
              <FlugerAIAnimation statusText="" />
            </div>
          </div>

          <div className="onboarding-bottom-actions-bar">
            <button className="onboarding-bottom-main-btn" onClick={handleStartFlow}>
              Начать
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          2. ЭКРАН ВОПРОСОВ (ШРИФТ NUNITO + СФЕРЫ ОНБОРДИНГА)
          ======================================================== */}
      {viewMode === 'quiz' && activeQuestion && (
        <div className="fluger-quiz-view">
          <div className="stage-content">
            <div className="stage-top-block">
              <div className="fluger-nav-bar">
                <button className="fluger-nav-btn" onClick={handleBack}>
                  <ArrowLeft size={20} />
                  <span>Назад</span>
                </button>
              </div>

              <h1 className="stage-main-title anim-line anim-delay-1">
                {activeQuestion.title}
              </h1>
            </div>

            <div className="gender-center-stage anim-line anim-delay-2">
              <div className="fluger-spheres-grid">
                {activeQuestion.options.map((opt) => {
                  const isSelected = answers[activeQuestion.id as keyof FlugerAnswers] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`gender-circle-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectOption(opt.id)}
                    >
                      <div className="gender-circle-inner">
                        <span className="gender-circle-icon">{opt.emoji}</span>
                        <span className="gender-circle-label">{opt.label}</span>
                      </div>
                      {isSelected && (
                        <div className="gender-circle-check">
                          <Check size={14} strokeWidth={3} color="#ffffff" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="stage-bottom-visual">
            <FlugerAIAnimation statusText="" className="quiz-bottom-mini" />
          </div>
        </div>
      )}

      {/* ========================================================
          3. ЭКРАН АНАЛИЗА
          ======================================================== */}
      {viewMode === 'analyzing' && (
        <div className="fluger-analyzing-view">
          <div className="stage-content stage-layout-bottom-anim">
            <div className="stage-text-block">
              <h1 className="stage-main-title anim-line anim-delay-1">
                Флюгер ловит ветер...
              </h1>
            </div>

            <div className="stage-bottom-visual anim-line anim-delay-2">
              <FlugerAIAnimation isSpinning={true} statusText="" />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          4. ЭКРАН РЕЗУЛЬТАТОВ
          ======================================================== */}
      {viewMode === 'results' && aiResult && (
        <div className="fluger-results-view">
          <div className="stage-top-block fluger-results-top">
            <div className="fluger-nav-bar">
              <button className="fluger-nav-btn" onClick={() => setViewMode('intro')}>
                <ArrowLeft size={20} />
                <span>Заново</span>
              </button>
            </div>

            <h1 className="stage-main-title">
              {aiResult.summaryTitle}
            </h1>
          </div>

          <div className="fluger-cards-stream">
            {aiResult.recommendations.map((rec) => {
              const ev = rec.event;
              const saved = isSaved(ev.id);
              const want = isWantToAttend(ev.id);

              return (
                <div
                  key={ev.id}
                  className="stream-card"
                  onClick={() => onSelectEvent(ev)}
                >
                  <div className="stream-card-media">
                    <img src={ev.image} alt={ev.title} loading="lazy" />
                  </div>

                  <div className="stream-card-body">
                    <h3 className="stream-event-title">{ev.title}</h3>

                    <div className="stream-info-grid">
                      <div className="stream-info-item">
                        <Calendar size={14} />
                        <span>
                          {new Date(ev.date).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            weekday: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="stream-info-item">
                        <MapPin size={14} />
                        <span>{ev.place}</span>
                      </div>
                    </div>

                    <div className="stream-card-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className={`stream-action-btn stream-heart-btn ${saved ? 'active' : ''}`}
                        onClick={() => {
                          triggerHaptic('selection');
                          onToggleStatus(ev.id, 'saved');
                        }}
                        title="В избранное"
                      >
                        <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
                      </button>

                      <button
                        className={`stream-action-btn stream-want-btn ${want ? 'active' : ''}`}
                        onClick={() => {
                          triggerHaptic('success');
                          onToggleStatus(ev.id, 'wantToAttend');
                        }}
                      >
                        {want ? (
                          <>
                            <Check size={16} />
                            <span>Иду</span>
                          </>
                        ) : (
                          <span>Хочу пойти</span>
                        )}
                      </button>

                      <button
                        className="stream-action-btn stream-details-btn"
                        onClick={() => onSelectEvent(ev)}
                      >
                        <span>Открыть</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="stage-bottom-visual">
            <FlugerAIAnimation
              compassAngle={aiResult.compassAngle}
              statusText=""
            />
          </div>

          <div className="onboarding-bottom-actions-bar">
            <button className="onboarding-bottom-main-btn" onClick={handleStartFlow}>
              Повторить
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
