import type { EventItem } from '../src/types/event';
import type { UserProfile } from '../src/types/user';
import { getInterestById } from '../src/data/interests';

export interface FlugerAIRequest {
  city?: string;
  profile?: UserProfile | null;
  answers: {
    mood?: string;
    cityCategory?: string;
    company?: string;
    format?: string;
    customText?: string;
  };
  events?: EventItem[];
}

export interface FlugerAIRecommendation {
  event: EventItem;
  matchScore: number;
  matchPercent: number;
  matchReason: string;
}

export interface FlugerAIResponse {
  summaryTitle: string;
  verdict: string;
  directionLabel: string;
  compassAngle: number;
  recommendations: FlugerAIRecommendation[];
  source: 'hybrid-rag' | 'llm-cloud';
}

// Семантические веса категорий под настроения
const MOOD_CATEGORY_WEIGHTS: Record<string, Record<string, number>> = {
  new: {
    quest: 35,
    extreme: 35,
    science: 30,
    festival: 30,
    standup: 30,
    wine: 25,
    music_jazz: 25,
  },
  familiar: {
    // Веса берутся из совпадения с профилем
  },
  energy: {
    concert: 45,
    party: 45,
    festival: 40,
    extreme: 35,
    standup: 35,
    quest: 30,
    sport: 30,
    nightlife: 40,
  },
  relax: {
    exhibition: 40,
    theater: 40,
    walk: 40,
    cinema: 35,
    outdoor: 35,
    food: 30,
    books: 30,
    yoga: 35,
    music_jazz: 40,
  },
};

// Семантические веса под компанию
const COMPANY_CATEGORY_WEIGHTS: Record<string, Record<string, number>> = {
  alone: {
    walk: 30,
    exhibition: 30,
    cinema: 25,
    books: 25,
    education: 25,
    outdoor: 20,
    food: 20,
  },
  couple: {
    theater: 40,
    music_jazz: 40,
    cinema: 35,
    exhibition: 35,
    food: 30,
    wine: 35,
    walk: 30,
    concert: 25,
  },
  friends: {
    party: 40,
    concert: 40,
    standup: 40,
    quest: 35,
    boardgames: 35,
    nightlife: 35,
    sport: 30,
    extreme: 30,
  },
  family: {
    kids: 50,
    science: 40,
    theater: 30,
    outdoor: 35,
    walk: 30,
    exhibition: 25,
  },
};

// Расчет угла компаса и направления
function calculateCompassAngle(category: string, city: string): { angle: number; label: string } {
  const angles: Record<string, { angle: number; label: string }> = {
    concert: { angle: 45, label: 'Северо-Восток: Музыка и сцена' },
    party: { angle: 60, label: 'Восток: Ночные ритмы' },
    festival: { angle: 30, label: 'Север: Фестивальный эпицентр' },
    exhibition: { angle: 135, label: 'Юго-Восток: Искусство и галереи' },
    theater: { angle: 150, label: 'Юг: Театральные подмостки' },
    cinema: { angle: 120, label: 'Восток: Кино и экраны' },
    walk: { angle: 225, label: 'Юго-Запад: Исторические маршруты' },
    outdoor: { angle: 210, label: 'Юг: Набережные и парки' },
    food: { angle: 270, label: 'Запад: Гастрономические открытия' },
    wine: { angle: 285, label: 'Запад: Дегустации и ужины' },
    quest: { angle: 315, label: 'Северо-Запад: Квесты и загадки' },
    standup: { angle: 5, label: 'Север: Стендап и юмор' },
    kids: { angle: 180, label: 'Юг: Семейные открытия' },
    sport: { angle: 90, label: 'Восток: Движение и активность' },
    music_jazz: { angle: 140, label: 'Юго-Восток: Джаз и винил' },
  };

  if (angles[category]) {
    return angles[category];
  }
  return { angle: 90, label: `Центр: Главные события ${city}` };
}

/**
 * Прокачанный семантический RAG-движок Флюгера
 */
export function analyzeWithLocalSemanticEngine(
  events: EventItem[],
  profile: UserProfile | null,
  answers: FlugerAIRequest['answers'],
  city: string = 'Казань'
): FlugerAIResponse {
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

  const { mood = 'familiar', cityCategory = '', company = 'friends', format = '', customText = '' } = answers;
  const userInterests = new Set(profile?.interests || []);
  const isMinor = profile?.ageGroup === '6-8' || profile?.ageGroup === '9-11' || profile?.ageGroup === '12-14' || profile?.ageGroup === '15-17';

  const scored: Array<{
    event: EventItem;
    score: number;
    matchPercent: number;
    reasons: string[];
  }> = [];

  for (const event of events) {
    // 1. Строгие возрастные и семейные фильтры
    if (isMinor && event.ageRestricted) continue;
    if (company === 'family' && event.ageRestricted) continue;
    if ((profile?.ageGroup === '6-8' || profile?.ageGroup === '9-11') && (event.minAge || 0) > 11) continue;

    let score = 30;
    const reasons: string[] = [];

    // 2. Прямое попадание в выбранную городскую категорию (ответ на адаптивный вопрос)
    if (cityCategory && event.category === cityCategory) {
      score += 60;
      const meta = getInterestById(event.category);
      reasons.push(`Точное совпадение: ${meta?.label || 'выбранное направление'}`);
    }

    // 3. Соответствие профилю интересов пользователя
    if (userInterests.has(event.category)) {
      score += 30;
      if (!reasons.length) {
        const meta = getInterestById(event.category);
        if (meta) reasons.push(`Твой интерес: ${meta.label}`);
      }
    }

    // 4. Вектор настроения
    if (mood === 'new') {
      if (!userInterests.has(event.category)) {
        score += 35;
        reasons.push('Свежий опыт вне привычного');
      }
      const moodBonus = MOOD_CATEGORY_WEIGHTS.new[event.category] || 0;
      score += moodBonus;
    } else if (mood === 'familiar') {
      if (userInterests.has(event.category)) {
        score += 25;
      }
    } else if (mood === 'energy') {
      const moodBonus = MOOD_CATEGORY_WEIGHTS.energy[event.category] || 0;
      if (moodBonus > 0) {
        score += moodBonus;
        reasons.push('Заряд энергии и яркие эмоции');
      }
    } else if (mood === 'relax') {
      const moodBonus = MOOD_CATEGORY_WEIGHTS.relax[event.category] || 0;
      if (moodBonus > 0) {
        score += moodBonus;
        reasons.push('Уютная и спокойная атмосфера');
      }
    }

    // 5. Соответствие компании
    const companyBonus = COMPANY_CATEGORY_WEIGHTS[company]?.[event.category] || 0;
    if (companyBonus > 0) {
      score += companyBonus;
      if (company === 'couple') reasons.push('Идеально для свидания');
      if (company === 'friends') reasons.push('Отлично для компании');
      if (company === 'family') reasons.push('Для всей семьи');
      if (company === 'alone') reasons.push('Для отдыха наедине с собой');
    }

    // 6. Актуальность по времени (сегодня/ближайшие дни)
    try {
      const eventTime = new Date(event.date).getTime();
      const diffHours = (eventTime - Date.now()) / (1000 * 3600);
      if (diffHours >= 0 && diffHours <= 48) {
        score += 15;
      }
    } catch {
      // ignore
    }

    // 7. Пользовательские события сообщества
    if (event.isCustom) {
      score += 10;
    }

    const matchPercent = Math.min(Math.max(Math.round(score), 55), 99);
    scored.push({
      event,
      score,
      matchPercent,
      reasons: reasons.length > 0 ? reasons : ['Рекомендовано Флюгером для вашего города'],
    });
  }

  scored.sort((a, b) => b.score - a.score);

  const topScored = scored.slice(0, 5);
  const bestEvent = topScored[0]?.event;
  const bestCategory = bestEvent?.category || cityCategory || 'concert';
  const { angle, label } = calculateCompassAngle(bestCategory, city);

  const userName = profile?.name ? profile.name : 'друг';
  const interestMeta = getInterestById(bestCategory);
  const targetLabel = interestMeta?.label || 'досуг';

  let summaryTitle = 'Маршрут построен';
  let verdict = '';

  if (mood === 'new') {
    summaryTitle = `Курс на неизведанное: ${targetLabel}`;
    verdict = `${userName}, флюгер развернулся к новым горизонтам. Найдено то, что расширит твои впечатления в городе.`;
  } else if (mood === 'energy') {
    summaryTitle = `Эпицентр энергии: ${targetLabel}`;
    verdict = `${userName}, стрелка компаса указывает на самые драйвовые события города для яркого вечера.`;
  } else if (mood === 'relax') {
    summaryTitle = `Гармония и уют: ${targetLabel}`;
    verdict = `${userName}, штиль и эстетика. Мы подобрали самые душевные локации для приятного отдыха.`;
  } else {
    summaryTitle = `Точное попадание: ${targetLabel}`;
    verdict = `${userName}, маршрут сформирован на основе твоих интересов и актуальной афиши города.`;
  }

  const recommendations: FlugerAIRecommendation[] = topScored.map((item) => ({
    event: item.event,
    matchScore: item.score,
    matchPercent: item.matchPercent,
    matchReason: item.reasons.slice(0, 2).join(' • '),
  }));

  return {
    summaryTitle,
    verdict,
    directionLabel: label,
    compassAngle: angle,
    recommendations,
    source: 'hybrid-rag',
  };
}

/**
 * Опциональный вызов облачной LLM
 */
export async function analyzeWithCloudLLM(
  events: EventItem[],
  profile: UserProfile | null,
  answers: FlugerAIRequest['answers'],
  apiKey: string,
  cityName: string = 'городе'
): Promise<FlugerAIResponse | null> {
  try {
    const compactEvents = events.slice(0, 15).map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      date: e.date,
      place: e.place,
      description: e.description?.slice(0, 120),
    }));

    const prompt = `
Ты — ИИ "Флюгер", персональный интеллектуальный гид по досугу в городе ${cityName}.
Пользователь:
- Имя: ${profile?.name || 'Пользователь'}
- Возраст: ${profile?.ageGroup || 'не указан'}
- Интересы: ${(profile?.interests || []).join(', ') || 'разносторонние'}

Ответы:
- Настроение: ${answers.mood || 'не уточнено'}
- Выбранное направление в городе: ${answers.cityCategory || 'любое'}
- Компания: ${answers.company || 'не уточнено'}

Афиша города:
${JSON.stringify(compactEvents)}

Верни строго JSON объект:
{
  "summaryTitle": "Короткий заголовок маршрута (до 5 слов)",
  "verdict": "2 коротких живых предложения с обоснованием выбора",
  "directionLabel": "Сторона света и ориентир (например: 'Юго-Восток: Арт и джаз')",
  "compassAngle": 135,
  "topEventIds": ["id1", "id2"],
  "reasons": { "id1": "почему подходит", "id2": "почему подходит" }
}
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as any;
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');

    if (!parsed.topEventIds || !Array.isArray(parsed.topEventIds)) return null;

    const recommendations: FlugerAIRecommendation[] = [];
    for (let i = 0; i < parsed.topEventIds.length; i++) {
      const id = parsed.topEventIds[i];
      const ev = events.find((e) => e.id === id);
      if (ev) {
        recommendations.push({
          event: ev,
          matchScore: 92 - i * 5,
          matchPercent: 98 - i * 4,
          matchReason: parsed.reasons?.[id] || 'Подобрано нейросетью по вашему запросу',
        });
      }
    }

    if (recommendations.length === 0) return null;

    return {
      summaryTitle: parsed.summaryTitle || 'Маршрут построен',
      verdict: parsed.verdict || 'ИИ проанализировал афишу города под твой запрос.',
      directionLabel: parsed.directionLabel || 'Северо-Восток',
      compassAngle: typeof parsed.compassAngle === 'number' ? parsed.compassAngle : 45,
      recommendations,
      source: 'llm-cloud',
    };
  } catch {
    return null;
  }
}
