import type { EventItem } from '../types/event';
import type { ChatMessage, CreateEventPayload } from '../types/social';
import type { RegistrationData } from '../types/user';
import { getCachedEvents, setCachedEvents, loadStoredChatMessages, saveStoredChatMessage, saveStoredCustomEvent } from './storage';
import { mockEventsForCity } from '../data/events';
import { CITIES } from '../data/cities';

const API_BASE = '/api';

export interface FetchEventsOptions {
  citySlug?: string;
  lat?: number;
  lon?: number;
  radiusKm?: number;
  category?: string;
  search?: string;
  dateFilter?: 'today' | 'tomorrow' | 'weekend' | 'all';
}

export async function fetchEvents(optionsOrCitySlug?: string | FetchEventsOptions): Promise<EventItem[]> {
  const options: FetchEventsOptions =
    typeof optionsOrCitySlug === 'string'
      ? { citySlug: optionsOrCitySlug }
      : optionsOrCitySlug || {};

  const citySlug = options.citySlug || 'kzn';

  // Формируем query params для собственного API
  const params = new URLSearchParams();
  if (options.citySlug) params.set('city', options.citySlug);
  if (typeof options.lat === 'number') params.set('lat', String(options.lat));
  if (typeof options.lon === 'number') params.set('lon', String(options.lon));
  if (typeof options.radiusKm === 'number') params.set('radiusKm', String(options.radiusKm));
  if (options.category && options.category !== 'all') params.set('category', options.category);
  if (options.search) params.set('search', options.search);
  if (options.dateFilter && options.dateFilter !== 'all') params.set('dateFilter', options.dateFilter);

  // 1. Проверяем локальный кэш (если запрос базовый по городу без мелких фильтров)
  const isBaseCityQuery = !options.category && !options.search && !options.dateFilter && !options.lat;
  const cached = isBaseCityQuery ? getCachedEvents(citySlug) : null;
  const now = Date.now();
  const isFresh = cached && now - cached.timestamp < 1000 * 60 * 15; // 15 минут

  if (isFresh && cached && cached.items.length > 0) {
    return cached.items;
  }

  try {
    const url = `${API_BASE}/events?${params.toString()}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items)) {
        if (isBaseCityQuery && data.items.length > 0) {
          setCachedEvents(citySlug, data.items);
        }
        return data.items;
      }
    }
  } catch (err) {
    console.warn('Custom API fetch failed, falling back to cache or mock:', err);
  }

  // Если запрос не прошел, но есть кэш
  if (cached && cached.items.length > 0) {
    return cached.items;
  }

  // Если сервер недоступен — используем расширенные моки для города
  const city = CITIES.find((c) => c.slug === citySlug) || CITIES[0];
  const mocks = mockEventsForCity(city, 24);
  setCachedEvents(citySlug, mocks);
  return mocks;
}

export async function createCustomEvent(payload: CreateEventPayload, author: { id: string | number; name: string }): Promise<EventItem> {
  const fallbackItem: EventItem = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: payload.title,
    description: payload.description || 'Встреча единомышленников, организованная пользователем через MAX.',
    category: payload.category,
    date: payload.date,
    place: payload.place,
    lon: payload.lon,
    lat: payload.lat,
    citySlug: payload.citySlug,
    image: payload.image || 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&auto=format&fit=crop&q=80',
    images: payload.images && payload.images.length > 0 ? payload.images : undefined,
    price: payload.price || 'Бесплатно',
    ageRestricted: false,
    isCustom: true,
    isPrivate: payload.isPrivate,
    requiresRegistration: payload.requiresRegistration,
    registeredCount: 1,
    authorId: author.id,
    authorName: author.name,
  };

  try {
    const res = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, authorId: author.id, authorName: author.name }),
    });
    if (res.ok) {
      const created = await res.json();
      saveStoredCustomEvent(created);
      return created;
    }
  } catch (err) {
    console.warn('API createCustomEvent error, using local fallback:', err);
  }

  saveStoredCustomEvent(fallbackItem);
  return fallbackItem;
}

export async function fetchEventChat(eventId: string, eventFallback?: EventItem): Promise<ChatMessage[]> {
  try {
    const res = await fetch(`${API_BASE}/chat/${encodeURIComponent(eventId)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        return data.messages;
      }
    }
  } catch (e) {
    console.warn('Failed to load chat from server, using local store:', e);
  }

  const stored = loadStoredChatMessages(eventId);
  if (stored && stored.length > 0) {
    return stored;
  }

  return [];
}

export async function postChatMessage(eventId: string, message: { userId: string | number; userName: string; userAvatar?: string; text: string }): Promise<ChatMessage> {
  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    eventId,
    userId: message.userId,
    userName: message.userName,
    userAvatar: message.userAvatar,
    text: message.text.trim(),
    createdAt: new Date().toISOString(),
  };

  try {
    const res = await fetch(`${API_BASE}/chat/${encodeURIComponent(eventId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    if (res.ok) {
      const serverMsg = await res.json();
      saveStoredChatMessage(eventId, serverMsg);
      return serverMsg;
    }
  } catch (e) {
    console.warn('postChatMessage server error, saving locally:', e);
  }

  saveStoredChatMessage(eventId, newMsg);
  return newMsg;
}


export async function registerForEventApi(eventId: string, registration: RegistrationData): Promise<{ success: boolean; registeredCount: number }> {
  const res = await fetch(`${API_BASE}/events/${encodeURIComponent(eventId)}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registration),
  });
  if (!res.ok) {
    throw new Error('Ошибка регистрации на мероприятие');
  }
  return res.json();
}
