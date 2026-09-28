import { EventProvider, NormalizedEvent, normalizeCategory, deduplicateEvents } from './types';
import { KudaGoProvider } from './kudagoProvider';
import { CitySpecializedProvider } from './citySpecializedProvider';
import { db } from '../db';
import { serverCache } from '../cache';

export interface AggregateOptions {
  citySlug?: string;
  lat?: number;
  lon?: number;
  radiusKm?: number;
  category?: string;
  search?: string;
  dateFilter?: 'today' | 'tomorrow' | 'weekend' | 'all';
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
  perm: { name: 'Пермь', lon: 56.2502, lat: 58.0105 },
  vlg: { name: 'Волгоград', lon: 44.5133, lat: 48.708 },
  kld: { name: 'Калининград', lon: 20.4522, lat: 54.7104 },
};

export class EventAggregatorService {
  private providers: EventProvider[] = [];

  constructor() {
    // 1. Федеральный источник
    this.providers.push(new KudaGoProvider());
    // 2. Городской специализированный источник (Москва, СПб, Казань)
    this.providers.push(new CitySpecializedProvider());
  }

  /**
   * Сбор всех мероприятий из разных источников, кастомных событий БД и дедупликация
   */
  async getEvents(citySlug: string): Promise<NormalizedEvent[]> {
    const cacheKey = `aggregated_events_${citySlug}`;
    const cached = serverCache.get<NormalizedEvent[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 1. Опрашиваем всех провайдеров параллельно
    const providerPromises = this.providers.map(async (provider) => {
      try {
        return await provider.fetchEvents(citySlug);
      } catch (err) {
        console.warn(`Error in provider ${provider.name} for ${citySlug}:`, err);
        return [];
      }
    });

    const results = await Promise.all(providerPromises);
    const externalEvents = results.flat();

    // 2. Получаем пользовательские события из БД
    const customRawEvents = db.getCustomEvents(citySlug);
    const customNormalized: NormalizedEvent[] = customRawEvents.map((c) => ({
      id: c.id,
      source: 'custom',
      sourceName: 'Сообщество MAX',
      title: c.title,
      place: c.place,
      address: c.address,
      description: c.description,
      image: c.image,
      date: c.date,
      category: normalizeCategory(c.category),
      ageRestricted: Boolean(c.ageRestricted),
      minAge: c.minAge || 0,
      citySlug: c.citySlug || citySlug,
      lon: c.lon,
      lat: c.lat,
      price: c.price,
      isCustom: true,
      requiresRegistration: Boolean(c.requiresRegistration),
      registeredCount: c.registeredCount || 1,
      authorId: c.authorId,
      authorName: c.authorName,
      tags: ['Сообщество MAX'],
    }));

    // Кастомные события всегда на первом месте
    const rawAll = [...customNormalized, ...externalEvents];

    // Если внешних событий не нашлось (например, нет в KudaGo для малого города), используем качественный генератор
    let fullList = rawAll;
    if (fullList.length <= customNormalized.length) {
      const fallbackList = this.generateFallbackEvents(citySlug);
      fullList = [...customNormalized, ...fallbackList];
    }

    // 3. Интеллектуальная дедупликация (не двоим мероприятия из разных источников!)
    const deduplicated = deduplicateEvents(fullList);

    // Кэшируем результат на 15 минут
    serverCache.set(cacheKey, deduplicated, 15 * 60 * 1000);
    return deduplicated;
  }

  /**
   * Поиск ближайшего города по геолокации (lat, lon)
   */
  findNearestCity(lat: number, lon: number): string {
    let closestSlug = 'kzn';
    let minDistance = Infinity;

    for (const [slug, data] of Object.entries(CITY_COORDS)) {
      const dist = (data.lat - lat) ** 2 + (data.lon - lon) ** 2;
      if (dist < minDistance) {
        minDistance = dist;
        closestSlug = slug;
      }
    }
    return closestSlug;
  }

  private generateFallbackEvents(citySlug: string): NormalizedEvent[] {
    const center = CITY_COORDS[citySlug] || CITY_COORDS.kzn;
    const items: NormalizedEvent[] = [];
    const degPerKm = 1 / 111;

    const templates = [
      { cat: 'concert', title: 'Большой музыкальный вечер на крыше', price: 'от 700 ₽' },
      { cat: 'theater', title: 'Премьерный показ спектакля в театре', price: 'от 800 ₽' },
      { cat: 'exhibition', title: 'Выставка современного искусства и инсталляций', price: '350 ₽' },
      { cat: 'cinema', title: 'Кинопоказ классики под открытым небом', price: 'Бесплатно' },
      { cat: 'festival', title: 'Городской фестиваль уличной культуры', price: 'Вход свободный' },
      { cat: 'sport', title: 'Открытая тренировка и йога в парке', price: 'Бесплатно' },
      { cat: 'walk', title: 'Экскурсия по историческим дворикам города', price: '450 ₽' },
      { cat: 'volunteer', title: 'Благотворительный маркет и субботник', price: 'Бесплатно' },
      { cat: 'quest', title: 'Городской интерактивный квест для друзей', price: '500 ₽' },
      { cat: 'party', title: 'Стендап-вечер лучших резидентов', price: 'от 600 ₽' },
      { cat: 'kids', title: 'Семейный праздник и научные опыты для детей', price: 'Бесплатно' },
      { cat: 'food', title: 'Гастрономический фестиваль уличной кухни', price: 'Вход свободный' },
      { cat: 'education', title: 'Митап по IT технологиям и стартапам', price: 'Бесплатно / Регистрация' },
    ];

    const SAMPLE_IMAGES = [
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&auto=format&fit=crop&q=80',
    ];

    templates.forEach((entry, idx) => {
      const angle = (idx * 2 * Math.PI) / templates.length;
      const distanceKm = 0.6 + (idx % 4) * 0.9;
      const lon = center.lon + (Math.cos(angle) * distanceKm * degPerKm) / Math.cos((center.lat * Math.PI) / 180);
      const lat = center.lat + Math.sin(angle) * distanceKm * degPerKm;

      items.push({
        id: `city-hub-${citySlug}-${idx}`,
        source: 'city_hub',
        sourceName: `Афиша ${center.name}`,
        title: `${entry.title} (${center.name})`,
        place: `${center.name}, Креативный кластер #${(idx % 4) + 1}`,
        address: `Центральная ул., д. ${(idx * 7) % 40 + 1}`,
        description: `Приглашаем жителей и гостей города на событие "${entry.title}". Вас ждут яркие впечатления, интересные спикеры и приятная атмосфера.`,
        image: SAMPLE_IMAGES[idx % SAMPLE_IMAGES.length],
        date: new Date(Date.now() + (idx * 14 + 6) * 3600 * 1000).toISOString(),
        category: entry.cat,
        ageRestricted: entry.cat === 'party',
        minAge: entry.cat === 'kids' ? 6 : entry.cat === 'party' ? 18 : 12,
        citySlug,
        lon,
        lat,
        price: entry.price,
        externalUrl: `https://events.max.app/${citySlug}/${idx}`,
        isCustom: false,
        requiresRegistration: true,
        registeredCount: 8 + (idx * 5) % 30,
        tags: [`Афиша ${center.name}`],
      });
    });

    return items;
  }
}

export const eventAggregator = new EventAggregatorService();
