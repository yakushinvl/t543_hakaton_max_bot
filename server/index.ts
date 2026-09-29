import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db';
import { validateMaxInitData, parseMaxUserFromInitData } from './maxAuth';
import { analyzeWithLocalSemanticEngine, analyzeWithCloudLLM, type FlugerAIRequest } from './flugerAI';
import { startBot, handleWebhookUpdate } from './bot';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Прокси картинок с KudaGo с кэшированием и CORS для Canvas
app.get('/kg-media/*', async (req, res) => {
  const subPath = (req.params as any)[0] || '';
  const targetUrl = `https://media.kudago.com/${subPath}`;

  try {
    const upstream = await fetch(targetUrl);
    if (!upstream.ok) {
      return res.status(upstream.status).end();
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');

    const buffer = await upstream.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(502).end();
  }
});

import { eventAggregator } from './providers/aggregator';
import { calculateGeoDistanceKm } from './providers/types';

// Собственное универсальное API получения мероприятий:
// Поддерживает:
// - Мульти-источники (федеральный KudaGo + локальные городские порталы Москвы, СПб, Казани + кастомные)
// - Интеллектуальную дедупликацию (одно и то же мероприятие из разных источников не двоится)
// - Поиск по геолокации (lat, lon, radiusKm)
// - Фильтрацию по категории, поисковому запросу, диапазону дат
app.get('/api/events', async (req, res) => {
  try {
    let city = (req.query.city as string) || '';
    const latStr = req.query.lat as string;
    const lonStr = req.query.lon as string;
    const radiusStr = req.query.radiusKm as string;
    const category = req.query.category as string;
    const search = req.query.search as string;
    const dateFilter = req.query.dateFilter as string; // 'today' | 'tomorrow' | 'weekend' | 'all'

    const lat = latStr ? parseFloat(latStr) : undefined;
    const lon = lonStr ? parseFloat(lonStr) : undefined;
    const radiusKm = radiusStr ? parseFloat(radiusStr) : 25;

    // Если город не передан, но переданы координаты (геолокация пользователя) — определяем ближайший город
    if (!city && typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
      city = eventAggregator.findNearestCity(lat, lon);
    }
    if (!city) {
      city = 'kzn';
    }

    // Получаем агрегированные и дедуплицированные мероприятия
    let events = await eventAggregator.getEvents(city);

    // 1. Фильтр по расстоянию (если передана точная геолокация и радиус)
    if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
      events = events.filter((e) => {
        const d = calculateGeoDistanceKm(lat, lon, e.lat, e.lon);
        return d <= radiusKm;
      });
    }

    // 2. Фильтр по категории
    if (category && category !== 'all') {
      events = events.filter((e) => e.category === category);
    }

    // 3. Фильтр по текстовому поиску (название, место, описание)
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      events = events.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.place.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q))
      );
    }

    // 4. Фильтр по дате
    if (dateFilter && dateFilter !== 'all') {
      const now = new Date();
      events = events.filter((e) => {
        const d = new Date(e.date);
        if (dateFilter === 'today') {
          return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
        }
        if (dateFilter === 'tomorrow') {
          const tmrw = new Date(now);
          tmrw.setDate(tmrw.getDate() + 1);
          return d.getDate() === tmrw.getDate() && d.getMonth() === tmrw.getMonth();
        }
        if (dateFilter === 'weekend') {
          const day = d.getDay();
          return day === 6 || day === 0;
        }
        return true;
      });
    }

    res.json({
      success: true,
      city,
      count: events.length,
      filters: {
        category: category || 'all',
        search: search || null,
        dateFilter: dateFilter || 'all',
        geo: lat && lon ? { lat, lon, radiusKm } : null,
      },
      items: events,
    });
  } catch (err: any) {
    console.error('API /api/events error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

// Получение одного мероприятия по ID (для реферальных ссылок, чат-бота и шеринга)
app.get('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Поиск в пользовательских мероприятиях БД
    const customEvents = db.getCustomEvents();
    const foundCustom = customEvents.find((e) => e.id === id);
    if (foundCustom) {
      return res.json({ success: true, item: foundCustom });
    }

    // 2. Поиск в агрегированных мероприятиях ключевых городов
    for (const city of ['kzn', 'msk', 'spb']) {
      const cityEvents = await eventAggregator.getEvents(city);
      const found = cityEvents.find((e) => e.id === id);
      if (found) {
        return res.json({ success: true, item: found });
      }
    }

    res.status(404).json({ success: false, error: 'Event not found' });
  } catch (err: any) {
    console.error('API /api/events/:id error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

// Интеллектуальный ИИ помощник "Флюгер" (RAG + LLM)
app.post('/api/ai/fluger', async (req, res) => {
  try {
    const { city = 'kzn', profile, answers, events: clientEvents } = req.body as FlugerAIRequest;

    // Если клиент не передал мероприятия, берем актуальные для города через агрегатор
    let events = clientEvents;
    if (!events || events.length === 0) {
      events = await eventAggregator.getEvents(city);
    }

    const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
    if (apiKey) {
      const cloudResult = await analyzeWithCloudLLM(events, profile || null, answers, apiKey);
      if (cloudResult) {
        return res.json(cloudResult);
      }
    }

    // Локальный семантический RAG движок (быстрый, надежный, 100% стабильность)
    const result = analyzeWithLocalSemanticEngine(events, profile || null, answers);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Fluger AI processing error' });
  }
});

// Создание своего мероприятия
app.post('/api/events', (req, res) => {
  const {
    title,
    description,
    category,
    date,
    place,
    lon,
    lat,
    citySlug,
    isPrivate,
    requiresRegistration,
    image,
    images,
    price,
    authorId,
    authorName,
  } = req.body;

  if (!title || !category || !date) {
    return res.status(400).json({ error: 'Title, category and date are required' });
  }

  const newEvent = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    description: description || 'Пользовательское мероприятие',
    category,
    date,
    place: place || 'Место встречи уточняется',
    lon: lon || 49.1221,
    lat: lat || 55.7887,
    citySlug: citySlug || 'kzn',
    image: image || 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&auto=format&fit=crop&q=80',
    images: Array.isArray(images) && images.length > 0 ? images : undefined,
    ageRestricted: false,
    price: price || 'Бесплатно / Организаторский сбор',
    isCustom: true,
    isPrivate: Boolean(isPrivate),
    authorId,
    authorName: authorName || 'Пользователь MAX',
    createdAt: new Date().toISOString(),
  };

  db.addCustomEvent(newEvent);
  res.status(201).json(newEvent);
});

// Получение чата по мероприятию
app.get('/api/chat/:eventId', (req, res) => {
  const { eventId } = req.params;
  const messages = db.getChatMessages(eventId);
  res.json({ eventId, messages });
});

// Отправка сообщения в чат мероприятия
app.post('/api/chat/:eventId', (req, res) => {
  const { eventId } = req.params;
  const { userId, userName, userAvatar, text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Message text cannot be empty' });
  }

  const message = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    eventId,
    userId: userId || 'anonymous',
    userName: userName || 'Пользователь MAX',
    userAvatar,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };

  db.addChatMessage(eventId, message);
  res.status(201).json(message);
});

// Валидация MAX initData
app.post('/api/auth/validate', (req, res) => {
  const { initData } = req.body;
  const result = validateMaxInitData(initData);
  res.json(result);
});

// Получение данных пользователя MAX для синхронизации между платформами (iOS, Android, Desktop, Web)
app.get('/api/user/data', (req, res) => {
  try {
    let userId: string | null = null;
    let maxUser: any = null;
    let isValid = false;

    const initData =
      (req.headers['x-max-init-data'] as string) ||
      (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].slice(7) : '') ||
      (req.query.initData as string) ||
      '';

    if (initData) {
      const parsed = parseMaxUserFromInitData(initData);
      if (parsed.userId) {
        userId = parsed.userId;
        maxUser = parsed.user;
        isValid = parsed.valid;
      }
    }

    if (!userId) {
      userId = (req.query.userId as string) || (req.headers['x-max-user-id'] as string) || null;
    }

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID or initData is required' });
    }

    const userData = db.getUserData(userId);

    res.json({
      success: true,
      userId,
      maxUser,
      validSignature: isValid,
      isNew: !userData,
      data: userData || null,
    });
  } catch (err: any) {
    console.error('Error fetching user data:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

// Сохранение и двусторонняя синхронизация данных пользователя MAX
app.post('/api/user/sync', (req, res) => {
  try {
    let userId: string | null = null;
    let isValid = false;

    const initData =
      req.body.initData ||
      (req.headers['x-max-init-data'] as string) ||
      (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].slice(7) : '') ||
      '';

    if (initData) {
      const parsed = parseMaxUserFromInitData(initData);
      if (parsed.userId) {
        userId = parsed.userId;
        isValid = parsed.valid;
      }
    }

    if (!userId) {
      userId = req.body.userId || (req.headers['x-max-user-id'] as string) || null;
    }

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID or initData is required' });
    }

    const incomingData = req.body.data || {};
    const platform = req.body.platform || (req.headers['x-max-platform'] as string);

    const saved = db.saveUserData(userId, incomingData, platform);

    res.json({
      success: true,
      userId,
      validSignature: isValid,
      data: saved,
    });
  } catch (err: any) {
    console.error('Error syncing user data:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

// Эндпоинт для приема Webhook обновлений от платформы MAX
app.post('/api/bot/webhook', async (req, res) => {
  try {
    await handleWebhookUpdate(req.body);
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Статика в продакшене (dist)
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/kg-media')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  // Запуск MAX чат-бота
  startBot().catch((err) => {
    console.warn('Bot initialization warning:', err?.message || err);
  });
});
