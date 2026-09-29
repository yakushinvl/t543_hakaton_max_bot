export type AgeGroup =
  | '6-8'
  | '9-11'
  | '12-14'
  | '15-17'
  | '18-24'
  | '25-34'
  | '35-49'
  | '50-59'
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

export interface UserProfile {
  id?: string;
  name: string;
  avatarUrl?: string;
  avatarEmoji?: string;
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
  if (ageGroup === '6-8' || ageGroup === '9-11' || ageGroup === '12-14' || ageGroup === '15-17') {
    return [
      { value: 'boy', label: 'Мальчик', icon: '👦' },
      { value: 'girl', label: 'Девочка', icon: '👧' },
    ];
  }
  if (ageGroup === '18-24' || ageGroup === '25-34') {
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

