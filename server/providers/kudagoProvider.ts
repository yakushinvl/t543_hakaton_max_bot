import { EventProvider, NormalizedEvent, normalizeCategory, stripHtml } from './types';
import { serverCache } from '../cache';

export class KudaGoProvider implements EventProvider {
  name = 'KudaGo';

  async fetchEvents(citySlug: string): Promise<NormalizedEvent[]> {
    const cacheKey = `kudago_provider_${citySlug}`;
    const cached = serverCache.get<NormalizedEvent[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const params = new URLSearchParams({
      location: citySlug,
      actual_since: String(nowSec),
      page_size: '80',
      fields: 'id,title,dates,place,description,images,age_restriction,categories,price,site_url',
      expand: 'place,images',
      order_by: '-publication_date',
    });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6500);

      const res = await fetch(`https://kudago.com/public-api/v1.4/events/?${params.toString()}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MaxEventBot/2.0)',
        },
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`KudaGo status: ${res.status}`);
      }

      const data: any = await res.json();
      const items: NormalizedEvent[] = [];

      for (const raw of data.results || []) {
        const coords = raw.place?.coords;
        if (!coords || typeof coords.lat !== 'number' || typeof coords.lon !== 'number') continue;

        const category = normalizeCategory(raw.categories || []);
        const MIN_TS = 946684800; // 2000-01-01
        const MAX_TS = 4102444800; // 2100-01-01
        const startSec = raw.dates?.find((d: any) => d.start && d.start > MIN_TS && d.start < MAX_TS)?.start;
        const date = startSec ? new Date(startSec * 1000).toISOString() : new Date().toISOString();

        const rawImage = raw.images?.[0]?.image;
        const image = rawImage
          ? `/kg-media${rawImage.replace('https://media.kudago.com', '')}`
          : `https://picsum.photos/seed/kg${raw.id}/400/300`;

        const ageRestricted = raw.age_restriction ? parseInt(raw.age_restriction, 10) >= 18 : false;

        items.push({
          id: `kg-${raw.id}`,
          source: 'kudago',
          sourceName: 'KudaGo',
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
          externalUrl: raw.site_url || `https://kudago.com/${citySlug}/event/${raw.id}/`,
          isCustom: false,
        });
      }

      // Кэшируем на 30 минут
      serverCache.set(cacheKey, items, 30 * 60 * 1000);
      return items;
    } catch (err) {
      console.warn(`[KudaGoProvider] Warning: failed to fetch for ${citySlug}:`, err);
      return [];
    }
  }
}
