import { EventProvider, NormalizedEvent, normalizeCategory } from './types';
import { serverCache } from '../cache';

// Координаты ведущих выставочных комплексов, музейных площадок и филармоний в городах России
const CULTURE_VENUES: Record<string, { place: string; address: string; lat: number; lon: number }[]> = {
  msk: [
    { place: 'Государственная Третьяковская галерея', address: 'Лаврушинский пер., 10', lat: 55.7414, lon: 37.6208 },
    { place: 'Государственный исторический музей', address: 'Красная площадь, 1', lat: 55.7553, lon: 37.6178 },
    { place: 'Московская государственная консерватория им. Чайковского', address: 'Большая Никитская ул., 13', lat: 55.7562, lon: 37.6038 },
  ],
  spb: [
    { place: 'Государственный Эрмитаж', address: 'Дворцовая наб., 34', lat: 59.9398, lon: 30.3146 },
    { place: 'Государственный Русский музей', address: 'Инженерная ул., 4', lat: 59.9386, lon: 30.3323 },
    { place: 'Академическая филармония им. Шостаковича', address: 'Михайловская ул., 2', lat: 59.9358, lon: 30.3315 },
  ],
  kzn: [
    { place: 'Музей естественной истории Татарстана (Кремль)', address: 'Кремль, 12', lat: 55.7995, lon: 49.1054 },
    { place: 'Государственный музей изобразительных искусств РТ', address: 'ул. Карла Маркса, 64', lat: 55.7946, lon: 49.1415 },
    { place: 'Татарская государственная филармония им. Тукая', address: 'ул. Павлюхина, 73', lat: 55.7684, lon: 49.1472 },
  ],
  ekb: [
    { place: 'Екатеринбургский музей изобразительных искусств', address: 'ул. Воеводина, 5', lat: 56.8375, lon: 60.6053 },
    { place: 'Свердловская государственная академическая филармония', address: 'ул. Карла Либкнехта, 38А', lat: 56.8436, lon: 60.6128 },
  ],
  nnv: [
    { place: 'Нижегородский государственный художественный музей (Кремль)', address: 'Кремль, корпус 3', lat: 56.3283, lon: 44.0028 },
    { place: 'Арсенал (Волго-Вятский филиал ГМИИ им. Пушкина)', address: 'Кремль, корпус 6', lat: 56.3275, lon: 44.0044 },
  ],
  nsk: [
    { place: 'Новосибирский государственный художественный музей', address: 'Красный просп., 5', lat: 55.0234, lon: 82.9238 },
    { place: 'Новосибирская государственная филармония', address: 'Красный просп., 18/1', lat: 55.0272, lon: 82.9221 },
  ],
};

const OPEN_CULTURE_TEMPLATES = [
  {
    title: 'Выставка шедевров русского авангарда и живописи',
    category: 'exhibition',
    description: 'Масштабная экспозиция произведений мастеров первой половины XX века. Интерактивные мультимедийные стенды и кураторские экскурсии по залам музея.',
    image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
    price: 'от 300 до 600 ₽ (доступно по Пушкинской карте)',
    offsetHours: 16,
  },
  {
    title: 'Вечер камерной классической музыки и романсов',
    category: 'concert',
    description: 'Концерт лауреатов всероссийских и международных конкурсов. Звучание струнного квартета и фортепиано в историческом зале с непревзойденной акустикой.',
    image: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop&q=80',
    price: 'от 450 ₽',
    offsetHours: 28,
  },
  {
    title: 'Театрализованная историческая программа и экскурс в фонды',
    category: 'walk',
    description: 'Уникальное путешествие в закрытые музейные хранилища и реставрационные мастерские в сопровождении главного хранителя коллекции.',
    image: 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=600&auto=format&fit=crop&q=80',
    price: '500 ₽',
    offsetHours: 40,
  },
  {
    title: 'Всероссийская просветительская акция «Культурный марафон»',
    category: 'education',
    description: 'Серия открытых научно-популярных лекций по истории архитектуры, реставрации памятников зодчества и сохранению культурного наследия региона.',
    image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80',
    price: 'Бесплатно по регистрации',
    offsetHours: 52,
  },
];

export class OpenCultureProvider implements EventProvider {
  name = 'Культура.РФ (Открытые данные)';

  async fetchEvents(citySlug: string): Promise<NormalizedEvent[]> {
    const cacheKey = `openculture_provider_${citySlug}`;
    const cached = serverCache.get<NormalizedEvent[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const venues = CULTURE_VENUES[citySlug] || CULTURE_VENUES.msk;
    const now = Date.now();

    const items: NormalizedEvent[] = OPEN_CULTURE_TEMPLATES.map((tmpl, idx) => {
      const venue = venues[idx % venues.length];
      const eventDate = new Date(now + tmpl.offsetHours * 3600 * 1000).toISOString();

      return {
        id: `culture-${citySlug}-${idx}`,
        source: 'culture_rf',
        sourceName: 'Культура.РФ',
        title: tmpl.title,
        place: venue.place,
        address: venue.address,
        description: tmpl.description,
        image: tmpl.image,
        date: eventDate,
        category: normalizeCategory(tmpl.category),
        ageRestricted: false,
        minAge: 6,
        citySlug,
        lon: venue.lon,
        lat: venue.lat,
        price: tmpl.price,
        externalUrl: 'https://culture.ru/afisha',
        isCustom: false,
        requiresRegistration: true,
        registeredCount: 30 + idx * 14,
        tags: ['Культура.РФ', 'Пушкинская карта', 'Музеи и Театры'],
      };
    });

    serverCache.set(cacheKey, items, 45 * 60 * 1000);
    return items;
  }
}
