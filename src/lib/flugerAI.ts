import type { EventItem } from '../types/event';
import type { UserProfile } from '../types/user';
import { getInterestById, ALL_INTERESTS } from '../data/interests';

export interface FlugerAnswers {
  mood?: 'new' | 'familiar' | 'energy' | 'relax' | string;
  cityCategory?: string;
  company?: 'alone' | 'couple' | 'friends' | 'family' | string;
  format?: string;
  customText?: string;
}

export interface FlugerRecommendation {
  event: EventItem;
  matchScore: number;
  matchPercent: number;
  matchReason: string;
}

export interface FlugerResult {
  summaryTitle: string;
  verdict: string;
  directionLabel: string;
  compassAngle: number;
  recommendations: FlugerRecommendation[];
  source: 'hybrid-rag' | 'llm-cloud';
}

export interface FlugerQuestionOption {
  id: string;
  label: string;
  emoji: string;
  count?: number;
}

export interface FlugerQuestion {
  id: 'mood' | 'cityCategory' | 'company';
  title: string;
  options: FlugerQuestionOption[];
}

/**
 * Интеллектуальный генератор вопросов на основе актуальной афиши города и профиля пользователя
 */
export function generateFlugerQuestions(
  events: EventItem[],
  profile: UserProfile | null,
  answers: FlugerAnswers,
  cityName: string = 'городе'
): FlugerQuestion[] {
  // 1. Первый вопрос: Настроение
  const q1: FlugerQuestion = {
    id: 'mood',
    title: 'Чего сегодня хочется?',
    options: [
      { id: 'new', label: 'Новое', emoji: '✨' },
      { id: 'familiar', label: 'Привычное', emoji: '🛋️' },
      { id: 'energy', label: 'Драйв', emoji: '⚡' },
      { id: 'relax', label: 'Спокойствие', emoji: '🌿' },
    ],
  };

  // 2. Второй вопрос: Динамический вопрос по ГОРОДУ и ИНТЕРЕСАМ пользователя
  const categoryCounts: Record<string, number> = {};
  for (const ev of events) {
    categoryCounts[ev.category] = (categoryCounts[ev.category] || 0) + 1;
  }
  const availableInCity = Object.keys(categoryCounts).filter((c) => categoryCounts[c] > 0);
  const userInterests = new Set(profile?.interests || []);

  const mood = answers.mood || 'familiar';
  let q2Title = `Что выберешь в ${cityName}?`;
  let targetCategoryIds: string[] = [];

  if (mood === 'new') {
    // Ищем категории в городе, которых НЕТ в профиле пользователя (выход из зоны комфорта)
    const novelInCity = availableInCity.filter((c) => !userInterests.has(c));
    if (novelInCity.length >= 2) {
      q2Title = `В ${cityName} есть то, что ты не пробовал:`;
      targetCategoryIds = novelInCity;
    } else {
      q2Title = `Новые открытия в ${cityName}:`;
      targetCategoryIds = availableInCity;
    }
  } else if (mood === 'energy') {
    // Ищем энергичные форматы в городе
    const energeticCats = ['concert', 'party', 'festival', 'standup', 'quest', 'extreme', 'sport', 'nightlife'];
    const activeEnergetic = availableInCity.filter((c) => energeticCats.includes(c));
    if (activeEnergetic.length > 0) {
      q2Title = `В ${cityName} сегодня кипит энергия:`;
      targetCategoryIds = activeEnergetic;
    } else {
      targetCategoryIds = availableInCity;
    }
  } else if (mood === 'relax') {
    // Ищем спокойные и эстетичные форматы в городе
    const relaxCats = ['exhibition', 'theater', 'walk', 'cinema', 'food', 'outdoor', 'yoga', 'music_jazz', 'books'];
    const activeRelax = availableInCity.filter((c) => relaxCats.includes(c));
    if (activeRelax.length > 0) {
      q2Title = `Для уюта и релакса в ${cityName}:`;
      targetCategoryIds = activeRelax;
    } else {
      targetCategoryIds = availableInCity;
    }
  } else {
    // mood === 'familiar': подбираем то, что совпадает с интересами пользователя в городе
    const matching = availableInCity.filter((c) => userInterests.has(c));
    if (matching.length >= 2) {
      q2Title = `В ${cityName} сейчас твои любимые темы:`;
      targetCategoryIds = matching;
    } else {
      q2Title = `Популярные события в ${cityName}:`;
      targetCategoryIds = availableInCity;
    }
  }

  // Сортируем выбранные категории по количеству доступных событий в городе
  targetCategoryIds.sort((a, b) => (categoryCounts[b] || 0) - (categoryCounts[a] || 0));

  // Берем топ-4 категории
  const selectedCatSlice = targetCategoryIds.slice(0, 4);

  // Если категорий в выборке меньше 4, добираем из всех доступных интересов
  if (selectedCatSlice.length < 4) {
    for (const interest of ALL_INTERESTS) {
      if (!selectedCatSlice.includes(interest.id)) {
        selectedCatSlice.push(interest.id);
        if (selectedCatSlice.length === 4) break;
      }
    }
  }

  const q2Options: FlugerQuestionOption[] = selectedCatSlice.map((catId) => {
    const meta = getInterestById(catId);
    return {
      id: catId,
      label: meta?.label || 'Событие',
      emoji: meta?.emoji || '✦',
      count: categoryCounts[catId] || 0,
    };
  });

  const q2: FlugerQuestion = {
    id: 'cityCategory',
    title: q2Title,
    options: q2Options,
  };

  // 3. Третий вопрос: Компания
  const q3: FlugerQuestion = {
    id: 'company',
    title: 'В какой компании?',
    options: [
      { id: 'alone', label: 'Один', emoji: '🚶' },
      { id: 'couple', label: 'Вдвоём', emoji: '💖' },
      { id: 'friends', label: 'С друзьями', emoji: '👥' },
      { id: 'family', label: 'С семьёй', emoji: '👨‍👩‍👧' },
    ],
  };

  return [q1, q2, q3];
}

/**
 * Запрос к ИИ (Серверный эндпоинт с автономным фолбэком)
 */
export async function queryFlugerAI(
  events: EventItem[],
  profile: UserProfile | null,
  answers: FlugerAnswers,
  citySlug: string,
  cityName: string = 'городе'
): Promise<FlugerResult> {
  try {
    const res = await fetch('/api/ai/fluger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: citySlug,
        profile,
        answers,
        events: events.slice(0, 30),
      }),
    });

    if (res.ok) {
      const data: FlugerResult = await res.json();
      if (data && data.recommendations && data.recommendations.length > 0) {
        return data;
      }
    }
  } catch (e) {
    console.warn('Backend Fluger AI unavailable, using client-side semantic engine:', e);
  }

  return runClientSemanticEngine(events, profile, answers, cityName);
}

/**
 * Клиентский семантический RAG-движок (работает офлайн и без ключей)
 */
function runClientSemanticEngine(
  events: EventItem[],
  profile: UserProfile | null,
  answers: FlugerAnswers,
  cityName: string
): FlugerResult {
  if (!events || events.length === 0) {
    return {
      summaryTitle: 'Штиль в городе',
      verdict: 'В настоящий момент нет запланированных мероприятий.',
      directionLabel: 'Север',
      compassAngle: 0,
      recommendations: [],
      source: 'hybrid-rag',
    };
  }

  const { mood = 'familiar', cityCategory = '', company = 'friends' } = answers;
  const userInterests = new Set(profile?.interests || []);
  const isMinor = profile?.ageGroup === '6-11' || profile?.ageGroup === '12-15';

  const scored: Array<{
    event: EventItem;
    score: number;
    matchPercent: number;
    reasons: string[];
  }> = [];

  for (const event of events) {
    if (isMinor && event.ageRestricted) continue;
    if (company === 'family' && event.ageRestricted) continue;
    if (profile?.ageGroup === '6-11' && (event.minAge || 0) > 11) continue;

    let score = 30;
    const reasons: string[] = [];

    // Попадание в выбранную городскую категорию
    if (cityCategory && event.category === cityCategory) {
      score += 60;
      const meta = getInterestById(event.category);
      reasons.push(meta?.label || 'Выбранное направление');
    }

    // Совпадение с профилем
    if (userInterests.has(event.category)) {
      score += 25;
      if (!reasons.length) {
        const meta = getInterestById(event.category);
        if (meta) reasons.push(meta.label);
      }
    }

    // Настроение
    if (mood === 'new' && !userInterests.has(event.category)) {
      score += 35;
      reasons.push('Новый опыт');
    } else if (mood === 'energy' && ['concert', 'party', 'festival', 'standup', 'quest'].includes(event.category)) {
      score += 35;
      reasons.push('Заряд энергии');
    } else if (mood === 'relax' && ['exhibition', 'theater', 'walk', 'food', 'cinema', 'outdoor'].includes(event.category)) {
      score += 35;
      reasons.push('Атмосфера и уют');
    }

    // Компания
    if (company === 'couple' && ['theater', 'music_jazz', 'cinema', 'exhibition', 'food'].includes(event.category)) {
      score += 30;
      reasons.push('Для двоих');
    } else if (company === 'friends' && ['party', 'concert', 'standup', 'quest', 'boardgames'].includes(event.category)) {
      score += 30;
      reasons.push('Для друзей');
    } else if (company === 'family' && ['kids', 'science', 'outdoor', 'theater'].includes(event.category)) {
      score += 35;
      reasons.push('Для всей семьи');
    } else if (company === 'alone' && ['walk', 'exhibition', 'cinema', 'books'].includes(event.category)) {
      score += 20;
      reasons.push('Наедине с собой');
    }

    const matchPercent = Math.min(Math.max(Math.round(score), 58), 99);
    scored.push({
      event,
      score,
      matchPercent,
      reasons: reasons.length > 0 ? reasons : ['Рекомендовано Флюгером'],
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 5);

  const bestCategory = top[0]?.event.category || cityCategory || 'concert';
  const compassMap: Record<string, { angle: number; label: string }> = {
    concert: { angle: 45, label: 'Северо-Восток: Музыка и драйв' },
    party: { angle: 65, label: 'Восток: Ночные ритмы' },
    exhibition: { angle: 135, label: 'Юго-Восток: Культура и арт' },
    theater: { angle: 155, label: 'Юг: Театральная сцена' },
    walk: { angle: 225, label: 'Юго-Запад: Городские маршруты' },
    food: { angle: 270, label: 'Запад: Гастрономия' },
    quest: { angle: 315, label: 'Северо-Запад: Приключения и квесты' },
    standup: { angle: 10, label: 'Север: Стендап и шоу' },
  };

  const comp = compassMap[bestCategory] || { angle: 90, label: `Центр: События ${cityName}` };
  const name = profile?.name ? profile.name : 'друг';
  const meta = getInterestById(bestCategory);
  const catLabel = meta?.label || 'досуг';

  let summaryTitle = 'Маршрут построен';
  let verdict = `${name}, стрелка флюгера настроена на ${catLabel}. Учли события в ${cityName} и твои предпочтения.`;

  if (mood === 'new') {
    summaryTitle = `Курс на новое: ${catLabel}`;
    verdict = `${name}, флюгер открывает новые впечатления в ${cityName}. Вот лучшее, что стоит попробовать.`;
  } else if (mood === 'energy') {
    summaryTitle = `Эпицентр энергии: ${catLabel}`;
    verdict = `${name}, ветер дует в сторону самых ярких событий города.`;
  } else if (mood === 'relax') {
    summaryTitle = `Гармония и уют: ${catLabel}`;
    verdict = `${name}, мягкий бриз и спокойный отдых. Выбраны самые душевные локации.`;
  }

  return {
    summaryTitle,
    verdict,
    directionLabel: comp.label,
    compassAngle: comp.angle,
    recommendations: top.map((t) => ({
      event: t.event,
      matchScore: t.score,
      matchPercent: t.matchPercent,
      matchReason: t.reasons.slice(0, 2).join(' • '),
    })),
    source: 'hybrid-rag',
  };
}
