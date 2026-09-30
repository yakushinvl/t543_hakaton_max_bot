import type { EventItem } from '../types/event';
import type { ChatMessage, CreateEventPayload } from '../types/social';
import {
  getCachedEvents,
  setCachedEvents,
  loadStoredChatMessages,
  saveStoredChatMessage,
  saveStoredCustomEvent,
  loadStoredCustomEvents,
  loadDeletedCustomEventIds,
} from './storage';

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
  const deletedIds = loadDeletedCustomEventIds();
  const filterDeleted = (list: EventItem[]) => {
    if (deletedIds.size === 0) return list;
    return list.filter((item) => !deletedIds.has(item.id));
  };

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
    return filterDeleted(cached.items);
  }

  try {
    const url = `${API_BASE}/events?${params.toString()}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items)) {
        const validItems = filterDeleted(data.items);
        if (isBaseCityQuery && validItems.length > 0) {
          setCachedEvents(citySlug, validItems);
        }
        return validItems;
      }
    }
  } catch (err) {
    console.warn('Custom API fetch failed, falling back to cache:', err);
  }

  // Если запрос не прошел, но есть кэш
  if (cached && cached.items.length > 0) {
    return filterDeleted(cached.items);
  }

  return [];
}

/**
 * Загрузка конкретного мероприятия по ID (для реферальных ссылок и прямых переходов)
 */
export async function fetchEventById(eventId: string): Promise<EventItem | null> {
  try {
    const res = await fetch(`${API_BASE}/events/${encodeURIComponent(eventId)}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.item) {
        return data.item;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch event by id from API:', err);
  }

  // Fallback к локальным кастомным событиям
  const localCustom = loadStoredCustomEvents();
  const found = localCustom.find((e: EventItem) => e.id === eventId);
  return found || null;
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

export async function deleteCustomEventApi(eventId: string, userId?: string | number): Promise<boolean> {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (userId) {
      headers['X-MAX-User-Id'] = String(userId);
    }
    const res = await fetch(`${API_BASE}/events/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
      headers,
    });
    return res.ok;
  } catch (err) {
    console.warn('API deleteCustomEvent error:', err);
    return false;
  }
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

export interface UserCloudSyncResponse {
  success: boolean;
  userId: string;
  data: any;
  isNew?: boolean;
}

export async function fetchUserCloudDataApi(
  initData: string,
  userId?: string
): Promise<UserCloudSyncResponse | null> {
  try {
    const params = new URLSearchParams();
    if (initData) params.set('initData', initData);
    if (userId) params.set('userId', userId);

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (initData) {
      headers['X-MAX-Init-Data'] = initData;
    }
    if (userId) {
      headers['X-MAX-User-Id'] = userId;
    }

    const res = await fetch(`${API_BASE}/user/data?${params.toString()}`, {
      headers,
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch user cloud data:', err);
  }
  return null;
}

export async function syncUserCloudDataApi(
  initData: string,
  data: any,
  platform?: string,
  userId?: string
): Promise<UserCloudSyncResponse | null> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (initData) headers['X-MAX-Init-Data'] = initData;
    if (platform) headers['X-MAX-Platform'] = platform;
    if (userId) headers['X-MAX-User-Id'] = userId;

    const res = await fetch(`${API_BASE}/user/sync`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        initData,
        userId,
        platform,
        data,
      }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to sync user cloud data:', err);
  }
  return null;
}

