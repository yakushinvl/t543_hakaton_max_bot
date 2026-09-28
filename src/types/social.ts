export interface ChatMessage {
  id: string;
  eventId: string;
  userId: string | number;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: string;
}

export interface CreateEventPayload {
  title: string;
  description: string;
  category: string;
  date: string;
  time?: string;
  place: string;
  lon: number;
  lat: number;
  citySlug: string;
  isPrivate: boolean;
  requiresRegistration: boolean;
  image?: string;
  images?: string[];
  price?: string;
}

