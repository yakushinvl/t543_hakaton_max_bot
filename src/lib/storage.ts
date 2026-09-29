import type { UserProfile, ProfilePersonaType } from '../types/user';
import { PROFILE_PRESETS } from '../types/user';
import type { EventItem, UserEventStatus } from '../types/event';

const PROFILE_KEY = 'max_event_app_profile_v2';
const PROFILES_LIST_KEY = 'max_event_app_profiles_v3';
const ACTIVE_PROFILE_ID_KEY = 'max_event_app_active_id_v3';
const APP_SETTINGS_KEY = 'max_event_app_settings_v1';
const EVENT_STATUSES_KEY = 'max_event_app_statuses_v2';
const CACHED_EVENTS_PREFIX = 'max_cached_events_v2_';

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
    const raw = localStorage.getItem(APP_SETTINGS_KEY);
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
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save app settings:', err);
    return DEFAULT_APP_SETTINGS;
  }
}

export function loadStoredProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_LIST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  // Fallback к старому одиночному профилю
  const single = loadStoredProfileSingle();
  if (single) {
    const baseProfile: UserProfile = {
      ...single,
      id: single.id ? String(single.id) : 'profile_personal',
      profileType: single.profileType || 'personal',
    };
    saveStoredProfilesList([baseProfile]);
    return [baseProfile];
  }
  return [];
}

export function saveStoredProfilesList(profiles: UserProfile[]): void {
  try {
    localStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(profiles));
  } catch (err) {
    console.error('Failed to save profiles list:', err);
  }
}

function loadStoredProfileSingle(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadStoredProfile(): UserProfile | null {
  const activeId = localStorage.getItem(ACTIVE_PROFILE_ID_KEY);
  const profiles = loadStoredProfiles();
  if (profiles.length > 0) {
    if (activeId) {
      const found = profiles.find((p) => p.id === activeId);
      if (found) return found;
    }
    return profiles[0];
  }
  return loadStoredProfileSingle();
}

export function saveStoredProfile(profile: UserProfile): void {
  try {
    // Гарантируем наличие id
    const profileWithId: UserProfile = {
      ...profile,
      id: profile.id ? String(profile.id) : 'profile_personal',
      profileType: profile.profileType || 'personal',
    };

    localStorage.setItem(PROFILE_KEY, JSON.stringify(profileWithId));
    localStorage.setItem(ACTIVE_PROFILE_ID_KEY, profileWithId.id!);

    const profiles = loadStoredProfiles();
    const existingIndex = profiles.findIndex((p) => p.id === profileWithId.id);
    let updatedList: UserProfile[];
    if (existingIndex >= 0) {
      updatedList = [...profiles];
      updatedList[existingIndex] = profileWithId;
    } else {
      updatedList = [...profiles, profileWithId];
    }
    saveStoredProfilesList(updatedList);
  } catch (err) {
    console.error('Failed to save profile:', err);
  }
}

/**
 * Создать или переключиться на профиль определенной персоны (Личный, Семья, Компания, Свидание)
 */
export function switchOrCreatePersonaProfile(
  type: ProfilePersonaType,
  baseProfile: UserProfile
): { profile: UserProfile; profiles: UserProfile[] } {
  const profiles = loadStoredProfiles();
  const existing = profiles.find((p) => p.profileType === type);

  if (existing) {
    saveStoredProfile(existing);
    return { profile: existing, profiles };
  }

  const preset = PROFILE_PRESETS.find((p) => p.type === type) || PROFILE_PRESETS[0];
  const newProfileId = `profile_${type}_${Date.now()}`;
  
  // Создаем профиль на базе существующего, но с фокусом на выбранный сценарий
  const newProfile: UserProfile = {
    ...baseProfile,
    id: newProfileId,
    name: type === 'personal' ? baseProfile.name : `${baseProfile.name} (${preset.name})`,
    profileType: type,
    avatarEmoji: preset.emoji,
    statusText: preset.description,
    interests: preset.defaultInterests.length > 0 ? preset.defaultInterests : baseProfile.interests,
  };

  const updatedProfiles = [...profiles, newProfile];
  saveStoredProfilesList(updatedProfiles);
  saveStoredProfile(newProfile);

  return { profile: newProfile, profiles: updatedProfiles };
}


export function loadEventStatuses(): Record<string, Partial<UserEventStatus>> {
  try {
    const raw = localStorage.getItem(EVENT_STATUSES_KEY);
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
    statuses[eventId] = { saved: false, wantToAttend: false, attended: false, registered: false };
  }
  statuses[eventId][key] = value;
  try {
    localStorage.setItem(EVENT_STATUSES_KEY, JSON.stringify(statuses));
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

const CUSTOM_EVENTS_KEY = 'max_custom_events_v2';

export function loadStoredCustomEvents(): EventItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredCustomEvent(event: EventItem): EventItem[] {
  try {
    const current = loadStoredCustomEvents();
    const updated = [event, ...current.filter((e) => e.id !== event.id)];
    localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed to save custom event:', err);
    return [];
  }
}

const EVENT_CHATS_PREFIX = 'max_event_chat_v2_';

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

const REFERRALS_PREFIX = 'max_referrals_stats_v2_';

export function loadReferralStats(eventId: string): { clicks: number; joins: number } {
  try {
    const raw = localStorage.getItem(`${REFERRALS_PREFIX}${eventId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { clicks: 0, joins: 0 };
}

export function recordReferralShare(eventId: string): { clicks: number; joins: number } {
  const current = loadReferralStats(eventId);
  const updated = { clicks: current.clicks + 1, joins: current.joins };
  try {
    localStorage.setItem(`${REFERRALS_PREFIX}${eventId}`, JSON.stringify(updated));
  } catch {}
  return updated;
}

