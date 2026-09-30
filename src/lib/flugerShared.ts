/**
 * Общая логика "Флюгера", используемая и клиентским офлайн-движком
 * (src/lib/flugerAI.ts), и серверным (server/flugerAI.ts) — чтобы оба давали
 * одинаковый результат и не расходились при правках.
 */
import type { EventItem } from '../types/event';
import { parseEventPrice } from './priceUtils';

export type TimeWindow = 'today' | 'weekend' | 'anytime';
export type Budget = 'free' | 'paid_ok';

export interface FlugerCommonAnswers {
  mood?: string;
  cityCategory?: string;
  company?: string;
  timeWindow?: TimeWindow;
  budget?: Budget;
  customText?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * У части событий без точной даты (постоянные экспозиции, ежедневные экскурсии)
 * провайдер (server/providers/kudagoProvider.ts) явно помечает это полем
 * `hasExactDate: false` — поле `date` у таких событий лишь техническая
 * заглушка ("сейчас"), а не время проведения, и её нельзя использовать
 * для вопроса "сегодня или на выходных?".
 *
 * Для событий без этого флага (например, старые кэшированные данные) —
 * запасная эвристика: если дата подозрительно близка к текущему моменту,
 * скорее всего это тоже заглушка, а не совпадение.
 */
function isMissingDate(event: Pick<EventItem, 'date' | 'hasExactDate'>): boolean {
  if (event.hasExactDate === true) return false;
  if (event.hasExactDate === false) return true;
  const t = new Date(event.date).getTime();
  if (Number.isNaN(t)) return true;
  return Math.abs(Date.now() - t) < 5 * 60 * 1000;
}

/** В пределах ближайших ~36 часов — «сегодня/завтра» */
export function isTodayOrTomorrow(event: Pick<EventItem, 'date' | 'hasExactDate'>): boolean {
  if (isMissingDate(event)) return false;
  const t = new Date(event.date).getTime();
  const diff = t - Date.now();
  return diff >= -3 * 60 * 60 * 1000 && diff <= 36 * 60 * 60 * 1000;
}

/** Ближайшая суббота или воскресенье (в пределах недели вперёд) */
export function isUpcomingWeekend(event: Pick<EventItem, 'date' | 'hasExactDate'>): boolean {
  if (isMissingDate(event)) return false;
  const d = new Date(event.date);
  const t = d.getTime();
  const diff = t - Date.now();
  if (diff < -3 * 60 * 60 * 1000 || diff > 8 * DAY_MS) return false;
  const day = d.getDay(); // 0=вс, 6=сб
  return day === 0 || day === 6;
}

/**
 * Считает, сколько событий-кандидатов попадает в каждое временное окно —
 * нужно, чтобы решить, стоит ли вообще задавать вопрос "когда?"
 * (если почти все события "сегодня" — разделять нечего).
 */
export function computeTimeBuckets(events: EventItem[]): { today: number; weekend: number; later: number } {
  let today = 0;
  let weekend = 0;
  let later = 0;
  for (const e of events) {
    if (isMissingDate(e)) continue; // без даты — не участвует в подсчёте, не создаёт ложную "вилку"
    if (isTodayOrTomorrow(e)) today++;
    else if (isUpcomingWeekend(e)) weekend++;
    else later++;
  }
  return { today, weekend, later };
}

/** Считает баланс бесплатных/платных событий среди кандидатов */
export function computePriceBuckets(events: EventItem[]): { free: number; paid: number } {
  let free = 0;
  let paid = 0;
  for (const e of events) {
    if (parseEventPrice(e.price).isFree) free++;
    else paid++;
  }
  return { free, paid };
}

/**
 * Решает, какой 4-й вопрос задать (время или бюджет), опираясь на реальное
 * распределение доступных сейчас событий — если делить нечего (все события
 * бесплатные или все "сегодня"), вопрос просто не задаётся.
 */
export function decideFourthQuestionKind(candidates: EventItem[]): 'timeWindow' | 'budget' | null {
  if (candidates.length < 3) return null;

  const time = computeTimeBuckets(candidates);
  const timeNonEmptyBuckets = [time.today, time.weekend, time.later].filter((n) => n > 0).length;
  if (timeNonEmptyBuckets >= 2) return 'timeWindow';

  const price = computePriceBuckets(candidates);
  if (price.free > 0 && price.paid > 0) return 'budget';

  return null;
}

/** Бонус к скору события за совпадение с ответом на "когда?" / "бюджет?" */
export function scoreTimeAndBudget(
  event: EventItem,
  answers: FlugerCommonAnswers
): { bonus: number; reason: string | null } {
  let bonus = 0;
  let reason: string | null = null;
  const unknownDate = isMissingDate(event);

  if (answers.timeWindow === 'today') {
    if (isTodayOrTomorrow(event)) {
      bonus += 45;
      reason = 'Уже сегодня-завтра';
    } else if (!unknownDate) {
      bonus -= 20;
    } // дата неизвестна — не штрафуем и не поощряем, а не делаем вид, что знаем
  } else if (answers.timeWindow === 'weekend') {
    if (isUpcomingWeekend(event)) {
      bonus += 45;
      reason = 'Идеально на выходные';
    } else if (unknownDate) {
      // дата неизвестна — нейтрально
    } else if (isTodayOrTomorrow(event)) {
      bonus -= 5; // не выходные, но и не совсем мимо
    } else {
      bonus -= 15;
    }
  }

  if (answers.budget === 'free') {
    const { isFree } = parseEventPrice(event.price);
    if (isFree) {
      bonus += 30;
      reason = reason ? reason : 'Бесплатно';
    } else {
      bonus -= 15;
    }
  }

  return { bonus, reason };
}

/**
 * Из отсортированного по убыванию скора списка выбирает top N, стараясь не
 * выдавать несколько карточек одной и той же площадки/события подряд —
 * иначе в топ-5 иногда попадали 3 сеанса одной и той же выставки.
 */
export function pickDiverseTop<T extends { event: EventItem }>(sorted: T[], n = 5): T[] {
  const result: T[] = [];
  const usedPlaces = new Set<string>();

  for (const item of sorted) {
    if (result.length >= n) break;
    const placeKey = item.event.place?.trim().toLowerCase();
    if (placeKey && usedPlaces.has(placeKey)) continue;
    result.push(item);
    if (placeKey) usedPlaces.add(placeKey);
  }

  // Если после дедупликации мест наскребли меньше N — добираем оставшимися,
  // не разбирая повторы (лучше показать 5 похожих, чем 2 вообще).
  if (result.length < n) {
    for (const item of sorted) {
      if (result.length >= n) break;
      if (!result.includes(item)) result.push(item);
    }
  }

  return result;
}
