/**
 * Конфигурация интересов пользователя (используется в онбординге, профиле и фильтрах)
 */

export interface InterestConfigItem {
  id: string;
  label: string;
  emoji: string;
  color: string;
  kudagoCategories: string[];
}

export const INTERESTS_CONFIG: InterestConfigItem[] = [
  // Центр сетки онбординга
  { id: 'concert', label: 'Концерты', emoji: '🎸', color: '#ff4757', kudagoCategories: ['concert', 'party'] },

  // Кольцо 1 (6 основных интересов)
  { id: 'exhibition', label: 'Выставки & Арт', emoji: '🎨', color: '#ff6b6b', kudagoCategories: ['exhibition', 'photo'] },
  { id: 'theater', label: 'Театр', emoji: '🎭', color: '#5f27cd', kudagoCategories: ['theater'] },
  { id: 'cinema', label: 'Кино', emoji: '🎬', color: '#341f97', kudagoCategories: ['cinema'] },
  { id: 'food', label: 'Гастрономия', emoji: '🍕', color: '#ff793f', kudagoCategories: ['fair', 'entertainment'] },
  { id: 'festival', label: 'Фестивали', emoji: '🎪', color: '#ff9f43', kudagoCategories: ['festival', 'holiday'] },
  { id: 'party', label: 'Вечеринки', emoji: '🎉', color: '#f368e0', kudagoCategories: ['party', 'entertainment'] },

  // Кольцо 2 (12 интересов)
  { id: 'standup', label: 'Стендап', emoji: '🎤', color: '#a55eea', kudagoCategories: ['comedy', 'entertainment'] },
  { id: 'sport', label: 'Спорт & Фитнес', emoji: '🏀', color: '#10ac84', kudagoCategories: ['recreation', 'wellness-and-health'] },
  { id: 'walk', label: 'Прогулки & Туры', emoji: '🚶', color: '#1dd1a1', kudagoCategories: ['tour', 'walk'] },
  { id: 'quest', label: 'Квесты & Игры', emoji: '🎲', color: '#0abde3', kudagoCategories: ['quest', 'entertainment'] },
  { id: 'education', label: 'IT & Лекции', emoji: '💡', color: '#48dbfb', kudagoCategories: ['education', 'business'] },
  { id: 'outdoor', label: 'Природа & Парки', emoji: '🌲', color: '#2ed573', kudagoCategories: ['tour', 'recreation'] },
  { id: 'nightlife', label: 'Клубы & Ночь', emoji: '🪩', color: '#3b82f6', kudagoCategories: ['party', 'nightlife'] },
  { id: 'music_jazz', label: 'Джаз & Блюз', emoji: '🎷', color: '#e056fd', kudagoCategories: ['concert'] },
  { id: 'fashion', label: 'Мода & Дизайн', emoji: '✨', color: '#c56cf0', kudagoCategories: ['fashion', 'shopping'] },
  { id: 'wine', label: 'Дегустации', emoji: '🍷', color: '#eb4d4b', kudagoCategories: ['fair'] },
  { id: 'kids', label: 'Семья & Дети', emoji: '🧸', color: '#feca57', kudagoCategories: ['kids'] },
  { id: 'volunteer', label: 'Добро & Помощь', emoji: '🤝', color: '#ee5253', kudagoCategories: ['social-activity'] },

  // Кольцо 3
  { id: 'boardgames', label: 'Настолки', emoji: '♟️', color: '#4bcffa', kudagoCategories: ['games'] },
  { id: 'science', label: 'Наука & Космос', emoji: '🔭', color: '#00d2d3', kudagoCategories: ['education'] },
  { id: 'photo', label: 'Фотография', emoji: '📸', color: '#ff9ff3', kudagoCategories: ['photo'] },
  { id: 'books', label: 'Книги & Поэзия', emoji: '📚', color: '#54a0ff', kudagoCategories: ['education'] },
  { id: 'yoga', label: 'Йога & Релакс', emoji: '🧘', color: '#5f27cd', kudagoCategories: ['wellness-and-health'] },
  { id: 'extreme', label: 'Картинг & Драйв', emoji: '🏎️', color: '#ff3838', kudagoCategories: ['recreation'] },
];

const interestsMap = new Map<string, InterestConfigItem>(
  INTERESTS_CONFIG.map((item) => [item.id, item])
);

/**
 * Получить полную конфигурацию интереса по ID
 */
export function getInterestConfig(id?: string): InterestConfigItem | undefined {
  if (!id) return undefined;
  return interestsMap.get(id);
}

/**
 * Получить цвет интереса
 */
export function getInterestColor(id?: string, defaultColor = '#6c5ce7'): string {
  if (!id) return defaultColor;
  return interestsMap.get(id)?.color || defaultColor;
}

/**
 * Получить эмодзи интереса
 */
export function getInterestEmoji(id?: string, defaultEmoji = '✨'): string {
  if (!id) return defaultEmoji;
  return interestsMap.get(id)?.emoji || defaultEmoji;
}

/**
 * Получить человекочитаемое название интереса
 */
export function getInterestLabel(id?: string, defaultLabel = 'Событие'): string {
  if (!id) return defaultLabel;
  return interestsMap.get(id)?.label || defaultLabel;
}

/**
 * Получить список всех интересов для сетки онбординга
 */
export function getAllInterests(): InterestConfigItem[] {
  return INTERESTS_CONFIG;
}
