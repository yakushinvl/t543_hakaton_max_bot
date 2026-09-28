// Тип нормализованного мероприятия от любого провайдера
export interface NormalizedEvent {
  id: string;
  source: string; // 'kudago' | 'moscow_culture' | 'spb_culture' | 'kzn_afisha' | 'custom'
  sourceName: string; // 'KudaGo' | 'Портал Культуры Москвы' | 'Афиша Санкт-Петербурга' | и т.д.
  title: string;
  place: string;
  address?: string;
  description: string;
  image: string;
  date: string;
  endDate?: string;
  category: string;
  ageRestricted: boolean;
  minAge?: number;
  citySlug: string;
  lon: number;
  lat: number;
  price?: string;
  externalUrl?: string;
  isCustom?: boolean;
  requiresRegistration?: boolean;
  registeredCount?: number;
  tags?: string[];
}

export interface EventProvider {
  name: string;
  citySlug?: string; // Если провайдер специализирован для конкретного города
  fetchEvents(citySlug: string): Promise<NormalizedEvent[]>;
}

// -------------------------------------------------------------
// 1. Утилиты очистки, маппинга и дедупликации
// -------------------------------------------------------------

export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').trim();
}

const CATEGORY_MAP: Record<string, string> = {
  concert: 'concert',
  music: 'concert',
  party: 'party',
  theater: 'theater',
  theatre: 'theater',
  cinema: 'cinema',
  movie: 'cinema',
  exhibition: 'exhibition',
  museum: 'exhibition',
  photo: 'exhibition',
  art: 'exhibition',
  festival: 'festival',
  holiday: 'festival',
  recreation: 'sport',
  sport: 'sport',
  'wellness-and-health': 'sport',
  'social-activity': 'volunteer',
  volunteer: 'volunteer',
  tour: 'walk',
  walk: 'walk',
  excursion: 'walk',
  quest: 'quest',
  entertainment: 'quest',
  kids: 'kids',
  children: 'kids',
  education: 'education',
  science: 'education',
  business: 'education',
  fair: 'food',
  food: 'food',
  gastro: 'food',
  fashion: 'fashion',
  shopping: 'fashion',
};

export function normalizeCategory(rawCat: string | string[]): string {
  const cats = Array.isArray(rawCat) ? rawCat : [rawCat];
  for (const c of cats) {
    if (!c) continue;
    const lower = c.toLowerCase().trim();
    if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];
  }
  return 'exhibition';
}

/**
 * Нормализует заголовок для сравнения: нижний регистр, убирает спецсимволы, кавычки и лишние пробелы.
 */
export function normalizeTitleForDeduplication(title: string): string {
  return title
    .toLowerCase()
    .replace(/[«»""''„“–—\-:;.,!?()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Расчет расстояния между двумя гео-координатами в километрах (Haversine formula)
 */
export function calculateGeoDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Радиус Земли в км
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Дедупликация мероприятий из разных источников.
 * Если совпадает нормализованное название (или одно является префиксом другого)
 * И расстояние между точками меньше 1.5 км (или одна и та же площадка),
 * объединяем их в одну запись, обогащая ссылками и деталями.
 */
export function deduplicateEvents(items: NormalizedEvent[]): NormalizedEvent[] {
  const result: NormalizedEvent[] = [];

  for (const current of items) {
    const currentNormTitle = normalizeTitleForDeduplication(current.title);

    const existingIdx = result.findIndex((existing) => {
      const existingNormTitle = normalizeTitleForDeduplication(existing.title);

      // Проверка совпадения названия: либо точное, либо одно включает другое (от 8 символов)
      const titleMatches =
        currentNormTitle === existingNormTitle ||
        (currentNormTitle.length > 8 && existingNormTitle.length > 8 && (
          currentNormTitle.includes(existingNormTitle) || existingNormTitle.includes(currentNormTitle)
        ));

      if (!titleMatches) return false;

      // Проверка географической близости (в пределах 1.5 км)
      const distance = calculateGeoDistanceKm(current.lat, current.lon, existing.lat, existing.lon);
      return distance < 1.5;
    });

    if (existingIdx !== -1) {
      // Мероприятие уже есть из другого источника! Обогащаем его данными.
      const existing = result[existingIdx];
      // Если у текущего источника есть внешняя ссылка, а у имеющегося не было — добавляем
      if (!existing.externalUrl && current.externalUrl) {
        existing.externalUrl = current.externalUrl;
      }
      // Если у текущего более подробное описание — дополняем
      if (current.description.length > existing.description.length) {
        existing.description = current.description;
      }
      // Добавляем тег источника, чтобы пользователь видел, откуда собраны данные
      existing.tags = Array.from(new Set([...(existing.tags || []), existing.sourceName, current.sourceName]));
    } else {
      if (!current.tags) {
        current.tags = [current.sourceName];
      }
      result.push(current);
    }
  }

  return spreadOverlappingCoords(result);
}

/**
 * Небольшое визуальное смещение для маркеров, находящихся в абсолютно одинаковых координатах.
 */
export function spreadOverlappingCoords<T extends { lon: number; lat: number }>(items: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = `${item.lon.toFixed(5)},${item.lat.toFixed(5)}`;
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }

  const OFFSET_DEG = 0.00035;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.forEach((item, i) => {
      const angle = (2 * Math.PI * i) / group.length;
      const latRad = (item.lat * Math.PI) / 180;
      item.lon += (OFFSET_DEG * Math.cos(angle)) / Math.cos(latRad);
      item.lat += OFFSET_DEG * Math.sin(angle);
    });
  }
  return items;
}
