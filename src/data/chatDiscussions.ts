import type { ChatMessage } from '../types/social';
import type { EventItem } from '../types/event';

interface AttendeeSeed {
  name: string;
  avatar?: string;
  role?: string;
}

const ATTENDEES: AttendeeSeed[] = [
  { name: 'Алексей Смирнов', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80' },
  { name: 'Дарья Морозова', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80' },
  { name: 'Максим Лебедев', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80' },
  { name: 'Полина Кузнецова', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&auto=format&fit=crop&q=80' },
  { name: 'Кирилл Волков', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80' },
  { name: 'Елена Васильева', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80' },
];

export function getMockDiscussionForEvent(event: EventItem): ChatMessage[] {
  const eventDate = new Date(event.date);
  const timeStr = eventDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const dateStr = eventDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

  // Generate 4-6 contextual messages
  const baseTime = Date.now() - 1000 * 60 * 60 * 3; // 3 hours ago

  const categoryMessages: Record<string, string[]> = {
    concert: [
      `Всем привет! Кто тоже планирует пойти на «${event.title}»? Во сколько запуск?`,
      `Привет! Обычно запускают за 45 минут до начала. Мы с ребятами планируем подойти к ${timeStr}, чтобы не стоять в очереди.`,
      `Подскажите, а в ${event.place} звук нормальный ближе к сцене или лучше чуть дальше встать?`,
      `Лучше по центру у пульта звукорежиссёра, там идеальный баланс и не глушит!`,
      `Отлично, спасибо за наводку! Давайте у входа пересечёмся перед началом 🙌`,
    ],
    theater: [
      `Кто уже смотрел эту постановку? Стоит ли брать программку?`,
      `Да, обязательно! Там очень интересные заметки режиссёра. Спектакль производит сильное впечатление.`,
      `А как с гардеробом в ${event.place}? Большие очереди после окончания?`,
      `В правом крыле обычно свободнее, лучше туда сдавать пальто.`,
    ],
    cinema: [
      `Ночной показ классики — отличная идея на вечер! Кто на каком ряду взял?`,
      `Мы взяли 6-й ряд по центру, экран там видно идеально.`,
      `В кинозале прохладно бывает, советую захватить толстовку или плед на всякий случай 👍`,
      `Супер, встретимся в фойе перед сеансом!`,
    ],
    party: [
      `Хей! Кто сегодня на тусу? Лайнап обещает быть очень горячим 🔥`,
      `Мы уже столик забронировали на 5 человек! Дресс-код свободный или smart casual?`,
      `Свободный, главное удобная обувь, танцевать будем до утра!`,
      `Кто хочет объединиться в компанию — пишите сюда, будем рады познакомиться!`,
    ],
    quest: [
      `Привет! Есть у кого свободный слот в команду? Нас двое, опыт в квизах есть) 😄`,
      `Привет! Нам как раз нужны 2 эрудита по кино и музыке, присоединяйтесь к нам за 4-й столик!`,
      `Договорились! Как называется команда?`,
      `«Флюгер Интуиции»! Встретимся в ${timeStr} 🏆`,
    ],
    sport: [
      `Привет спортсменам! Коврики свои нужно брать или там выдадут?`,
      `Организаторы обещали предоставить, но если есть свой любимый — лучше захватить.`,
      `Разминка начинается ровно в ${timeStr}, встречаемся у центрального входа в ${event.place}.`,
    ],
  };

  const pool = categoryMessages[event.category] || [
    `Привет всем участникам! Кто уже бывал в ${event.place}?`,
    `Привет! Место классное, очень атмосферное. Главное не опаздывать к ${timeStr}.`,
    `Спасибо! Мы идем небольшой компанией, если кто один — присоединяйтесь!`,
    `Отличная инициатива, с удовольствием пообщаемся вживую!`,
  ];

  return pool.map((text, idx) => {
    const attendee = ATTENDEES[idx % ATTENDEES.length];
    return {
      id: `seed-${event.id}-${idx}`,
      eventId: event.id,
      userId: `user-${idx + 10}`,
      userName: attendee.name,
      userAvatar: attendee.avatar,
      text,
      createdAt: new Date(baseTime + idx * 1000 * 60 * 25).toISOString(),
    };
  });
}
