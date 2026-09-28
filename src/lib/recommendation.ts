import type { EventItem } from '../types/event';
import type { UserProfile } from '../types/user';
import { getInterestConfig } from '../config/interests.config';

export interface ScoredEvent extends EventItem {
  matchScore: number;
  matchPercent: number;
  matchReason: string;
}

export function filterAndScoreEvents(events: EventItem[], profile: UserProfile | null): ScoredEvent[] {
  if (!events || events.length === 0) return [];
  if (!profile) {
    return events.map((e) => ({
      ...e,
      matchScore: 70,
      matchPercent: 70,
      matchReason: 'Популярное событие города',
    }));
  }

  const userInterests = new Set(profile.interests);
  const isMinor = profile.ageGroup === '6-11' || profile.ageGroup === '12-15';
  const isYouth = profile.ageGroup === '16-21' || profile.ageGroup === '22-29';
  const isSenior = profile.ageGroup === '60+';

  const scored: ScoredEvent[] = [];

  for (const event of events) {
    // 1. Строгая проверка возрастных ограничений
    if (isMinor && event.ageRestricted) {
      continue;
    }
    if (profile.ageGroup === '6-11' && (event.minAge || 0) > 11) {
      continue;
    }

    let score = 30; // базовая оценка
    const reasons: string[] = [];

    // 2. Оценка по интересам (до 50 баллов)
    if (userInterests.has(event.category)) {
      score += 45;
      const meta = getInterestConfig(event.category);
      if (meta) {
        reasons.push(meta.label);
      }
    }

    // 3. Соответствие возрасту
    if (isYouth && (event.category === 'concert' || event.category === 'party' || event.category === 'quest')) {
      score += 15;
    } else if (isSenior && (event.category === 'theater' || event.category === 'exhibition' || event.category === 'walk')) {
      score += 15;
    } else if (isMinor && (event.category === 'kids' || event.category === 'quest' || event.category === 'sport')) {
      score += 20;
    }

    // 4. Актуальность по дате (события в ближайшие 3-7 дней ценнее)
    try {
      const eventTime = new Date(event.date).getTime();
      const now = Date.now();
      const diffHours = (eventTime - now) / (1000 * 3600);
      if (diffHours >= 0 && diffHours <= 48) {
        score += 10;
      } else if (diffHours > 48 && diffHours <= 168) {
        score += 5;
      }
    } catch {
      // Ignore date parse
    }

    // Ограничиваем процент 99% максимум
    const matchPercent = Math.min(Math.max(Math.round(score), 45), 99);
    const reasonText = reasons.length > 0 
      ? `Подходит вам: ${reasons.join(', ')}`
      : 'Рекомендовано для вашего возраста и города';

    scored.push({
      ...event,
      matchScore: score,
      matchPercent,
      matchReason: reasonText,
    });
  }

  // Сортировка: наивысший matchScore сначала
  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored;
}
