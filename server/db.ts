import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface DbSchema {
  customEvents: any[];
  chats: Record<string, any[]>;
  registrations: Record<string, any[]>;
  profiles: Record<string, any>;
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
}

export const db = new JsonDb();
