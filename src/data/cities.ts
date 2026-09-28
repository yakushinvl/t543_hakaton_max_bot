export interface City {
  slug: string;
  name: string;
  lon: number;
  lat: number;
}

export const CITIES: City[] = [
  { slug: "msk", name: "Москва", lon: 37.6176, lat: 55.7558 },
  { slug: "spb", name: "Санкт-Петербург", lon: 30.3351, lat: 59.9343 },
  { slug: "kzn", name: "Казань", lon: 49.1221, lat: 55.7887 },
  { slug: "nsk", name: "Новосибирск", lon: 82.9346, lat: 55.0084 },
  { slug: "ekb", name: "Екатеринбург", lon: 60.6122, lat: 56.8389 },
  { slug: "nnv", name: "Нижний Новгород", lon: 44.0059, lat: 56.2965 },
  { slug: "sam", name: "Самара", lon: 50.1606, lat: 53.2001 },
  { slug: "ufa", name: "Уфа", lon: 55.9721, lat: 54.7388 },
  { slug: "rnd", name: "Ростов-на-Дону", lon: 39.7015, lat: 47.2357 },
  { slug: "krd", name: "Краснодар", lon: 38.9769, lat: 45.0355 },
  { slug: "sochi", name: "Сочи", lon: 39.7257, lat: 43.6028 },
  { slug: "perm", name: "Пермь", lon: 56.2502, lat: 58.0105 },
  { slug: "vlg", name: "Волгоград", lon: 44.5133, lat: 48.708 },
  { slug: "kld", name: "Калининград", lon: 20.4522, lat: 54.7104 },
];

export const DEFAULT_CITY = CITIES[2]; // Казань

/**
 * Радиусы агломераций и границ городов (в км)
 * Мероприятия в пределах этого радиуса и пригородной зоны относятся к этому городу
 */
export const CITY_BOUNDS_RADIUS_KM: Record<string, number> = {
  msk: 55, // Москва и ближнее Подмосковье
  spb: 50, // Санкт-Петербург и пригороды (Петергоф, Пушкин, Сестрорецк)
  sochi: 60, // Большой Сочи от Лазаревского до Красной Поляны и Адлера
  vlg: 50, // Волгоград (протяжённый вдоль Волги)
  kzn: 40, // Казань и пригородная зона
  nsk: 45, // Новосибирск и Академгородок/Бердск
  ekb: 42, // Екатеринбург и города-спутники (Пышма, Берёзовский)
  nnv: 40, // Нижний Новгород и Бор/Кстово
  sam: 42, // Самара и Новокуйбышевск/Красный Яр
  ufa: 40, // Уфа и Уфимский район
  rnd: 40, // Ростов-на-Дону и Аксай/Батайск
  krd: 40, // Краснодар и Адыгея/Яблоновский
  perm: 42, // Пермь и Закамск/Сылва
  kld: 38, // Калининград и курортное побережье
};

/**
 * Точный расчет расстояния между двумя гео-координатами по формуле гаверсинусов (в км)
 */
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Радиус Земли в км
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Получить радиус границы города (с учетом пригородной агломерации)
 */
export function getCityRadiusKm(citySlug: string): number {
  return CITY_BOUNDS_RADIUS_KM[citySlug] || 40;
}

/**
 * Проверка: находится ли точка (мероприятие) в пределах города или вблизи него
 * Мероприятия вне рамок города, но в радиусе агломерации/пригорода (до 65 км)
 * автоматически относятся к этому городу
 */
export function isEventInCityZone(
  city: City,
  eventLon: number,
  eventLat: number,
  bufferKm = 15
): boolean {
  const baseRadius = getCityRadiusKm(city.slug);
  const maxAllowedDist = baseRadius + bufferKm;
  const dist = getDistanceKm(eventLat, eventLon, city.lat, city.lon);
  return dist <= maxAllowedDist;
}

/**
 * Найти город для заданных координат (пользователя или мероприятия):
 * Если мероприятие вне рамок города, но рядом с ним — относится к ближайшему городу
 */
export function findCityForCoordinates(lon: number, lat: number, maxDistanceKm = 70): City | null {
  let closest: City | null = null;
  let minDistance = Infinity;

  for (const city of CITIES) {
    const dist = getDistanceKm(lat, lon, city.lat, city.lon);
    const maxRadius = getCityRadiusKm(city.slug) + 20; // Учитываем близлежащие пригороды
    if (dist <= maxRadius && dist <= maxDistanceKm && dist < minDistance) {
      minDistance = dist;
      closest = city;
    }
  }

  return closest;
}

export function nearestCity(lon: number, lat: number): City {
  let best = CITIES[0];
  let bestDist = Infinity;
  for (const city of CITIES) {
    const dist = getDistanceKm(lat, lon, city.lat, city.lon);
    if (dist < bestDist) {
      bestDist = dist;
      best = city;
    }
  }
  return best;
}

/**
 * Вычисляет минимальный порог зума (отдаления), при котором метки мероприятий города
 * ещё остаются видимыми, с учетом размера (радиуса) города и дополнительного запаса расстояния (+ extraBufferKm).
 * Для масштабных агломераций (Москва, Сочи, СПб) порог отдаления значительно ниже (~7.5 - 7.8),
 * что позволяет отдалять карту и обозревать весь город и пригород без раннего скрытия меток.
 */
export function getCityZoomThreshold(citySlug: string, extraBufferKm = 25): number {
  const radius = getCityRadiusKm(citySlug);
  const totalKm = radius + extraBufferKm;
  const zoom = 9.8 - (totalKm - 40) * 0.05;
  return Math.max(7.5, Math.min(8.8, Math.round(zoom * 10) / 10));
}

