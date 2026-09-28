import { EventProvider, NormalizedEvent, normalizeCategory } from './types';

// Специализированные мероприятия для Москвы (Афиша Москвы, Сезоны, Парки)
const MOSCOW_LOCAL_DATA = [
  {
    title: 'Московские сезоны: гастрономический фестиваль на Тверском бульваре',
    place: 'Тверской бульвар',
    address: 'Тверской бульвар, вл. 2',
    description: 'Масштабный гастрономический праздник в самом сердце Москвы. Дегустация авторских блюд от ведущих шеф-поваров столицы, мастер-классы и кулинарные лектории для всей семьи.',
    category: 'food',
    lon: 37.6033,
    lat: 55.7601,
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
    price: 'Вход свободный',
    externalUrl: 'https://moscowseasons.com/festival/gastronomy-2026/',
    offsetHours: 24,
  },
  {
    title: 'Фестиваль уличного кино и инсталляций в Музеоне',
    place: 'Парк искусств Музеон',
    address: 'ул. Крымский Вал, владение 2',
    description: 'Вечерний кинотеатр под открытым небом на набережной Москвы-реки. Показ лучших короткометражных фильмов молодых российских режиссеров и интерактивные световые инсталляции.',
    category: 'cinema',
    lon: 37.6074,
    lat: 55.7358,
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80',
    price: 'Бесплатно по регистрации',
    externalUrl: 'https://park-gorkogo.com/events/muzeon-cinema',
    offsetHours: 36,
  },
  {
    title: 'Джаз на крыше с видом на Кремль и Москва-реку',
    place: 'Крыша Центрального Детского Магазина',
    address: 'Театральный проезд, д. 5/1',
    description: 'Живое звучание джазового квартета на смотровой площадке с панорамным обзором Москвы. Чарующие закатные пейзажи и мировые хиты в джазовой обработке.',
    category: 'concert',
    lon: 37.6253,
    lat: 55.7598,
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    price: 'от 1200 ₽',
    externalUrl: 'https://afisha.moscow/jazz-roof-cdm',
    offsetHours: 48,
  },
  {
    title: 'Технологический митап разработчиков Moscow Tech Meetup',
    place: 'Цифровое деловое пространство (ЦДП)',
    address: 'ул. Покровка, д. 47',
    description: 'Большая конференция для IT-специалистов, стартаперов и архитекторов решений. Доклады о трендах в AI, распределенных системах и нетворкинг-сессия.',
    category: 'education',
    lon: 37.6534,
    lat: 55.7618,
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=80',
    price: 'Бесплатно / Регистрация',
    externalUrl: 'https://cdp.moscow/events/tech-meetup-autumn',
    offsetHours: 60,
  },
  {
    title: 'Световой арт-перформанс в ГЭС-2',
    place: 'Дом культуры «ГЭС-2»',
    address: 'Болотная набережная, д. 15',
    description: 'Аудиовизуальный перформанс в центральном нефе ГЭС-2 с участием современных медиа-художников и композиторов минималистичной электроники.',
    category: 'exhibition',
    lon: 37.6105,
    lat: 55.7423,
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    price: 'Вход по бесплатным тайм-слотам',
    externalUrl: 'https://v-a-c.org/ges2/events',
    offsetHours: 72,
  },
];

// Специализированные мероприятия для Санкт-Петербурга (Афиша СПб, Севкабель, Новая Голландия)
const SPB_LOCAL_DATA = [
  {
    title: 'Морской фестиваль и маркет выходного дня в Севкабель Порту',
    place: 'Севкабель Порт',
    address: 'Кожевенная линия, д. 40',
    description: 'Атмосферный фестиваль на берегу Финского залива: локальные бренды Санкт-Петербурга, виниловый маркет, живая инди-музыка и стритфуд под шум волн.',
    category: 'festival',
    lon: 30.2407,
    lat: 59.9244,
    image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600&auto=format&fit=crop&q=80',
    price: 'Вход свободный',
    externalUrl: 'https://sevkabelport.ru/events/weekend-fest',
    offsetHours: 20,
  },
  {
    title: 'Вечер фортепианной неоклассики во дворе Новой Голландии',
    place: 'Остров Новая Голландия',
    address: 'наб. Адмиралтейского канала, д. 2',
    description: 'Уютный фортепианный концерт на открытой сцене среди вековых лип и каналов острова Новая Голландия. Произведения Людовико Эйнауди и Макса Рихтера.',
    category: 'concert',
    lon: 30.2885,
    lat: 59.9298,
    image: 'https://images.unsplash.com/photo-1520523839898-507125cd53c1?w=600&auto=format&fit=crop&q=80',
    price: 'от 800 ₽',
    externalUrl: 'https://newhollandsp.ru/events/concerts',
    offsetHours: 32,
  },
  {
    title: 'Авторская экскурсия по парадным и дворам-колодцам Петроградской стороны',
    place: 'Метро Петроградская',
    address: 'Каменноостровский просп., д. 37',
    description: 'Погружение в непарадный Петербург: витражи эпохи модерна, дореволюционные камины и тайные проходные дворы в компании петербургского краеведа.',
    category: 'walk',
    lon: 30.3135,
    lat: 59.9664,
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80',
    price: '900 ₽',
    externalUrl: 'https://spb-culture.ru/tours/petrogradka-modern',
    offsetHours: 44,
  },
  {
    title: 'Выставка современного концептуального искусства в Планетарии №1',
    place: 'Планетарий №1',
    address: 'наб. Обводного канала, д. 74Ц',
    description: 'Иммерсивная проекционная экспозиция под гигантским 37-метровым куполом. Космические визуализации и медитативный эмбиент.',
    category: 'exhibition',
    lon: 30.3204,
    lat: 59.9079,
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    price: '650 ₽',
    externalUrl: 'https://planetarium.one/exhibitions',
    offsetHours: 56,
  },
];

// Специализированные мероприятия для Казани (Культурная Казань, Иннополис, Кремлевская набережная)
const KZN_LOCAL_DATA = [
  {
    title: 'Фестиваль татарской современной культуры в Присутственных местах Кремля',
    place: 'Казанский Кремль, Присутственные места',
    address: 'Кремль, д. 5',
    description: 'Интерактивная выставка современного дизайна, лекции по урбанистике, маркет изделий татарских ремесленников и вечерний акустический концерт.',
    category: 'festival',
    lon: 49.1068,
    lat: 55.7985,
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&auto=format&fit=crop&q=80',
    price: 'Вход свободный',
    externalUrl: 'https://kazan-kremlin.ru/events/modern-tatar-culture',
    offsetHours: 18,
  },
  {
    title: 'Лекторий и книжная ярмарка в Национальной библиотеке РТ',
    place: 'Национальная библиотека Республики Татарстан',
    address: 'ул. Пушкина, д. 86',
    description: 'Открытые встречи с современными писателями и популяризаторами науки в панорамном зале библиотеки с видом на реку Казанку.',
    category: 'education',
    lon: 49.1278,
    lat: 55.7956,
    image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80',
    price: 'Бесплатно по регистрации',
    externalUrl: 'https://kitaphane.tatarstan.ru/events',
    offsetHours: 30,
  },
  {
    title: 'Вечер электронных лайвов и арт-маркет на Фабрике Алафузова',
    place: 'Лофт Фабрика Алафузова',
    address: 'ул. Гладилова, д. 55',
    description: 'Независимое арт-пространство: аудиовизуальные шоу, выставка казанского стрит-арта и танцевальный сет до поздней ночи.',
    category: 'party',
    lon: 49.0763,
    lat: 55.8078,
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    price: '500 ₽',
    externalUrl: 'https://alafuzov-loft.ru/events',
    offsetHours: 42,
  },
  {
    title: 'Забег и открытая функциональная тренировка на набережной озера Кабан',
    place: 'Набережная озера Нижний Кабан',
    address: 'ул. Марселя Салимжанова, д. 2',
    description: 'Утренняя разминка с сертифицированными тренерами, легкий бег вокруг озера и практические советы по здоровому образу жизни.',
    category: 'sport',
    lon: 49.1235,
    lat: 55.7824,
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&auto=format&fit=crop&q=80',
    price: 'Бесплатно',
    externalUrl: 'https://parkikazan.ru/events/kaban-run',
    offsetHours: 54,
  },
];

export class CitySpecializedProvider implements EventProvider {
  name = 'Городской Центр Событий';

  async fetchEvents(citySlug: string): Promise<NormalizedEvent[]> {
    let sourceKey = '';
    let sourceName = '';
    let dataList: typeof MOSCOW_LOCAL_DATA = [];

    if (citySlug === 'msk') {
      sourceKey = 'moscow_city_portal';
      sourceName = 'Афиша Москвы (Московские Сезоны)';
      dataList = MOSCOW_LOCAL_DATA;
    } else if (citySlug === 'spb') {
      sourceKey = 'spb_city_portal';
      sourceName = 'Культурный Петербург (Севкабель & Новая Голландия)';
      dataList = SPB_LOCAL_DATA;
    } else if (citySlug === 'kzn') {
      sourceKey = 'kzn_city_portal';
      sourceName = 'Афиша Казани (Парки и Культура Казани)';
      dataList = KZN_LOCAL_DATA;
    } else {
      // Для остальных городов специфичного портала пока нет
      return [];
    }

    const now = Date.now();
    return dataList.map((item, idx) => {
      const eventDate = new Date(now + item.offsetHours * 3600 * 1000).toISOString();

      return {
        id: `${sourceKey}-${idx}`,
        source: sourceKey,
        sourceName,
        title: item.title,
        place: item.place,
        address: item.address,
        description: item.description,
        image: item.image,
        date: eventDate,
        category: normalizeCategory(item.category),
        ageRestricted: item.category === 'party',
        minAge: item.category === 'party' ? 18 : 6,
        citySlug,
        lon: item.lon,
        lat: item.lat,
        price: item.price,
        externalUrl: item.externalUrl,
        isCustom: false,
        requiresRegistration: true,
        registeredCount: 15 + idx * 8,
        tags: [sourceName, 'Рекомендовано городом'],
      };
    });
  }
}
