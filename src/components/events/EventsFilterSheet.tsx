import React from 'react';
import { getAllEventCategories } from '../../config/categories.config';
import { triggerHaptic } from '../../lib/maxBridge';
import { X, RotateCcw, Check, Calendar as CalendarIcon, Tag, CheckSquare, Square } from 'lucide-react';
import './EventsScreen.css';
import { EmojiIcon } from '../icons/EmojiIcon';

interface EventsFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  // Категории
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  // Даты ОТ и ДО
  dateFrom: string;
  onDateFromChange: (val: string) => void;
  dateTo: string;
  onDateToChange: (val: string) => void;
  onSelectQuickDate: (type: 'today' | 'tomorrow' | 'weekend' | 'all') => void;
  quickDateActive: 'today' | 'tomorrow' | 'weekend' | 'all' | 'custom';
  // Диапазон цен и галочка "Бесплатно"
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  maxPossiblePrice: number;
  isFreeOnly: boolean;
  onToggleFreeOnly: (val: boolean) => void;
  // Сброс и количество событий
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  filteredCount: number;
}

export const EventsFilterSheet: React.FC<EventsFilterSheetProps> = ({
  isOpen,
  onClose,
  selectedCategory,
  onSelectCategory,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onSelectQuickDate,
  quickDateActive,
  priceRange,
  onPriceRangeChange,
  maxPossiblePrice,
  isFreeOnly,
  onToggleFreeOnly,
  onResetFilters,
  hasActiveFilters,
  filteredCount,
}) => {
  if (!isOpen) return null;

  const categories = getAllEventCategories();

  // Расчёт процента диапазона цен для полоски слайдера
  const minPercent = Math.max(
    0,
    Math.min(100, ((priceRange[0] - 50) / (maxPossiblePrice - 50)) * 100)
  );
  const maxPercent = Math.max(
    0,
    Math.min(100, ((priceRange[1] - 50) / (maxPossiblePrice - 50)) * 100)
  );

  return (
    <div className="filter-sheet-overlay" onClick={onClose}>
      <div className="filter-sheet flat-filter-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Ручка шторки */}
        <div className="filter-sheet-handle-bar">
          <div className="filter-sheet-handle" />
        </div>

        {/* Заголовок без подложек */}
        <div className="filter-sheet-header flat-header">
          <div className="filter-sheet-title-group">
            <h3 className="filter-sheet-title">Фильтры</h3>
            {hasActiveFilters && (
              <button
                type="button"
                className="filter-reset-btn flat-reset-btn"
                onClick={() => {
                  triggerHaptic('light');
                  onResetFilters();
                }}
              >
                <RotateCcw size={13} />
                <span>Сбросить всё</span>
              </button>
            )}
          </div>
          <button
            type="button"
            className="filter-sheet-close-btn flat-close-btn"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            aria-label="Закрыть фильтры"
          >
            <X size={18} />
          </button>
        </div>

        {/* Тело фильтров БЕЗ ПОДЛОЖЕК */}
        <div className="filter-sheet-body flat-body">
          {/* СЕКЦИЯ 1: ДАТА (ОТ И ДО + БЫСТРЫЕ КНОПКИ) */}
          <div className="flat-filter-section">
            <div className="flat-section-header">
              <span className="flat-section-title">
                <CalendarIcon size={15} /> Дата проведения
              </span>
            </div>

            {/* Выбор дат ОТ и ДО */}
            <div className="date-range-row">
              <div className="date-input-field">
                <span className="date-input-label">От</span>
                <input
                  type="date"
                  className="flat-date-input"
                  value={dateFrom}
                  onChange={(e) => onDateFromChange(e.target.value)}
                />
              </div>

              <div className="date-range-separator">—</div>

              <div className="date-input-field">
                <span className="date-input-label">До</span>
                <input
                  type="date"
                  className="flat-date-input"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => onDateToChange(e.target.value)}
                />
              </div>
            </div>

            {/* Дополнительные быстрые кнопки */}
            <div className="quick-dates-row">
              {[
                { id: 'today', label: 'Сегодня' },
                { id: 'tomorrow', label: 'Завтра' },
                { id: 'weekend', label: 'На выходных' },
                { id: 'all', label: 'Любая дата' },
              ].map((q) => {
                const isActive = quickDateActive === q.id;
                return (
                  <button
                    key={q.id}
                    type="button"
                    className={`flat-pill-btn ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      triggerHaptic('selection');
                      onSelectQuickDate(q.id as any);
                    }}
                  >
                    {q.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* СЕКЦИЯ 2: СТОИМОСТЬ (ПОЛОСКА С ДВУМЯ ТОЧКАМИ ИЛИ ГАЛОЧКА "БЕСПЛАТНО") */}
          <div className="flat-filter-section">
            <div className="flat-section-header">
              <span className="flat-section-title">
                <Tag size={15} /> Стоимость билетов
              </span>
              <span className="price-display-val">
                {isFreeOnly
                  ? 'Только бесплатно'
                  : `${priceRange[0].toLocaleString('ru-RU')} ₽ — ${priceRange[1].toLocaleString('ru-RU')} ₽`}
              </span>
            </div>

            {/* Галочка "Бесплатно" */}
            <div className="free-checkbox-container">
              <label
                className="flat-checkbox-label"
                onClick={() => {
                  triggerHaptic('selection');
                  onToggleFreeOnly(!isFreeOnly);
                }}
              >
                <div className={`flat-checkbox-box ${isFreeOnly ? 'checked' : ''}`}>
                  {isFreeOnly && <Check size={14} className="checkbox-check-icon" />}
                </div>
                <span className="checkbox-text">Бесплатно</span>
              </label>
            </div>

            {/* Полоска с двумя точками (от 50р до макс) */}
            <div className={`dual-slider-box ${isFreeOnly ? 'disabled' : ''}`}>
              <div className="dual-slider-track-bg" />
              <div
                className="dual-slider-highlight-bar"
                style={{
                  left: `${minPercent}%`,
                  width: `${Math.max(0, maxPercent - minPercent)}%`,
                }}
              />
              <input
                type="range"
                min={50}
                max={maxPossiblePrice}
                step={50}
                value={priceRange[0]}
                disabled={isFreeOnly}
                onChange={(e) => {
                  const val = Math.min(Number(e.target.value), priceRange[1] - 50);
                  onPriceRangeChange([val, priceRange[1]]);
                }}
                className="dual-range-input thumb-min"
                aria-label="Минимальная цена"
              />
              <input
                type="range"
                min={50}
                max={maxPossiblePrice}
                step={50}
                value={priceRange[1]}
                disabled={isFreeOnly}
                onChange={(e) => {
                  const val = Math.max(Number(e.target.value), priceRange[0] + 50);
                  onPriceRangeChange([priceRange[0], val]);
                }}
                className="dual-range-input thumb-max"
                aria-label="Максимальная цена"
              />

              <div className="slider-labels-row">
                <span>50 ₽</span>
                <span>{maxPossiblePrice.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          </div>

          {/* СЕКЦИЯ 3: КАТЕГОРИИ МЕРОПРИЯТИЙ */}
          <div className="flat-filter-section">
            <div className="flat-section-header">
              <span className="flat-section-title">Категории</span>
            </div>

            <div className="flat-categories-wrap">
              {/* Все категории */}
              <button
                type="button"
                className={`flat-category-chip ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => {
                  triggerHaptic('selection');
                  onSelectCategory('all');
                }}
              >
                <span><EmojiIcon e="✨" /> Все темы</span>
              </button>

              {/* Категории */}
              {categories.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`flat-category-chip ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      triggerHaptic('selection');
                      onSelectCategory(cat.id);
                    }}
                  >
                    <span>
                      <EmojiIcon e={cat.emoji} /> {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Футер с кнопкой применить */}
        <div className="filter-sheet-footer flat-footer">
          <button
            type="button"
            className="filter-apply-btn flat-apply-btn"
            onClick={() => {
              triggerHaptic('success');
              onClose();
            }}
          >
            <span>Показать события</span>
            <span className="filter-count-badge">{filteredCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
