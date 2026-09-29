import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { EventItem, EventTabType } from '../../types/event';
import type { UserProfile } from '../../types/user';
import { getEventCategoryConfig } from '../../config/categories.config';
import { parseEventPrice, getMaxEventPrice } from '../../lib/priceUtils';
import { EventCard } from './EventCard';
import { EventDetailModal } from './EventDetailModal';
import { EventsFilterSheet } from './EventsFilterSheet';
import { triggerHaptic } from '../../lib/maxBridge';
import {
  Search,
  Calendar,
  Heart,
  BookmarkCheck,
  History,
  SlidersHorizontal,
  X,
  Loader2,
} from 'lucide-react';
import './EventsScreen.css';
import { EmojiIcon } from '../icons/EmojiIcon';

interface EventsScreenProps {
  events: EventItem[];
  profile: UserProfile | null;
  onUpdateCity: (citySlug: string) => void;
  onToggleStatus: (eventId: string, key: 'saved' | 'wantToAttend' | 'attended') => void;
  isSaved: (eventId: string) => boolean;
  isWantToAttend: (eventId: string) => boolean;
  isAttended: (eventId: string) => boolean;
  onOpenChat: (eventId: string) => void;
  onDeleteEvent?: (eventId: string) => void;
}

interface ToastMessage {
  id: number;
  text: string;
  actionText?: string;
  onAction?: () => void;
}

const formatDateISO = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const EventsScreen: React.FC<EventsScreenProps> = ({
  events,
  profile,
  onToggleStatus,
  isSaved,
  isWantToAttend,
  isAttended,
  onOpenChat,
  onDeleteEvent,
}) => {
  // Главная вкладка: 'all' (Афиша) или 'my' (Мои события)
  const [mainTab, setMainTab] = useState<'all' | 'my'>('all');
  // Подвкладка внутри "Мои мероприятия"
  const [mySubTab, setMySubTab] = useState<EventTabType>('saved');

  // Поиск
  const [searchQuery, setSearchQuery] = useState('');

  // Категории
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Даты ОТ и ДО
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [quickDateActive, setQuickDateActive] = useState<
    'today' | 'tomorrow' | 'weekend' | 'all' | 'custom'
  >('all');

  // Стоимость билетов
  const maxPossiblePrice = useMemo(() => getMaxEventPrice(events), [events]);
  const [priceRange, setPriceRange] = useState<[number, number]>([50, maxPossiblePrice]);
  const [isFreeOnly, setIsFreeOnly] = useState(false);

  // Синхронизация максимальной цены при загрузке событий
  useEffect(() => {
    if (maxPossiblePrice > 0) {
      setPriceRange((prev) => [prev[0], Math.max(prev[1], maxPossiblePrice)]);
    }
  }, [maxPossiblePrice]);

  // Шторка фильтров снизу
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Выбранное событие для модалки детализации
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  // Скрытые (свайпнутые влево) события
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Тосты обратной связи
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Бесконечная лента: видимое количество элементов
  const [visibleLimit, setVisibleLimit] = useState(12);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Показ тоста
  const showToast = useCallback((text: string, actionText?: string, onAction?: () => void) => {
    const id = Date.now();
    setToast({ id, text, actionText, onAction });
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast((current) => (current?.id === toast.id ? null : current));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Быстрые кнопки дат
  const handleSelectQuickDate = (type: 'today' | 'tomorrow' | 'weekend' | 'all') => {
    if (type === 'all') {
      setDateFrom('');
      setDateTo('');
      setQuickDateActive('all');
      return;
    }

    const now = new Date();
    if (type === 'today') {
      const s = formatDateISO(now);
      setDateFrom(s);
      setDateTo(s);
      setQuickDateActive('today');
    } else if (type === 'tomorrow') {
      const tmrw = new Date(now);
      tmrw.setDate(tmrw.getDate() + 1);
      const s = formatDateISO(tmrw);
      setDateFrom(s);
      setDateTo(s);
      setQuickDateActive('tomorrow');
    } else if (type === 'weekend') {
      const day = now.getDay();
      const distToSat = (6 - day + 7) % 7;
      const sat = new Date(now);
      sat.setDate(now.getDate() + (distToSat === 0 && now.getHours() > 20 ? 7 : distToSat));
      const sun = new Date(sat);
      sun.setDate(sat.getDate() + 1);
      setDateFrom(formatDateISO(sat));
      setDateTo(formatDateISO(sun));
      setQuickDateActive('weekend');
    }
  };

  // Ручной ввод дат ОТ и ДО
  const handleDateFromChange = (val: string) => {
    setDateFrom(val);
    setQuickDateActive('custom');
  };

  const handleDateToChange = (val: string) => {
    setDateTo(val);
    setQuickDateActive('custom');
  };

  // Фильтрация событий
  const baseFilteredEvents = useMemo(() => {
    let list = [...events];

    // Исключаем скрытые пользователем (свайп влево)
    if (dismissedIds.size > 0) {
      list = list.filter((e) => !dismissedIds.has(e.id));
    }

    // В Афише (общий каталог) не показываем мероприятия от пользователей
    if (mainTab === 'all') {
      list = list.filter((e) => !e.isCustom);
    }

    // Если открыта вкладка "Мои события"
    if (mainTab === 'my') {
      if (mySubTab === 'saved') {
        list = list.filter((e) => isSaved(e.id));
      } else if (mySubTab === 'want_to_attend') {
        list = list.filter((e) => isWantToAttend(e.id));
      } else if (mySubTab === 'history') {
        list = list.filter((e) => isAttended(e.id) || new Date(e.date).getTime() < Date.now());
      }
    }

    // Текстовый поиск
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.place.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q)
      );
    }

    // Фильтр по категории
    if (selectedCategory !== 'all') {
      list = list.filter((e) => e.category === selectedCategory);
    }

    // Фильтр по дате ОТ
    if (dateFrom) {
      list = list.filter((e) => {
        const eventDay = e.date.slice(0, 10);
        return eventDay >= dateFrom;
      });
    }

    // Фильтр по дате ДО
    if (dateTo) {
      list = list.filter((e) => {
        const eventDay = e.date.slice(0, 10);
        return eventDay <= dateTo;
      });
    }

    // Фильтр по стоимости
    if (isFreeOnly) {
      list = list.filter((e) => parseEventPrice(e.price).isFree);
    } else if (priceRange[0] > 50 || priceRange[1] < maxPossiblePrice) {
      list = list.filter((e) => {
        const { isFree, amount } = parseEventPrice(e.price);
        if (isFree) return priceRange[0] <= 50;
        return amount >= priceRange[0] && amount <= priceRange[1];
      });
    }

    return list;
  }, [
    events,
    dismissedIds,
    mainTab,
    mySubTab,
    searchQuery,
    selectedCategory,
    dateFrom,
    dateTo,
    isFreeOnly,
    priceRange,
    maxPossiblePrice,
    isSaved,
    isWantToAttend,
    isAttended,
  ]);

  // Сброс лимита при смене фильтров
  useEffect(() => {
    setVisibleLimit(12);
  }, [mainTab, mySubTab, searchQuery, selectedCategory, dateFrom, dateTo, isFreeOnly, priceRange]);

  // Генерация почти бесконечной ленты событий
  const displayEvents = useMemo(() => {
    if (baseFilteredEvents.length === 0) return [];

    if (mainTab === 'my') {
      return baseFilteredEvents.slice(0, visibleLimit);
    }

    const result: EventItem[] = [];
    const pool = baseFilteredEvents;
    const countNeeded = visibleLimit;

    let cycle = 0;
    while (result.length < countNeeded && cycle < 20) {
      for (let i = 0; i < pool.length; i++) {
        if (result.length >= countNeeded) break;
        const base = pool[i];
        if (cycle === 0) {
          result.push(base);
        } else {
          const futureDate = new Date(new Date(base.date).getTime() + cycle * 7 * 86400000);
          result.push({
            ...base,
            id: `${base.id}_loop_${cycle}_${i}`,
            date: futureDate.toISOString(),
          });
        }
      }
      cycle++;
    }

    return result;
  }, [baseFilteredEvents, visibleLimit, mainTab]);

  // Бесконечный скролл
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && baseFilteredEvents.length > 0) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setVisibleLimit((prev) => prev + 10);
            setIsLoadingMore(false);
          }, 350);
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isLoadingMore, baseFilteredEvents.length]);

  // Проверка активности фильтров
  const hasDateFilter = Boolean(dateFrom || dateTo || (quickDateActive !== 'all' && quickDateActive !== 'custom'));
  const hasPriceFilter = isFreeOnly || priceRange[0] > 50 || priceRange[1] < maxPossiblePrice;
  const hasCategoryFilter = selectedCategory !== 'all';

  const activeFiltersCount =
    (hasDateFilter ? 1 : 0) + (hasPriceFilter ? 1 : 0) + (hasCategoryFilter ? 1 : 0);
  const hasActiveFilters = activeFiltersCount > 0;

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setDateFrom('');
    setDateTo('');
    setQuickDateActive('all');
    setIsFreeOnly(false);
    setPriceRange([50, maxPossiblePrice]);
  };

  // Обработка жеста: свайп вправо (Сохранить)
  const handleSwipeSave = (event: EventItem) => {
    const willBeSaved = !isSaved(event.id);
    onToggleStatus(event.id, 'saved');
    showToast(
      willBeSaved ? `«${event.title}» в закладках` : `Удалено из закладок`
    );
  };

  // Обработка жеста: свайп влево (Неинтересно)
  const handleSwipeDismiss = (eventId: string, eventTitle: string) => {
    setDismissedIds((prev) => new Set(prev).add(eventId));
    showToast(`Событие скрыто`, 'Отменить', () => {
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    });
  };

  const selectedCategoryConfig =
    selectedCategory !== 'all' ? getEventCategoryConfig(selectedCategory) : null;

  // Форматирование дат для чипсов
  const dateChipLabel = useMemo(() => {
    if (quickDateActive === 'today') return 'Сегодня';
    if (quickDateActive === 'tomorrow') return 'Завтра';
    if (quickDateActive === 'weekend') return 'На выходных';
    if (dateFrom && dateTo) {
      if (dateFrom === dateTo) return dateFrom.slice(5).replace('-', '.');
      return `${dateFrom.slice(5).replace('-', '.')} — ${dateTo.slice(5).replace('-', '.')}`;
    }
    if (dateFrom) return `с ${dateFrom.slice(5).replace('-', '.')}`;
    if (dateTo) return `до ${dateTo.slice(5).replace('-', '.')}`;
    return null;
  }, [quickDateActive, dateFrom, dateTo]);

  return (
    <div className="events-screen">
      {/* Шапка: Переключатель "Афиша" / "Мои события" (город слева сверху скрыт) */}
      <header className="events-header">
        <div className="events-top-row centered">
          <div className="main-tab-toggle">
            <button
              className={`toggle-btn ${mainTab === 'all' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic('selection');
                setMainTab('all');
              }}
            >
              Афиша
            </button>
            <button
              className={`toggle-btn ${mainTab === 'my' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic('selection');
                setMainTab('my');
              }}
            >
              Мои события
            </button>
          </div>
        </div>

        {/* Подвкладки "Мои события" */}
        {mainTab === 'my' && (
          <div className="my-subtabs">
            <button
              className={`subtab-btn ${mySubTab === 'saved' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic('selection');
                setMySubTab('saved');
              }}
            >
              <Heart size={14} />
              <span>Сохранённые</span>
            </button>
            <button
              className={`subtab-btn ${mySubTab === 'want_to_attend' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic('selection');
                setMySubTab('want_to_attend');
              }}
            >
              <BookmarkCheck size={14} />
              <span>Хочу пойти</span>
            </button>
            <button
              className={`subtab-btn ${mySubTab === 'history' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic('selection');
                setMySubTab('history');
              }}
            >
              <History size={14} />
              <span>История</span>
            </button>
          </div>
        )}

        {/* Строка поиска с кнопкой фильтра снизу */}
        <div className="search-and-filter-row">
          <div className="search-bar">
            <Search size={17} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Поиск событий, артистов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Очистить поиск"
              >
                <X size={14} strokeWidth={2.6} />
              </button>
            )}
          </div>

          {/* Кнопка открытия фильтров снизу */}
          <button
            type="button"
            className={`btn-open-filter ${hasActiveFilters ? 'active' : ''}`}
            onClick={() => {
              triggerHaptic('light');
              setIsFilterSheetOpen(true);
            }}
            aria-label="Фильтры"
            title="Открыть фильтры"
          >
            <SlidersHorizontal size={18} />
            {hasActiveFilters && (
              <span className="filter-badge-count">{activeFiltersCount}</span>
            )}
          </button>
        </div>

        {/* Быстрые чипсы активных фильтров (без ярких цветов категорий) */}
        {hasActiveFilters && (
          <div className="active-filter-chips">
            {dateChipLabel && (
              <button
                type="button"
                className="active-chip"
                onClick={() => {
                  triggerHaptic('selection');
                  handleSelectQuickDate('all');
                }}
              >
                <span><EmojiIcon e="📅" /> {dateChipLabel}</span>
                <X size={12} className="chip-remove" />
              </button>
            )}

            {hasPriceFilter && (
              <button
                type="button"
                className="active-chip"
                onClick={() => {
                  triggerHaptic('selection');
                  setIsFreeOnly(false);
                  setPriceRange([50, maxPossiblePrice]);
                }}
              >
                <span>
                  <EmojiIcon e="🏷️" /> {isFreeOnly ? 'Бесплатно' : `${priceRange[0]}–${priceRange[1]} ₽`}
                </span>
                <X size={12} className="chip-remove" />
              </button>
            )}

            {selectedCategoryConfig && (
              <button
                type="button"
                className="active-chip"
                onClick={() => {
                  triggerHaptic('selection');
                  setSelectedCategory('all');
                }}
              >
                <span>
                  <EmojiIcon e={selectedCategoryConfig.emoji} /> {selectedCategoryConfig.label}
                </span>
                <X size={12} className="chip-remove" />
              </button>
            )}

            <button
              type="button"
              className="active-chip reset-all"
              onClick={() => {
                triggerHaptic('selection');
                handleResetFilters();
              }}
            >
              Сбросить всё
            </button>
          </div>
        )}

        {/* Подсказка о жестах на картинке */}
        {mainTab === 'all' && displayEvents.length > 0 && (
          <div className="gestures-hint-bar">
            <span><EmojiIcon e="❤️" /> Свайп фото вправо — сохранить</span>
            <span className="hint-sep">•</span>
            <span><EmojiIcon e="👁️" /> Свайп фото влево — неинтересно</span>
          </div>
        )}
      </header>

      {/* Список событий (картинка по центру, инфо снизу) */}
      <main className="events-list">
        {displayEvents.length > 0 ? (
          <>
            {displayEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedEvent(event);
                }}
                onToggleSaved={() => handleSwipeSave(event)}
                onDismiss={() => handleSwipeDismiss(event.id, event.title)}
                isSaved={isSaved(event.id)}
                isWantToAttend={isWantToAttend(event.id)}
              />
            ))}

            {/* Элемент-сенсор для бесконечного скролла */}
            <div ref={sentinelRef} className="infinite-scroll-sentinel">
              {isLoadingMore && (
                <div className="infinite-loading-indicator">
                  <Loader2 size={18} className="spinner" />
                  <span>Загружаем ещё события...</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="events-empty">
            <Calendar size={42} className="empty-icon" />
            <h3>Ничего не найдено</h3>
            <p>Попробуйте изменить диапазон цен, дат или сбросить фильтры.</p>
            {hasActiveFilters && (
              <button
                type="button"
                className="btn-empty-reset"
                onClick={handleResetFilters}
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        )}
      </main>

      {/* Выдвижная шторка фильтров снизу БЕЗ ПОДЛОЖЕК */}
      <EventsFilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        selectedCategory={selectedCategory}
        onSelectCategory={(catId) => setSelectedCategory(catId)}
        dateFrom={dateFrom}
        onDateFromChange={handleDateFromChange}
        dateTo={dateTo}
        onDateToChange={handleDateToChange}
        onSelectQuickDate={handleSelectQuickDate}
        quickDateActive={quickDateActive}
        priceRange={priceRange}
        onPriceRangeChange={setPriceRange}
        maxPossiblePrice={maxPossiblePrice}
        isFreeOnly={isFreeOnly}
        onToggleFreeOnly={setIsFreeOnly}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        filteredCount={baseFilteredEvents.length}
      />

      {/* Плавающий тост обратной связи со свайпов */}
      {toast && (
        <div className="event-toast-banner">
          <span className="toast-text">{toast.text}</span>
          {toast.actionText && toast.onAction && (
            <button
              type="button"
              className="toast-action-btn"
              onClick={() => {
                triggerHaptic('medium');
                toast.onAction?.();
                setToast(null);
              }}
            >
              {toast.actionText}
            </button>
          )}
        </div>
      )}

      {/* Модальное окно полной детализации события */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          profile={profile}
          isSaved={isSaved(selectedEvent.id)}
          isWantToAttend={isWantToAttend(selectedEvent.id)}
          onToggleSaved={() => onToggleStatus(selectedEvent.id, 'saved')}
          onToggleWant={() => onToggleStatus(selectedEvent.id, 'wantToAttend')}
          onOpenChat={onOpenChat}
          onDeleteEvent={onDeleteEvent}
        />
      )}
    </div>
  );
};
