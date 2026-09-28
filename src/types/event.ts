export interface EventItem {
  id: string;
  title: string;
  place: string;
  address?: string;
  description: string;
  image: string;
  images?: string[];
  date: string; // ISO date string
  endDate?: string;
  category: string;
  ageRestricted: boolean;
  minAge?: number;
  citySlug: string;
  lon: number;
  lat: number;
  price?: string;
  isCustom?: boolean;
  isPrivate?: boolean;
  authorId?: string | number;
  authorName?: string;
  requiresRegistration?: boolean;
  registeredCount?: number;
  tags?: string[];
  externalUrl?: string;
  source?: string;
  sourceName?: string;
}

export type EventTabType = 'all' | 'saved' | 'want_to_attend' | 'history';

export interface UserEventStatus {
  saved: boolean;
  wantToAttend: boolean;
  attended: boolean;
  registered: boolean;
}
