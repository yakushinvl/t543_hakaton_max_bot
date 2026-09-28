import type { City } from './cities';
import type { EventItem } from '../types/event';
import { getAllEventCategories } from '../config/categories.config';

function deterministicJitter(base: number, spreadKm: number, seed: number): number {
  const degPerKm = 1 / 111;
  // Детерминированный псевдо-случайный сдвиг: гарантирует постоянные фиксированные координаты для каждой площадки
  const val = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  const pseudoRand = val - Math.floor(val);
  return base + (pseudoRand - 0.5) * 2 * spreadKm * degPerKm;
}

const TITLES_BY_CATEGORY: Record<string, string[]> = {
  concert: ['Рок-акустика на крыше', 'Джазовый вечер при свечах', 'Симфонический оркестр: музыка из фильмов', 'Фестиваль независимой музыки'],
  theater: ['Премьера: «Мастер и Маргарита»', 'Иммерсивный спектакль в особняке', 'Комедия положений в театре сатиры', 'Драматический этюд «Белые ночи»'],
  cinema: ['Ночной показ классики Тарантино', 'Кино под открытым небом в парке', 'Премьера арт-хаусного фестиваля', 'Ретроспектива Хаяо Миядзаки'],
  exhibition: ['Интерактивная выставка цифрового искусства', 'Фотобиеннале: Городские силуэты', 'Шедевры авангарда XX века', 'Выставка современных скульпторов'],
  festival: ['Большой городской фестиваль уличной культуры', 'Фестиваль красок Холи', 'Музыкальный опен-эйр выходного дня', 'Праздник световых инсталляций'],
  sport: ['Открытый йога-интенсив в парке', 'Городской ночной велопарад', 'Турнир по уличному баскетболу 3x3', 'Беговой полумарафон на набережной'],
  walk: ['Тайны старинных двориков и подземелий', 'Пешеходная прогулка с историком', 'Экскурсия по крышам с видом на закат', 'Архитектурный гид по центру'],
  volunteer: ['Зелёный субботник: очистка набережной', 'Благотворительный маркет в поддержку приютов', 'Посадка деревьев в городском парке', 'Мастер-класс для подопечных фонда'],
  quest: ['Городской детективный квест', 'Ночной автоквест по легендам города', 'Квиз-битва: кино и музыка', 'Настольный турнир в игровом клубе'],
  party: ['Стендап-вечер лучших комиков', 'Крыша-пати с диджеями', 'Ретро-дискотека 2000-х', 'Караоке-баттл между факультетами'],
  kids: ['Интерактивное шоу мыльных пузырей', 'Кукольный спектакль для малышей', 'Научные эксперименты для школьников', 'Семейный праздник в парке аттракционов'],
  education: ['Митап по машинному обучению и AI', 'Лекция: Как работает современное искусство', 'Воркшоп по стартапам и продуктовой аналитике', 'Мастер-класс по мобильной съёмке'],
  food: ['Гастрономический фестиваль уличной еды', 'Каппинг и мастер-класс по альтернативному кофе', 'Фестиваль сыра и крафтовой выпечки', 'Кулинарный баттл шеф-поваров'],
  fashion: ['Показ локальных дизайнеров одежды', 'Апсайклинг-воркшоп: вторая жизнь вещей', 'Лекция об истории уличной моды', 'Винтажный маркет винила и одежды'],
  outdoor: ['Поход выходного дня по лесной тропе', 'Сплав на сапбордах по реке', 'Ночёвка с телескопом под звёздами', 'Веловыезд к живописным озёрам'],
};

const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
];

export function mockEventsForCity(city: City, count = 20): EventItem[] {
  const items: EventItem[] = [];
  const categoryKeys = getAllEventCategories().map((c) => c.id);

  // Постоянные площадки города, где проходят сразу несколько мероприятий (один адрес и координаты)
  const sharedVenues = [
    {
      place: `${city.name}, Центральное Арт-пространство «Смена»`,
      address: 'ул. Центральная, д. 12',
      lon: city.lon + 0.0052,
      lat: city.lat + 0.0038,
    },
    {
      place: `${city.name}, Культурный лофт «Фабрика»`,
      address: 'ул. Набережная, д. 28',
      lon: city.lon - 0.0068,
      lat: city.lat + 0.0055,
    },
    {
      place: `${city.name}, Креативный кластер «Октава»`,
      address: 'Театральная пл., д. 3',
      lon: city.lon + 0.0084,
      lat: city.lat - 0.0049,
    },
  ];

  for (let i = 0; i < count; i++) {
    const category = categoryKeys[i % categoryKeys.length];
    const titles = TITLES_BY_CATEGORY[category] || ['Интересное событие в городе'];
    const title = titles[Math.floor(Math.random() * titles.length)];
    const id = `mock-${city.slug}-${i}`;
    const dateOffsetHours = (i % 7) * 24 + (i * 3) % 12;
    const eventDate = new Date(Date.now() + dateOffsetHours * 3600000);

    // События 0, 1, 2 — на первой площадке (3 события в одном месте)
    // События 3, 4 — на второй площадке (2 события в одном месте)
    // События 5, 6 — на третьей площадке (2 события в одном месте)
    let venuePlace = '';
    let venueAddress = '';
    let eventLon = 0;
    let eventLat = 0;

    if (i < 3) {
      venuePlace = sharedVenues[0].place;
      venueAddress = sharedVenues[0].address;
      eventLon = sharedVenues[0].lon;
      eventLat = sharedVenues[0].lat;
    } else if (i < 5) {
      venuePlace = sharedVenues[1].place;
      venueAddress = sharedVenues[1].address;
      eventLon = sharedVenues[1].lon;
      eventLat = sharedVenues[1].lat;
    } else if (i < 7) {
      venuePlace = sharedVenues[2].place;
      venueAddress = sharedVenues[2].address;
      eventLon = sharedVenues[2].lon;
      eventLat = sharedVenues[2].lat;
    } else {
      // Каждое 4-е из остальных мероприятий — загородное/пригородное
      const isSuburban = i % 4 === 0;
      const spreadDistanceKm = isSuburban ? 18 + (i % 3) * 7 : 4.5;
      venuePlace = isSuburban
        ? `${city.name} (пригород), Загородный клуб #${(i % 3) + 1}`
        : `${city.name}, Арт-пространство #${(i % 5) + 1}`;
      venueAddress = isSuburban
        ? `Пригородное шоссе, км ${(i * 4) % 25 + 5}`
        : `ул. Советская, д. ${(i * 7) % 50 + 1}`;
      const seedLon = i * 47 + city.slug.length * 13;
      const seedLat = i * 83 + city.slug.length * 29;
      eventLon = deterministicJitter(city.lon, spreadDistanceKm, seedLon);
      eventLat = deterministicJitter(city.lat, spreadDistanceKm, seedLat);
    }

    const isSuburban = venuePlace.includes('(пригород)');

    items.push({
      id,
      title: isSuburban ? `${title} (Open-Air)` : title,
      place: venuePlace,
      address: venueAddress,
      description: `${title}. Приглашаем всех жителей и гостей города провести время ярко, вдохновляюще и с пользой! На площадке работают зоны отдыха, фудкорт и кураторы.`,
      image: SAMPLE_IMAGES[i % SAMPLE_IMAGES.length],
      images: [
        SAMPLE_IMAGES[i % SAMPLE_IMAGES.length],
        SAMPLE_IMAGES[(i + 1) % SAMPLE_IMAGES.length],
        SAMPLE_IMAGES[(i + 2) % SAMPLE_IMAGES.length],
      ],
      date: eventDate.toISOString(),
      category,
      ageRestricted: category === 'party' || (i % 5 === 0),
      minAge: category === 'kids' ? 6 : category === 'party' ? 18 : 12,
      citySlug: city.slug,
      lon: eventLon,
      lat: eventLat,
      price: i % 3 === 0 ? 'Бесплатно' : `${300 + (i % 5) * 200} ₽`,
      requiresRegistration: i % 2 === 0,
      registeredCount: 12 + (i * 7) % 40,
    });
  }

  return items;
}
