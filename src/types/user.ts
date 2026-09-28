export type AgeGroup =
  | '6-11'
  | '12-15'
  | '16-21'
  | '22-29'
  | '30-44'
  | '45-59'
  | '60+';

export type Gender =
  | 'boy'
  | 'girl'
  | 'young_man'
  | 'young_woman'
  | 'man'
  | 'woman';

export interface RegistrationData {
  fullName: string;
  birthDate: string;
  phone: string;
  email: string;
}

export type ThemeMode = 'auto' | 'light' | 'dark';
export type FeedViewMode = 'compact' | 'full';

export type ProfilePersonaType = 'personal' | 'family' | 'friends' | 'date' | 'custom';

export interface ProfilePreset {
  type: ProfilePersonaType;
  name: string;
  emoji: string;
  description: string;
  defaultInterests: string[];
  badge: string;
}

export const PROFILE_PRESETS: ProfilePreset[] = [
  {
    type: 'personal',
    name: 'Личный',
    emoji: '👤',
    description: 'События по вашим персональным вкусам и ритму',
    defaultInterests: ['exhibition', 'concert', 'cinema', 'walk', 'standup'],
    badge: 'Я',
  },
  {
    type: 'family',
    name: 'Семья',
    emoji: '👨‍👩‍👧',
    description: 'Совместный отдых с детьми, семейные парки и спектакли',
    defaultInterests: ['kids', 'theater', 'outdoor', 'festival', 'science', 'quest'],
    badge: 'Семья',
  },
  {
    type: 'friends',
    name: 'Компания',
    emoji: '🎉',
    description: 'Движ, квизы, стендапы, настолки, бары и фестивали',
    defaultInterests: ['party', 'standup', 'quest', 'boardgames', 'nightlife', 'sport', 'food'],
    badge: 'Друзья',
  },
  {
    type: 'date',
    name: 'Свидание',
    emoji: '🍷',
    description: 'Уютные места, живая музыка, выставки и романтика',
    defaultInterests: ['wine', 'music_jazz', 'theater', 'exhibition', 'cinema', 'walk'],
    badge: 'Для двоих',
  },
];

export interface UserProfile {
  id?: string;
  name: string;
  avatarUrl?: string;
  avatarEmoji?: string;
  profileType?: ProfilePersonaType;
  statusText?: string;
  bio?: string;
  ageGroup: AgeGroup;
  gender: Gender;
  interests: string[];
  citySlug: string;
  registrationData: RegistrationData;
  onboardingCompleted: boolean;
  themeMode?: ThemeMode;
  feedViewMode?: FeedViewMode;
}

export function getGenderOptions(ageGroup: AgeGroup): { value: Gender; label: string; icon: string }[] {
  if (ageGroup === '6-11' || ageGroup === '12-15') {
    return [
      { value: 'boy', label: 'Мальчик', icon: '👦' },
      { value: 'girl', label: 'Девочка', icon: '👧' },
    ];
  }
  if (ageGroup === '16-21' || ageGroup === '22-29') {
    return [
      { value: 'young_man', label: 'Парень', icon: '🧑' },
      { value: 'young_woman', label: 'Девушка', icon: '👩' },
    ];
  }
  return [
    { value: 'man', label: 'Мужчина', icon: '👨' },
    { value: 'woman', label: 'Женщина', icon: '👩' },
  ];
}

