import { EventProvider, NormalizedEvent, normalizeCategory, deduplicateEvents } from './types';
import { KudaGoProvider } from './kudagoProvider';
import { ItEventsProvider } from './itEventsProvider';
import { OpenCultureProvider } from './openCultureProvider';
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
    // 1. Федеральный источник KudaGo (парки, фестивали, концерты)
    this.providers.push(new KudaGoProvider());
    // 2. Провайдер IT-Events (конференции, митапы, хакатоны, бизнес)
    this.providers.push(new ItEventsProvider());
    // 3. Провайдер Культура.РФ (музеи, выставки, филармонии, Пушкинская карта)
    this.providers.push(new OpenCultureProvider());
    // 4. Городской специализированный источник (Москва, СПб, Казань)
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
      authorId: c.authorId,
      authorName: c.authorName,
      tags: ['Сообщество MAX'],
    }));

    // Кастомные события всегда на первом месте
    const rawAll = [...customNormalized, ...externalEvents];

    // 3. Интеллектуальная дедупликация (не двоим мероприятия из разных источников!)
    const deduplicated = deduplicateEvents(rawAll);

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
}

export const eventAggregator = new EventAggregatorService();
