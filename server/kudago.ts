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
      });
    }

    const result = spreadOverlappingCoords(items);
    // Кэшируем на 45 минут
    serverCache.set(cacheKey, result, 45 * 60 * 1000);
    return result;
  } catch (err) {
    console.error(`Failed to fetch KudaGo events for ${citySlug}:`, err);
    return [];
  }
}
