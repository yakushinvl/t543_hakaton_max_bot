import { CITIES, DEFAULT_CITY, nearestCity, type City } from '../data/cities';
import { requestLocationViaMaxBridge } from './maxBridge';

export interface UserLocationResult {
  lat: number;
  lon: number;
  city: City;
  isExact: boolean;
  accuracyMeters?: number;
  source: 'max_bridge' | 'gps' | 'cache' | 'default';
}

const STORAGE_KEY_LOCATION = 'fluger_user_location';

/**
 * Получить ранее сохранённую геопозицию из localStorage (мгновенно, 0 мс)
 */
export function getCachedLocation(): UserLocationResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCATION);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const city = CITIES.find((c) => c.slug === parsed.citySlug) || DEFAULT_CITY;
    return {
      lat: parsed.lat,
      lon: parsed.lon,
      city,
      isExact: Boolean(parsed.isExact),
      accuracyMeters: parsed.accuracyMeters,
      source: 'cache',
    };
  } catch {
    return null;
  }
}

/**
 * Сохранить найденную геопозицию в localStorage
 */
function saveLocation(lat: number, lon: number, city: City, isExact: boolean, accuracy?: number) {
  try {
    localStorage.setItem(
      STORAGE_KEY_LOCATION,
      JSON.stringify({
        lat,
        lon,
        citySlug: city.slug,
        isExact,
        accuracyMeters: accuracy,
        updatedAt: Date.now(),
      })
    );
  } catch {
    // Ignore storage quota
  }
}

/**
 * Автоматическое определение геолокации пользователя:
 * 1. Первичный запрос к нативному MAX Bridge (LocationManager / requestLocation / events)
 * 2. Fallback к браузерному W3C Geolocation API (при открытии в веб-браузере)
 * 3. При успехе: находим ближайший город из базы CITIES и кэшируем результат
 * 4. При ошибке/запрете: берем кэшированную локацию или дефолтный город (Казань)
 */
export async function detectUserLocation(timeoutMs = 7000): Promise<UserLocationResult> {
  const cached = getCachedLocation();

  // 1. В первую очередь запрашиваем геолокацию через MAX Bridge
  try {
    const bridgeLoc = await requestLocationViaMaxBridge(timeoutMs);
    if (bridgeLoc) {
      const { lat, lon, accuracy } = bridgeLoc;
      const city = nearestCity(lon, lat);
      saveLocation(lat, lon, city, true, accuracy);
      return {
        lat,
        lon,
        city,
        isExact: true,
        accuracyMeters: accuracy,
        source: 'max_bridge',
      };
    }
  } catch (err) {
    console.warn('MAX Bridge geolocation error, falling back to browser GPS:', err);
  }

  // 2. Fallback: Браузерный W3C Geolocation API (если открыто в браузере или bridge не вернул координаты)
  if (typeof window !== 'undefined' && navigator.geolocation) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('Geolocation timeout'));
        }, timeoutMs);

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timer);
            resolve(pos);
          },
          (err) => {
            clearTimeout(timer);
            reject(err);
          },
          {
            enableHighAccuracy: true,
            timeout: timeoutMs,
            maximumAge: 120000, // 2 минуты кэша браузера
          }
        );
      });

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const city = nearestCity(lon, lat);
      const accuracy = position.coords.accuracy;

      saveLocation(lat, lon, city, true, accuracy);

      return {
        lat,
        lon,
        city,
        isExact: true,
        accuracyMeters: accuracy,
        source: 'gps',
      };
    } catch {
      // Игнорируем ошибку и переходим к кэшу/дефолту
    }
  }

  // 3. Fallback: кэш из localStorage или город по умолчанию
  if (cached) {
    return cached;
  }

  return {
    lat: DEFAULT_CITY.lat,
    lon: DEFAULT_CITY.lon,
    city: DEFAULT_CITY,
    isExact: false,
    source: 'default',
  };
}

/**
 * Вычисление расстояния в км между двумя координатами (Haversine formula)
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
  return Math.round(R * c * 10) / 10;
}
