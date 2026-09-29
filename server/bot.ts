import { Bot, Keyboard, Context } from '@maxhub/max-bot-api';

try {
  if (typeof (process as any).loadEnvFile === 'function') {
    (process as any).loadEnvFile();
  }
} catch {
  // .env is optional
}

export const BOT_TOKEN =
  process.env.BOT_TOKEN ||
  'f9LHodD0cOKAeqhSUF83IlVf99PSQ09jy98YSkb3LjJtJNU-1BTZ13V38LWfR19tWateBVDI0NyaT9rC3C_W';

export const BOT_NAME = process.env.BOT_NAME || 't543_hakaton_max_bot';

export const WELCOME_MESSAGE =
  'Привет! Весь мой функционал реализован в мини-приложении. Скорее запускай 👇';

/**
 * Создание инлайн-клавиатуры с кнопкой открытия мини-приложения
 * @param payload - опциональный стартовый параметр (например, реферальный код мероприятия ref_..._event_...)
 */
export function createOpenAppKeyboard(payload?: string | null) {
  return Keyboard.inlineKeyboard([
    [
      Keyboard.button.openApp(
        'Запустить мини-приложение',
        BOT_NAME,
        undefined,
        payload || undefined
      ),
    ],
  ]);
}

export const bot = new Bot(BOT_TOKEN);

function getUserId(ctx: any): number | undefined {
  return ctx.user?.user_id || ctx.update?.user?.user_id || ctx.message?.sender?.user_id;
}

/**
 * Отправка приветственного сообщения с инлайн-кнопкой открытия мини-приложения
 */
async function sendWelcome(ctx: Context, payload?: string | null) {
  const keyboard = createOpenAppKeyboard(payload);
  const options = {
    attachments: [keyboard],
  };

  try {
    if (ctx.chatId) {
      await ctx.reply(WELCOME_MESSAGE, options);
    } else {
      const uid = getUserId(ctx);
      if (uid) {
        await ctx.api.sendMessageToUser(uid, WELCOME_MESSAGE, options);
      }
    }
  } catch (err: any) {
    console.error('[MAX Bot] Ошибка при отправке приветствия:', err?.message || err);
  }
}

// 1. Обработка запуска бота (событие bot_started, например, при переходе по диплинку https://max.ru/<bot>?start=<payload>)
bot.on('bot_started', async (ctx) => {
  const payload = ctx.startPayload || (ctx.update as any)?.payload || null;
  const uid = getUserId(ctx) || 'unknown';
  console.log(`[MAX Bot] Получено событие bot_started от пользователя ${uid}, payload: ${payload}`);
  await sendWelcome(ctx, payload);
});

// 2. Обработка команды /start
bot.command('start', async (ctx) => {
  const text = (ctx.message as any)?.body?.text || '';
  const match = text.trim().match(/^\/start(?:\s+(.+))?$/);
  const payload = match && match[1] ? match[1].trim() : null;
  const uid = getUserId(ctx) || 'unknown';
  console.log(`[MAX Bot] Получена команда /start от пользователя ${uid}, payload: ${payload}`);
  await sendWelcome(ctx, payload);
});

// 3. Обработка любых других входящих текстовых сообщений
bot.on('message_created', async (ctx) => {
  const text = (ctx.message as any)?.body?.text || '';
  if (text.startsWith('/start')) {
    return; // уже обработано в bot.command('start')
  }
  const uid = getUserId(ctx);
  console.log(`[MAX Bot] Сообщение от пользователя ${uid}: "${text}" -> напоминаем о мини-приложении`);
  await sendWelcome(ctx);
});

// 4. Добавление бота в чат или группу
bot.on('bot_added', async (ctx) => {
  console.log(`[MAX Bot] Бот добавлен в чат ${ctx.chatId}`);
  await sendWelcome(ctx);
});

// 5. Обработка callback-кнопок
bot.on('message_callback', async (ctx) => {
  try {
    await ctx.answerOnCallback({});
  } catch {}
});

/**
 * Обработка входящего вебхука от серверов MAX
 */
export async function handleWebhookUpdate(update: any): Promise<void> {
  const botAny = bot as any;
  if (botAny && typeof botAny.handleUpdate === 'function') {
    await botAny.handleUpdate(update);
  }
}

/**
 * Запуск бота в режиме фонового long polling (с защитой от сбоев сети)
 */
export async function startBot(): Promise<void> {
  console.log(`[MAX Bot] Инициализация бота @${BOT_NAME}...`);
  try {
    bot
      .start({ mode: 'polling' })
      .then(() => {
        console.log(`[MAX Bot] Polling запущен успешно для @${BOT_NAME}`);
      })
      .catch((err: any) => {
        console.warn(
          `[MAX Bot] Предупреждение подключения polling (доступен webhook режим):`,
          err?.message || err
        );
      });
  } catch (err: any) {
    console.warn(`[MAX Bot] Ошибка запуска бота:`, err?.message || err);
  }
}

// Запуск при прямом вызове файла: `tsx server/bot.ts`
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('bot.ts') || process.argv[1].endsWith('bot.js'));

if (isDirectRun) {
  startBot();
}
