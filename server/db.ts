import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface UserAccountData {
  userId: string;
  profile?: any;
  profiles?: any[];
  activeProfileId?: string | null;
  settings?: any;
  eventStatuses?: Record<string, any>;
  customEvents?: any[];
  referralStats?: Record<string, any>;
  updatedAt: number;
  lastPlatform?: string;
}

export interface DbSchema {
  customEvents: any[];
  chats: Record<string, any[]>;
  registrations: Record<string, any[]>;
  profiles: Record<string, UserAccountData>;
}


class JsonDb {
  private data: DbSchema = {
    customEvents: [],
    chats: {},
    registrations: {},
    profiles: {},
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.save();
      }
    } catch (e) {
      console.error('Failed to init DB, using empty store:', e);
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save DB file:', e);
    }
  }

  getCustomEvents(citySlug?: string): any[] {
    if (!citySlug) return this.data.customEvents;
    return this.data.customEvents.filter((e) => !e.citySlug || e.citySlug === citySlug);
  }

  addCustomEvent(event: any): any {
    this.data.customEvents.unshift(event);
    this.save();
    return event;
  }

  getChatMessages(eventId: string): any[] {
    return this.data.chats[eventId] || [];
  }

  addChatMessage(eventId: string, message: any): any {
    if (!this.data.chats[eventId]) {
      this.data.chats[eventId] = [];
    }
    this.data.chats[eventId].push(message);
    this.save();
    return message;
  }

  addRegistration(eventId: string, regData: any): number {
    if (!this.data.registrations[eventId]) {
      this.data.registrations[eventId] = [];
    }
    this.data.registrations[eventId].push({
      ...regData,
      createdAt: new Date().toISOString(),
    });
    this.save();
    return this.data.registrations[eventId].length;
  }

  getRegistrationsCount(eventId: string): number {
    return (this.data.registrations[eventId] || []).length;
  }

  getUserData(userId: string): UserAccountData | null {
    if (!this.data.profiles) {
      this.data.profiles = {};
    }
    return this.data.profiles[userId] || null;
  }

  saveUserData(
    userId: string,
    incoming: Partial<UserAccountData>,
    platform?: string
  ): UserAccountData {
    if (!this.data.profiles) {
      this.data.profiles = {};
    }

    const existing = this.data.profiles[userId] || {
      userId,
      profile: null,
      profiles: [],
      activeProfileId: null,
      settings: null,
      eventStatuses: {},
      customEvents: [],
      referralStats: {},
      updatedAt: 0,
      lastPlatform: platform,
    };

    // Объединяем данные профилей
    let mergedProfile = existing.profile;
    if (incoming.profile) {
      mergedProfile = existing.profile ? { ...existing.profile, ...incoming.profile } : incoming.profile;
    }

    // Объединяем список персон (профилей)
    let mergedProfiles = existing.profiles || [];
    if (Array.isArray(incoming.profiles) && incoming.profiles.length > 0) {
      const map = new Map<string, any>();
      (existing.profiles || []).forEach((p: any) => {
        if (p.id) map.set(p.id, p);
      });
      incoming.profiles.forEach((p: any) => {
        if (p.id) {
          const prev = map.get(p.id) || {};
          map.set(p.id, { ...prev, ...p });
        }
      });
      mergedProfiles = Array.from(map.values());
    }

    // Объединяем статусы мероприятий (закладки, пойду, посетил)
    const mergedStatuses = {
      ...(existing.eventStatuses || {}),
      ...(incoming.eventStatuses || {}),
    };

    // Глубокий мердж каждого мероприятия
    if (existing.eventStatuses && incoming.eventStatuses) {
      for (const eventId of Object.keys(incoming.eventStatuses)) {
        if (existing.eventStatuses[eventId]) {
          mergedStatuses[eventId] = {
            ...existing.eventStatuses[eventId],
            ...incoming.eventStatuses[eventId],
          };
        }
      }
    }

    // Кастомные мероприятия пользователя
    let mergedCustomEvents = existing.customEvents || [];
    if (Array.isArray(incoming.customEvents)) {
      const cMap = new Map<string, any>();
      (existing.customEvents || []).forEach((e: any) => cMap.set(e.id, e));
      incoming.customEvents.forEach((e: any) => {
        cMap.set(e.id, e);
        // Также добавляем в глобальные кастомные события, если ещё нет
        if (!this.data.customEvents.some((ce) => ce.id === e.id)) {
          this.data.customEvents.unshift(e);
        }
      });
      mergedCustomEvents = Array.from(cMap.values());
    }

    const mergedSettings = incoming.settings
      ? { ...(existing.settings || {}), ...incoming.settings }
      : existing.settings;

    const mergedReferrals = {
      ...(existing.referralStats || {}),
      ...(incoming.referralStats || {}),
    };

    const updatedRecord: UserAccountData = {
      userId,
      profile: mergedProfile,
      profiles: mergedProfiles,
      activeProfileId: incoming.activeProfileId || existing.activeProfileId || mergedProfile?.id || null,
      settings: mergedSettings,
      eventStatuses: mergedStatuses,
      customEvents: mergedCustomEvents,
      referralStats: mergedReferrals,
      updatedAt: Date.now(),
      lastPlatform: platform || incoming.lastPlatform || existing.lastPlatform,
    };

    this.data.profiles[userId] = updatedRecord;
    this.save();
    return updatedRecord;
  }
}


export const db = new JsonDb();
