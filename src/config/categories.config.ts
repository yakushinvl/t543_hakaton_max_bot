/**
 * Конфигурация категорий мероприятий, их цветовой палитры и визуальных свойств
 */

export interface EventCategoryConfigItem {
  id: string;
  label: string;
  emoji: string;
  color: string;
  glowColor: string;
  description?: string;
}

export const EVENT_CATEGORIES_CONFIG: EventCategoryConfigItem[] = [
  {
    id: 'concert',
    label: 'Концерты',
    emoji: '🎸',
    color: '#ff4757',
    glowColor: 'rgba(255, 71, 87, 0.45)',
    description: 'Живая музыка, выступления групп и артистов',
  },
  {
    id: 'theater',
    label: 'Театр',
    emoji: '🎭',
    color: '#5f27cd',
    glowColor: 'rgba(95, 39, 205, 0.45)',
    description: 'Спектакли, оперы, драмы и перформансы',
  },
  {
    id: 'cinema',
    label: 'Кино',
    emoji: '🎬',
    color: '#341f97',
    glowColor: 'rgba(52, 31, 151, 0.45)',
    description: 'Кинопоказы, премьеры и фестивали кино',
  },
  {
    id: 'exhibition',
    label: 'Выставки & Арт',
    emoji: '🎨',
    color: '#ff6b6b',
    glowColor: 'rgba(255, 107, 107, 0.45)',
    description: 'Галереи, музеи, современное искусство и скульптура',
  },
  {
    id: 'festival',
    label: 'Фестивали',
    emoji: '🎪',
    color: '#ff9f43',
    glowColor: 'rgba(255, 159, 67, 0.45)',
    description: 'Масштабные городские опен-эйры и праздники',
  },
  {
    id: 'sport',
    label: 'Спорт & Фитнес',
    emoji: '🏀',
    color: '#10ac84',
    glowColor: 'rgba(16, 172, 132, 0.45)',
    description: 'Матчи, турниры, марафоны и открытые тренировки',
  },
  {
    id: 'walk',
    label: 'Прогулки & Туры',
    emoji: '🚶',
    color: '#1dd1a1',
    glowColor: 'rgba(29, 209, 161, 0.45)',
    description: 'Экскурсии, архитектурные туры и видовые маршруты',
  },
  {
    id: 'quest',
    label: 'Квесты & Игры',
    emoji: '🎲',
    color: '#0abde3',
    glowColor: 'rgba(10, 189, 227, 0.45)',
    description: 'Городские квесты, квизы и настольные баттлы',
  },
  {
    id: 'party',
    label: 'Вечеринки & Стендап',
    emoji: '🎉',
    color: '#f368e0',
    glowColor: 'rgba(243, 104, 224, 0.45)',
    description: 'Диджей-сеты, стендапы, клубы и шоу-программы',
  },
  {
    id: 'standup',
    label: 'Стендап',
    emoji: '🎤',
    color: '#a55eea',
    glowColor: 'rgba(165, 94, 234, 0.45)',
    description: 'Вечера юмора и выступления резидентов',
  },
  {
    id: 'kids',
    label: 'Семья & Дети',
    emoji: '🧸',
    color: '#feca57',
    glowColor: 'rgba(254, 202, 87, 0.45)',
    description: 'Шоу, аниматоры, детские спектакли и мастер-классы',
  },
  {
    id: 'education',
    label: 'IT & Лекции',
    emoji: '💡',
    color: '#48dbfb',
    glowColor: 'rgba(72, 219, 251, 0.45)',
    description: 'Митапы, образовательные интенсивы и технологии',
  },
  {
    id: 'food',
    label: 'Гастрономия',
    emoji: '🍕',
    color: '#ff793f',
    glowColor: 'rgba(255, 121, 63, 0.45)',
    description: 'Стритфуд-маркеты, фестивали вкусов и дегустации',
  },
  {
    id: 'fashion',
    label: 'Мода & Дизайн',
    emoji: '✨',
    color: '#c56cf0',
    glowColor: 'rgba(197, 108, 240, 0.45)',
    description: 'Показы, маркеты локальных брендов и апсайклинг',
  },
  {
    id: 'outdoor',
    label: 'Природа & Парки',
    emoji: '🌲',
    color: '#2ed573',
    glowColor: 'rgba(46, 213, 115, 0.45)',
    description: 'Походы, сапбординг и отдых на свежем воздухе',
  },
  {
    id: 'volunteer',
    label: 'Добро & Помощь',
    emoji: '🤝',
    color: '#ee5253',
    glowColor: 'rgba(238, 82, 83, 0.45)',
    description: 'Благотворительные сборы, эко-акции и волонтерство',
  },
  {
    id: 'nightlife',
    label: 'Клубы & Ночь',
    emoji: '🪩',
    color: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.45)',
    description: 'Электронная музыка и ночные события',
  },
  {
    id: 'music_jazz',
    label: 'Джаз & Блюз',
    emoji: '🎷',
    color: '#e056fd',
    glowColor: 'rgba(224, 86, 253, 0.45)',
    description: 'Атмосферные джазовые джемы и живые концерты',
  },
  {
    id: 'photo',
    label: 'Фотография',
    emoji: '📸',
    color: '#ff9ff3',
    glowColor: 'rgba(255, 159, 243, 0.45)',
    description: 'Фотовыставки, фотопрогулки и воркшопы',
  },
  {
    id: 'books',
    label: 'Книги & Поэзия',
    emoji: '📚',
    color: '#54a0ff',
    glowColor: 'rgba(84, 160, 255, 0.45)',
    description: 'Литературные вечера, встречи с авторами и книжные клубы',
  },
  {
    id: 'yoga',
    label: 'Йога & Релакс',
    emoji: '🧘',
    color: '#5f27cd',
    glowColor: 'rgba(95, 39, 205, 0.45)',
    description: 'Медитации, звуковые ванны и практики баланса',
  },
  {
    id: 'extreme',
    label: 'Картинг & Драйв',
    emoji: '🏎️',
    color: '#ff3838',
    glowColor: 'rgba(255, 56, 56, 0.45)',
    description: 'Адреналин, заезды и экстремальные активности',
  },
];

const DEFAULT_CATEGORY_CONFIG: EventCategoryConfigItem = {
  id: 'other',
  label: 'Интересное',
  emoji: '✨',
  color: '#6c5ce7',
  glowColor: 'rgba(108, 92, 231, 0.45)',
  description: 'Городские события и встречи',
};

const categoriesMap = new Map<string, EventCategoryConfigItem>(
  EVENT_CATEGORIES_CONFIG.map((cat) => [cat.id, cat])
);

/**
 * Получить полную конфигурацию категории мероприятия по ID
 */
export function getEventCategoryConfig(categoryId?: string): EventCategoryConfigItem {
  if (!categoryId) return DEFAULT_CATEGORY_CONFIG;
  return categoriesMap.get(categoryId) || DEFAULT_CATEGORY_CONFIG;
}

/**
 * Получить цвет категории мероприятия (для обводки метки и градиента)
 */
export function getEventCategoryColor(categoryId?: string, fallback = '#6c5ce7'): string {
  if (!categoryId) return fallback;
  return categoriesMap.get(categoryId)?.color || fallback;
}

/**
 * Получить цвет свечения категории
 */
export function getEventCategoryGlowColor(categoryId?: string, fallback = 'rgba(108, 92, 231, 0.4)'): string {
  if (!categoryId) return fallback;
  return categoriesMap.get(categoryId)?.glowColor || fallback;
}

/**
 * Получить эмодзи категории мероприятия
 */
export function getEventCategoryEmoji(categoryId?: string, fallback = '✨'): string {
  if (!categoryId) return fallback;
  return categoriesMap.get(categoryId)?.emoji || fallback;
}

/**
 * Получить название категории мероприятия
 */
export function getEventCategoryLabel(categoryId?: string, fallback = 'Событие'): string {
  if (!categoryId) return fallback;
  return categoriesMap.get(categoryId)?.label || fallback;
}

/**
 * Получить все доступные категории мероприятий
 */
export function getAllEventCategories(): EventCategoryConfigItem[] {
  return EVENT_CATEGORIES_CONFIG;
}
