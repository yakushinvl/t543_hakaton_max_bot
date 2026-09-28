import { serverCache } from './cache';

const CATEGORY_MAP: Record<string, string> = {
  concert: 'concert',
  party: 'party',
  theater: 'theater',
  cinema: 'cinema',
  exhibition: 'exhibition',
  photo: 'exhibition',
  festival: 'festival',
  holiday: 'festival',
  recreation: 'sport',
  'wellness-and-health': 'sport',
  'social-activity': 'volunteer',
  tour: 'walk',
  quest: 'quest',
  entertainment: 'quest',
  kids: 'kids',
  education: 'education',
  business: 'education',
  fair: 'food',
  fashion: 'fashion',
  shopping: 'fashion',
};

function mapCategory(categories: string[]): string {
  for (const c of categories) {
    if (CATEGORY_MAP[c]) return CATEGORY_MAP[c];
  }
  return 'exhibition';
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').trim();
}

function spreadOverlappingCoords(items: any[]): any[] {
  const groups = new Map<string, any[]>();
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

export async function fetchKudaGoEventsForCity(citySlug: string): Promise<any[]> {
  const cacheKey = `kudago_city_${citySlug}`;
  const cached = serverCache.get<any[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const params = new URLSearchParams({
    location: citySlug,
    actual_since: String(nowSec),
    page_size: '80',
    fields: 'id,title,dates,place,description,images,age_restriction,categories,price',
    expand: 'place,images',
    order_by: '-publication_date',
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`https://kudago.com/public-api/v1.4/events/?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MaxEventBot/1.0)',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`KudaGo responded with ${res.status}`);
    }

    const data: any = await res.json();
    const items: any[] = [];

    for (const raw of data.results || []) {
      const coords = raw.place?.coords;
      if (!coords || typeof coords.lat !== 'number' || typeof coords.lon !== 'number') continue;

      const category = mapCategory(raw.categories || []);
      const MIN_TS = 946684800; // 2000-01-01
      const MAX_TS = 4102444800; // 2100-01-01
      const startSec = raw.dates?.find((d: any) => d.start && d.start > MIN_TS && d.start < MAX_TS)?.start;
      const date = startSec ? new Date(startSec * 1000).toISOString() : new Date().toISOString();
      const rawImage = raw.images?.[0]?.image;
      // Проксируем через наш сервер для стабильного CORS и кэша картинок
      const image = rawImage 
        ? `/kg-media${rawImage.replace('https://media.kudago.com', '')}` 
        : `https://picsum.photos/seed/kg${raw.id}/400/300`;

      const ageRestricted = raw.age_restriction ? parseInt(raw.age_restriction, 10) >= 18 : false;

      items.push({
        id: `kg-${raw.id}`,
        title: raw.title,
        place: raw.place?.title || 'Городская площадка',
        address: raw.place?.address || undefined,
        description: stripHtml(raw.description || '') || 'Приглашаем на городское мероприятие!',
        image,
        date,
        category,
        ageRestricted,
        minAge: raw.age_restriction ? parseInt(raw.age_restriction, 10) : 0,
        citySlug,
        lon: coords.lon,
        lat: coords.lat,
        price: raw.price || 'Бесплатно / уточняйте',
        isCustom: false,
        requiresRegistration: true,
        registeredCount: Math.floor(Math.random() * 25) + 3,
      });
    }

    const result = spreadOverlappingCoords(items);
    // Кэшируем на 45 минут
    serverCache.set(cacheKey, result, 45 * 60 * 1000);
    return result;
  } catch (err) {
    console.error(`Failed to fetch KudaGo events for ${citySlug}, using fallback:`, err);
    const fallback = generateServerFallbackEvents(citySlug);
    serverCache.set(cacheKey, fallback, 10 * 60 * 1000); // Кэшируем фоллбэк на 10 минут
    return fallback;
  }
}

const CITY_COORDS: Record<string, { name: string; lon: number; lat: number }> = {
  msk: { name: 'Москва', lon: 37.6176, lat: 55.7558 },
  spb: { name: 'Санкт-Петербург', lon: 30.3351, lat: 59.9343 },
  kzn: { name: 'Казань', lon: 49.1221, lat: 55.7887 },
  nsk: { name: 'Новосибирск', lon: 82.9346, lat: 55.0084 },
  ekb: { name: 'Екатеринбург', lon: 60.6122, lat: 56.8389 },
  nnv: { name: 'Нижний Новгород', lon: 44.0059, lat: 56.2965 },
  sam: { name: 'Самара', lon: 50.1606, lat: 53.2001 },
  ufa: { name: 'Уфа', lon: 55.9721, lat: 54.7388 },
  rnd: { name: 'Ростов-на-Дону', lon: 39.7015, lat: 47.2357 },
  krd: { name: 'Краснодар', lon: 38.9769, lat: 45.0355 },
  sochi: { name: 'Сочи', lon: 39.7257, lat: 43.6028 },
};

const SAMPLE_FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
];

const FALLBACK_CATEGORIES = [
  { cat: 'concert', title: 'Большой музыкальный вечер на крыше' },
  { cat: 'theater', title: 'Премьерный показ спектакля в театре' },
  { cat: 'exhibition', title: 'Выставка современного искусства и инсталляций' },
  { cat: 'cinema', title: 'Кинопоказ классики под открытым небом' },
  { cat: 'festival', title: 'Городской фестиваль уличной культуры' },
  { cat: 'sport', title: 'Открытая тренировка и йога в парке' },
  { cat: 'walk', title: 'Экскурсия по историческим дворикам' },
  { cat: 'volunteer', title: 'Благотворительный маркет и субботник' },
  { cat: 'quest', title: 'Городской интерактивный квест для друзей' },
  { cat: 'party', title: 'Стендап-шоу популярных комиков' },
  { cat: 'kids', title: 'Семейный праздник и научные опыты для детей' },
  { cat: 'food', title: 'Гастрономический фестиваль уличной кухни' },
  { cat: 'education', title: 'Митап по IT технологиям и стартапам' },
];

function generateServerFallbackEvents(citySlug: string): any[] {
  const center = CITY_COORDS[citySlug] || CITY_COORDS.kzn;
  const items: any[] = [];
  const degPerKm = 1 / 111;

  FALLBACK_CATEGORIES.forEach((entry, idx) => {
    const angle = (idx * 2 * Math.PI) / FALLBACK_CATEGORIES.length;
    const distanceKm = 0.5 + (idx % 4) * 0.9;
    const lon = center.lon + (Math.cos(angle) * distanceKm * degPerKm) / Math.cos((center.lat * Math.PI) / 180);
    const lat = center.lat + Math.sin(angle) * distanceKm * degPerKm;

    items.push({
      id: `fb-${citySlug}-${idx}`,
      title: `${entry.title} (${center.name})`,
      place: `${center.name}, Креативный кластер #${(idx % 4) + 1}`,
      address: `ул. Баумана, д. ${(idx * 7) % 40 + 1}`,
      description: `Приглашаем жителей и гостей города на событие "${entry.title}". Вас ждут яркие впечатления, интересные спикеры и приятная атмосфера.`,
      image: SAMPLE_FALLBACK_IMAGES[idx % SAMPLE_FALLBACK_IMAGES.length],
      date: new Date(Date.now() + (idx * 14 + 4) * 3600 * 1000).toISOString(),
      category: entry.cat,
      ageRestricted: entry.cat === 'party',
      minAge: entry.cat === 'kids' ? 6 : entry.cat === 'party' ? 18 : 12,
      citySlug,
      lon,
      lat,
      price: idx % 3 === 0 ? 'Бесплатно' : `${350 + (idx % 4) * 150} ₽`,
      isCustom: false,
      requiresRegistration: true,
      registeredCount: 8 + (idx * 5) % 30,
    });
  });

  return items;
}
