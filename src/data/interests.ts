/**
 * Реэкспорт и хелперы интересов (данные перенесены в src/config/interests.config.ts)
 */
import {
  INTERESTS_CONFIG,
  getInterestConfig,
  getInterestColor,
  getInterestEmoji,
  getInterestLabel,
  getAllInterests,
  type InterestConfigItem,
} from '../config/interests.config';

export type InterestItem = InterestConfigItem;
export const ALL_INTERESTS = INTERESTS_CONFIG;
export { getInterestConfig, getInterestColor, getInterestEmoji, getInterestLabel, getAllInterests };

export function getInterestById(id: string): InterestItem | undefined {
  return getInterestConfig(id);
}

// Хелпер сопоставления категорий KudaGo к нашим интересам
export function mapKudagoCategoryToInterest(categories: string[]): string {
  for (const cat of categories) {
    for (const interest of ALL_INTERESTS) {
      if (interest.kudagoCategories && interest.kudagoCategories.includes(cat)) {
        return interest.id;
      }
    }
  }
  return 'exhibition'; // дефолтная категория
}
