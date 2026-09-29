import type { UserProfile } from '../types/user';
import type { EventItem, UserEventStatus } from '../types/event';
import {
  getMaxUserId,
  getMaxInitData,
  getMaxPlatform,
  saveToBridgeStorage,
  loadFromBridgeStorage,
} from './maxBridge';

const PROFILE_KEY = 'max_event_app_profile_v2';
const APP_SETTINGS_KEY = 'max_event_app_settings_v1';
const EVENT_STATUSES_KEY = 'max_event_app_statuses_v2';
const CACHED_EVENTS_PREFIX = 'max_cached_events_v2_';
const CUSTOM_EVENTS_KEY = 'max_custom_events_v2';
const EVENT_CHATS_PREFIX = 'max_event_chat_v2_';
const REFERRALS_PREFIX = 'max_referrals_stats_v2_';
const LAST_SYNC_KEY = 'max_last_sync_timestamp_v1';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline';

type SyncListener = (status: SyncStatus, data?: any) => void;
const syncListeners = new Set<SyncListener>();
let currentSyncStatus: SyncStatus = 'idle';

export function getSyncStatus(): SyncStatus {
  return currentSyncStatus;
}

export function subscribeToSyncStatus(listener: SyncListener): () => void {
  syncListeners.add(listener);
  listener(currentSyncStatus);
  return () => {
    syncListeners.delete(listener);
  };
}

function notifySyncListeners(status: SyncStatus, data?: any) {
  currentSyncStatus = status;
  syncListeners.forEach((fn) => {
    try {
      fn(status, data);
    } catch {}
  });
}

/**
 * Чтение из локального хранилища с изоляцией по аккаунту MAX пользователя
 */
function getScopedItem(baseKey: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const userId = getMaxUserId();
  if (userId) {
    const scoped = localStorage.getItem(`max_acc_${userId}_${baseKey}`);
    if (scoped !== null) return scoped;
  }
  return localStorage.getItem(baseKey);
}

/**
 * Запись в локальное хранилище и MAX Bridge Storage с привязкой к аккаунту MAX
 */
function setScopedItem(baseKey: string, value: string, skipBridgeSync = false): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const userId = getMaxUserId();
  if (userId) {
    localStorage.setItem(`max_acc_${userId}_${baseKey}`, value);
    if (!skipBridgeSync) {
      saveToBridgeStorage(`max_acc_${userId}_${baseKey}`, value).catch(() => {});
    }
  }
  localStorage.setItem(baseKey, value);
}

export interface AppSettings {
  hapticEnabled: boolean;
  notificationsEnabled: boolean;
  reminderHoursBefore: number;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  hapticEnabled: true,
  notificationsEnabled: true,
  reminderHoursBefore: 2,
};

export function loadAppSettings(): AppSettings {
  try {
    const raw = getScopedItem(APP_SETTINGS_KEY);
    if (!raw) return DEFAULT_APP_SETTINGS;
    return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function saveAppSettings(settings: Partial<AppSettings>): AppSettings {
  try {
    const current = loadAppSettings();
    const updated = { ...current, ...settings };
    setScopedItem(APP_SETTINGS_KEY, JSON.stringify(updated));
    scheduleCloudSync();
    return updated;
  } catch (err) {
    console.error('Failed to save app settings:', err);
    return DEFAULT_APP_SETTINGS;
  }
}

export function loadStoredProfile(): UserProfile | null {
  try {
    const raw = getScopedItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveStoredProfile(profile: UserProfile): void {
  try {
    setScopedItem(PROFILE_KEY, JSON.stringify(profile));
    scheduleCloudSync();
  } catch (err) {
    console.error('Failed to save profile:', err);
  }
}

export function loadEventStatuses(): Record<string, Partial<UserEventStatus>> {
  try {
    const raw = getScopedItem(EVENT_STATUSES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveEventStatus(
  eventId: string,
  key: keyof UserEventStatus,
  value: boolean
): Record<string, Partial<UserEventStatus>> {
  const statuses = loadEventStatuses();
  if (!statuses[eventId]) {
    statuses[eventId] = { saved: false, wantToAttend: false, attended: false };
  }
  statuses[eventId][key] = value;
  try {
    setScopedItem(EVENT_STATUSES_KEY, JSON.stringify(statuses));
    scheduleCloudSync();
  } catch (err) {
    console.error('Failed to save event status:', err);
  }
  return statuses;
}

export function getCachedEvents(citySlug: string): { items: EventItem[]; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(`${CACHED_EVENTS_PREFIX}${citySlug}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCachedEvents(citySlug: string, items: EventItem[]): void {
  try {
    const payload = {
      items,
      timestamp: Date.now(),
    };
    localStorage.setItem(`${CACHED_EVENTS_PREFIX}${citySlug}`, JSON.stringify(payload));
  } catch (err) {
    console.warn('Storage quota exceeded, could not cache events locally:', err);
  }
}

export function loadStoredCustomEvents(): EventItem[] {
  try {
    const raw = getScopedItem(CUSTOM_EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredCustomEvent(event: EventItem): EventItem[] {
  try {
    const current = loadStoredCustomEvents();
    const updated = [event, ...current.filter((e) => e.id !== event.id)];
    setScopedItem(CUSTOM_EVENTS_KEY, JSON.stringify(updated));
    scheduleCloudSync();
    return updated;
  } catch (err) {
    console.warn('Failed to save custom event:', err);
    return [];
  }
}

export function deleteStoredCustomEvent(eventId: string): EventItem[] {
  try {
    const current = loadStoredCustomEvents();
    const updated = current.filter((e) => e.id !== eventId);
    setScopedItem(CUSTOM_EVENTS_KEY, JSON.stringify(updated));
    scheduleCloudSync();
    return updated;
  } catch (err) {
    console.warn('Failed to delete custom event:', err);
    return [];
  }
}


export function loadStoredChatMessages(eventId: string): any[] {
  try {
    const raw = localStorage.getItem(`${EVENT_CHATS_PREFIX}${eventId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredChatMessage(eventId: string, message: any): any[] {
  try {
    const current = loadStoredChatMessages(eventId);
    const updated = [...current, message];
    localStorage.setItem(`${EVENT_CHATS_PREFIX}${eventId}`, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed to save chat message:', err);
    return [];
  }
}

export function loadReferralStats(eventId: string): { clicks: number; joins: number } {
  try {
    const raw = getScopedItem(`${REFERRALS_PREFIX}${eventId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { clicks: 0, joins: 0 };
}

export function recordReferralShare(eventId: string): { clicks: number; joins: number } {
  const current = loadReferralStats(eventId);
  const updated = { clicks: current.clicks + 1, joins: current.joins };
  try {
    setScopedItem(`${REFERRALS_PREFIX}${eventId}`, JSON.stringify(updated));
    scheduleCloudSync();
  } catch {}
  return updated;
}

export function recordReferralJoin(eventId: string): { clicks: number; joins: number } {
  const current = loadReferralStats(eventId);
  // Защита от дублирования подсчета при повторном открытии/обновлении
  const joinedKey = `joined_ref_${eventId}`;
  if (typeof window !== 'undefined' && localStorage.getItem(joinedKey)) {
    return current;
  }
  const updated = { clicks: current.clicks, joins: current.joins + 1 };
  try {
    setScopedItem(`${REFERRALS_PREFIX}${eventId}`, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      localStorage.setItem(joinedKey, '1');
    }
    scheduleCloudSync();
  } catch {}
  return updated;
}

function loadAllReferralStats(): Record<string, { clicks: number; joins: number }> {
  const result: Record<string, { clicks: number; joins: number }> = {};
  if (typeof window === 'undefined' || !window.localStorage) return result;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(REFERRALS_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parts = key.split(REFERRALS_PREFIX);
          const eventId = parts[parts.length - 1];
          if (eventId) result[eventId] = JSON.parse(raw);
        }
      }
    }
  } catch {}
  return result;
}

export function getLastSyncedTime(): number | null {
  const raw = getScopedItem(LAST_SYNC_KEY);
  return raw ? parseInt(raw, 10) : null;
}

// ============================================================================
// ДВУСТОРОННЯЯ ОБЛАЧНАЯ СИНХРОНИЗАЦИЯ АККАУНТА MAX МЕЖДУ ВСЕМИ ПЛАТФОРМАМИ
// ============================================================================

let syncDebounceTimer: any = null;

export function scheduleCloudSync(delayMs = 600) {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }
  syncDebounceTimer = setTimeout(() => {
    syncCurrentUserDataToCloud().catch(() => {});
  }, delayMs);
}

/**
 * Отправка текущих сохранённых данных аккаунта на сервер
 */
export async function syncCurrentUserDataToCloud(): Promise<boolean> {
  const userId = getMaxUserId();
  const initData = getMaxInitData();
  const platform = getMaxPlatform();

  // Собираем полное состояние аккаунта
  const profile = loadStoredProfile();
  const settings = loadAppSettings();
  const eventStatuses = loadEventStatuses();
  const customEvents = loadStoredCustomEvents();
  const referralStats = loadAllReferralStats();

  const payload = {
    profile,
    settings,
    eventStatuses,
    customEvents,
    referralStats,
  };

  notifySyncListeners('syncing');

  try {
    const res = await fetch('/api/user/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(initData ? { 'X-MAX-Init-Data': initData } : {}),
        ...(platform ? { 'X-MAX-Platform': platform } : {}),
        ...(userId ? { 'X-MAX-User-Id': userId } : {}),
      },
      body: JSON.stringify({
        initData,
        userId,
        platform,
        data: payload,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setScopedItem(LAST_SYNC_KEY, String(Date.now()), true);
      notifySyncListeners('synced', data.data);
      return true;
    }
  } catch (err) {
    console.warn('Sync to MAX cloud failed, will retry next time:', err);
    notifySyncListeners('offline');
  }

  return false;
}

/**
 * Загрузка и применение данных аккаунта пользователя MAX с сервера
 * Позволяет на новой платформе (iOS, Android, Desktop, Web) сразу получить данные пользователя
 */
export async function fetchAndApplyUserCloudData(): Promise<{
  success: boolean;
  data?: any;
  isNew?: boolean;
}> {
  const userId = getMaxUserId();
  const initData = getMaxInitData();

  notifySyncListeners('syncing');

  try {
    const params = new URLSearchParams();
    if (initData) params.set('initData', initData);
    if (userId) params.set('userId', userId);

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (initData) headers['X-MAX-Init-Data'] = initData;
    if (userId) headers['X-MAX-User-Id'] = userId;

    const res = await fetch(`/api/user/data?${params.toString()}`, { headers });
    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        if (json.data && json.data.profile) {
          // Получены актуальные данные аккаунта с сервера
          applyCloudDataToLocal(json.data);
          setScopedItem(LAST_SYNC_KEY, String(Date.now()), true);
          notifySyncListeners('synced', json.data);
          return { success: true, data: json.data, isNew: false };
        } else if (json.isNew || !json.data) {
          // Первый запуск для этого аккаунта MAX: если есть локальный профиль, регистрируем его в облаке
          const localProfile = loadStoredProfile();
          if (localProfile && localProfile.onboardingCompleted) {
            await syncCurrentUserDataToCloud();
          } else {
            notifySyncListeners('synced');
          }
          return { success: true, isNew: true };
        }
      }
    }
  } catch (err) {
    console.warn('Failed to fetch cloud user data:', err);
    notifySyncListeners('offline');
  }

  // Fallback: пробуем восстановить из Bridge Storage, если сервер недоступен
  try {
    if (userId) {
      const bridgeProfile = await loadFromBridgeStorage(`max_acc_${userId}_${PROFILE_KEY}`);
      if (bridgeProfile) {
        const parsed = JSON.parse(bridgeProfile);
        if (parsed) {
          setScopedItem(PROFILE_KEY, bridgeProfile, true);
          notifySyncListeners('synced', { profile: parsed });
          return { success: true, data: { profile: parsed } };
        }
      }
    }
  } catch {}

  return { success: false };
}

function applyCloudDataToLocal(cloudData: any): void {
  if (!cloudData) return;

  // 1. Профиль
  if (cloudData.profile) {
    setScopedItem(PROFILE_KEY, JSON.stringify(cloudData.profile), true);
  }

  // 2. Настройки
  if (cloudData.settings) {
    setScopedItem(APP_SETTINGS_KEY, JSON.stringify(cloudData.settings), true);
  }

  // 5. Статусы мероприятий (мерджим с локальными, чтобы ничего не затереть)
  if (cloudData.eventStatuses) {
    const local = loadEventStatuses();
    const merged = { ...local, ...cloudData.eventStatuses };
    setScopedItem(EVENT_STATUSES_KEY, JSON.stringify(merged), true);
  }

  // 6. Кастомные события
  if (Array.isArray(cloudData.customEvents) && cloudData.customEvents.length > 0) {
    const local = loadStoredCustomEvents();
    const map = new Map<string, EventItem>();
    local.forEach((e) => map.set(e.id, e));
    cloudData.customEvents.forEach((e: EventItem) => map.set(e.id, e));
    setScopedItem(CUSTOM_EVENTS_KEY, JSON.stringify(Array.from(map.values())), true);
  }

  // 7. Рефералы
  if (cloudData.referralStats && typeof cloudData.referralStats === 'object') {
    for (const [eventId, stats] of Object.entries(cloudData.referralStats)) {
      setScopedItem(`${REFERRALS_PREFIX}${eventId}`, JSON.stringify(stats), true);
    }
  }
}
