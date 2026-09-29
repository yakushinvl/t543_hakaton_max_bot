import type { MaxWebApp, MaxUser } from '../types/max';
import { loadAppSettings } from './storage';

// Подавление неперехваченных ошибок от неподдерживаемых событий в max-web-app.js
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (
      reason &&
      (reason.error === 'UnsupportedEvent' ||
        reason?.type?.includes?.('HapticFeedback') ||
        (typeof reason.message === 'string' && reason.message.includes('UnsupportedEvent')))
    ) {
      event.preventDefault();
    }
  });
}

export function getWebApp(): MaxWebApp | null {
  if (typeof window === 'undefined') return null;
  return window.WebApp || window.max?.webApp || null;
}

export function isMaxPlatform(): boolean {
  return getWebApp() !== null;
}

export function initMaxBridge(): void {
  const webApp = getWebApp();
  if (!webApp) return;

  try {
    webApp.ready();
    webApp.expand();
  } catch (err) {
    console.warn('MAX WebApp init error:', err);
  }
}

export function getMaxUser(): MaxUser | null {
  const webApp = getWebApp();
  return webApp?.initDataUnsafe?.user || null;
}

export function getMaxInitData(): string {
  const webApp = getWebApp();
  return webApp?.initData || '';
}

export function getMaxColorScheme(): 'light' | 'dark' | null {
  const webApp = getWebApp();
  return webApp?.colorScheme || null;
}

export function applyThemeAndPalette(themeMode: 'auto' | 'light' | 'dark' = 'auto'): void {
  const webApp = getWebApp();
  const doc = document.documentElement;

  // 1. Определение эффективной темы
  let effectiveTheme: 'light' | 'dark' = 'light';
  if (themeMode === 'auto') {
    if (webApp?.colorScheme) {
      effectiveTheme = webApp.colorScheme;
    } else if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      effectiveTheme = 'dark';
    }
  } else {
    effectiveTheme = themeMode;
  }

  doc.setAttribute('data-theme', effectiveTheme);

  // 2. Подстройка под системную палитру MAX (themeParams)
  if (webApp?.themeParams && typeof webApp.themeParams === 'object') {
    const p = webApp.themeParams;
    if (p.bg_color) {
      doc.style.setProperty('--max-bg', p.bg_color);
    }
    if (p.secondary_bg_color) {
      doc.style.setProperty('--max-card-bg', p.secondary_bg_color);
    }
    if (p.text_color) {
      doc.style.setProperty('--max-text', p.text_color);
    }
    if (p.hint_color) {
      doc.style.setProperty('--max-text-secondary', p.hint_color);
    }
    if (p.button_color) {
      doc.style.setProperty('--max-primary', p.button_color);
      doc.style.setProperty('--max-primary-light', `${p.button_color}22`);
    }
    if (p.link_color) {
      doc.style.setProperty('--max-accent', p.link_color);
    }
  } else {
    // Сброс инлайновых переопределений палитры при ручном режиме без Bridge
    doc.style.removeProperty('--max-bg');
    doc.style.removeProperty('--max-card-bg');
    doc.style.removeProperty('--max-text');
    doc.style.removeProperty('--max-text-secondary');
    doc.style.removeProperty('--max-primary');
    doc.style.removeProperty('--max-primary-light');
    doc.style.removeProperty('--max-accent');
  }

  // Обновляем цвет шапки в MAX при поддержке
  try {
    if (webApp?.setHeaderColor) {
      const headerColor = effectiveTheme === 'dark' ? '#141414' : '#ffffff';
      webApp.setHeaderColor(webApp.themeParams?.bg_color || headerColor);
    }
  } catch (e) {
    // Ignore
  }
}

export function subscribeToThemeChange(onThemeChange: () => void): () => void {
  const webApp = getWebApp();
  if (!webApp?.onEvent) {
    // Fallback: слушаем системный prefers-color-scheme
    const mql = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const handler = () => onThemeChange();
    mql?.addEventListener?.('change', handler);
    return () => mql?.removeEventListener?.('change', handler);
  }

  try {
    webApp.onEvent('themeChanged', onThemeChange);
    return () => {
      try {
        webApp.offEvent('themeChanged', onThemeChange);
      } catch (e) {}
    };
  } catch (e) {
    return () => {};
  }
}

export function isHapticSupported(): boolean {
  const webApp = getWebApp();
  if (!webApp) {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }
  const platform = (webApp.platform || '').toLowerCase();
  // По официальной документации MAX:
  // "Методы объекта HapticFeedback не поддерживаются десктоп- и веб-клиентом"
  if (['desktop', 'web', 'macos', 'tdesktop', 'weba', 'webk'].includes(platform)) {
    return false;
  }
  return Boolean(webApp.HapticFeedback && (platform === 'ios' || platform === 'android' || !platform));
}

export function triggerHaptic(
  type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error' = 'light'
): void {
  // 1. Проверяем настройки приложения (отключен ли тактильный отклик пользователем)
  try {
    const settings = loadAppSettings();
    if (!settings.hapticEnabled) {
      return;
    }
  } catch {
    // В случае сбоя чтения настроек не прерываем выполнение
  }

  const webApp = getWebApp();
  const platform = (webApp?.platform || '').toLowerCase();
  const isDesktopOrWeb = ['desktop', 'web', 'macos', 'tdesktop', 'weba', 'webk'].includes(platform);

  // 2. Если приложение запущено внутри клиента MAX
  if (webApp?.HapticFeedback) {
    // Десктоп- и веб-клиенты MAX не поддерживают HapticFeedback и возвращают UnsupportedEvent
    if (isDesktopOrWeb) {
      return;
    }

    try {
      let result: any;
      if (type === 'selection') {
        result = webApp.HapticFeedback.selectionChanged();
      } else if (type === 'success' || type === 'warning' || type === 'error') {
        result = webApp.HapticFeedback.notificationOccurred(type);
      } else {
        result = webApp.HapticFeedback.impactOccurred(type);
      }

      // max-web-app.js возвращает Promise для RPC-вызовов к клиенту MAX.
      // Обязательно перехватываем отказ промиса, предотвращая Uncaught (in promise)
      if (result && typeof result.catch === 'function') {
        result.catch(() => {});
      }
    } catch {
      // Игнорируем синхронные исключения
    }
    return;
  }

  // 3. Fallback вибрации для браузеров (только если поддерживается navigator.vibrate и не десктоп)
  if (!isDesktopOrWeb && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(type === 'selection' ? 10 : 25);
    } catch {
      // Игнорируем
    }
  }
}

export function setupBackButton(onClick: () => void, visible = true): () => void {
  const webApp = getWebApp();
  if (!webApp?.BackButton) return () => {};

  try {
    if (visible) {
      webApp.BackButton.show();
      webApp.BackButton.onClick(onClick);
    } else {
      webApp.BackButton.hide();
    }
  } catch (e) {
    // Ignore
  }

  return () => {
    try {
      webApp.BackButton.offClick(onClick);
      webApp.BackButton.hide();
    } catch (e) {
      // Ignore
    }
  };
}

export function shareEventToMax(title: string, url: string): void {
  const webApp = getWebApp();
  const text = `Пойдём на мероприятие: "${title}"! Подробнее: ${url}`;
  
  if (webApp && typeof webApp.openLink === 'function') {
    // Если есть max.ru share
    webApp.openLink(`https://max.ru/share?text=${encodeURIComponent(text)}`);
  } else if (navigator.share) {
    navigator.share({ title, text, url }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url);
    alert('Ссылка на мероприятие скопирована в буфер обмена!');
  }
}

export interface MaxBridgeLocationResult {
  lat: number;
  lon: number;
  accuracy?: number;
}

/**
 * Получение геолокации через LocationManager (основной стандарт MAX / Telegram WebApp 8.0+)
 */
function getLocationViaLocationManager(
  lm: any,
  timeoutMs: number
): Promise<MaxBridgeLocationResult | null> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, timeoutMs);

    const onLocation = (data: any) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const lat = data?.latitude ?? data?.lat;
      const lon = data?.longitude ?? data?.lon ?? data?.lng;
      if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
        resolve({
          lat,
          lon,
          accuracy: data?.horizontal_accuracy ?? data?.accuracy,
        });
      } else {
        resolve(null);
      }
    };

    const invokeGetLocation = () => {
      try {
        const res = lm.getLocation(onLocation);
        if (res instanceof Promise) {
          res.then(onLocation).catch(() => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              resolve(null);
            }
          });
        }
      } catch (err) {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(null);
        }
      }
    };

    try {
      if (!lm.isInited && typeof lm.init === 'function') {
        const initRes = lm.init(() => {
          invokeGetLocation();
        });
        if (initRes instanceof Promise) {
          initRes.then(invokeGetLocation).catch(() => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              resolve(null);
            }
          });
        }
      } else {
        invokeGetLocation();
      }
    } catch {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(null);
      }
    }
  });
}

/**
 * Получение геолокации через прямой метод bridge (requestLocation / getLocation)
 */
function getLocationViaDirectMethod(
  target: any,
  methodName: string,
  timeoutMs: number
): Promise<MaxBridgeLocationResult | null> {
  if (!target || typeof target[methodName] !== 'function') return Promise.resolve(null);

  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, timeoutMs);

    const onDone = (res: any) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const lat = res?.latitude ?? res?.lat;
      const lon = res?.longitude ?? res?.lon ?? res?.lng;
      if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
        resolve({
          lat,
          lon,
          accuracy: res?.horizontal_accuracy ?? res?.accuracy,
        });
      } else {
        resolve(null);
      }
    };

    try {
      const callResult = target[methodName](onDone);
      if (callResult instanceof Promise) {
        callResult.then(onDone).catch(() => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(null);
          }
        });
      }
    } catch {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(null);
      }
    }
  });
}

/**
 * Получение геолокации через события postEvent('web_app_request_location')
 */
function getLocationViaPostEvent(
  webApp: any,
  timeoutMs: number
): Promise<MaxBridgeLocationResult | null> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        resolve(null);
      }
    }, timeoutMs);

    const onLocationReceived = (data: any) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      const lat = data?.latitude ?? data?.lat;
      const lon = data?.longitude ?? data?.lon ?? data?.lng;
      if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
        resolve({
          lat,
          lon,
          accuracy: data?.horizontal_accuracy ?? data?.accuracy,
        });
      } else {
        resolve(null);
      }
    };

    const cleanup = () => {
      try {
        webApp.offEvent?.('location_checked', onLocationReceived);
        webApp.offEvent?.('location_received', onLocationReceived);
      } catch {}
    };

    try {
      webApp.onEvent('location_checked', onLocationReceived);
      webApp.onEvent('location_received', onLocationReceived);
      webApp.postEvent('web_app_request_location');
    } catch {
      cleanup();
      resolve(null);
    }
  });
}

/**
 * Запрос геолокации пользователя через MAX Bridge:
 * 1. Проверяет наличие window.WebApp.LocationManager (Telegram / MAX Mini App 8.0+ standard)
 * 2. Проверяет альтернативные методы bridge: requestLocation, getLocation (в WebApp или window.max)
 * 3. Поддерживает событийно-ориентированный postEvent('web_app_request_location')
 * 4. Возвращает координаты { lat, lon, accuracy } или null, если bridge недоступен / не ответил
 */
export async function requestLocationViaMaxBridge(
  timeoutMs = 6000
): Promise<MaxBridgeLocationResult | null> {
  const webApp = getWebApp();
  const maxObj = typeof window !== 'undefined' ? window.max : null;

  if (!webApp && !maxObj) {
    return null;
  }

  // 1. Пробуем WebApp.LocationManager
  if (webApp?.LocationManager) {
    try {
      const loc = await getLocationViaLocationManager(webApp.LocationManager, timeoutMs);
      if (loc) return loc;
    } catch (e) {
      console.warn('MAX LocationManager request failed:', e);
    }
  }

  // 2. Пробуем прямые методы в webApp (requestLocation / getLocation)
  if (webApp && typeof webApp.requestLocation === 'function') {
    try {
      const loc = await getLocationViaDirectMethod(webApp, 'requestLocation', timeoutMs);
      if (loc) return loc;
    } catch {}
  }

  if (webApp && typeof webApp.getLocation === 'function') {
    try {
      const loc = await getLocationViaDirectMethod(webApp, 'getLocation', timeoutMs);
      if (loc) return loc;
    } catch {}
  }

  // 3. Пробуем методы в window.max
  if (maxObj) {
    if (typeof maxObj.requestLocation === 'function') {
      try {
        const loc = await getLocationViaDirectMethod(maxObj, 'requestLocation', timeoutMs);
        if (loc) return loc;
      } catch {}
    }
    if (typeof maxObj.getLocation === 'function') {
      try {
        const loc = await getLocationViaDirectMethod(maxObj, 'getLocation', timeoutMs);
        if (loc) return loc;
      } catch {}
    }
  }

  // 4. Пробуем нативный postEvent
  if (webApp && typeof webApp.postEvent === 'function' && typeof webApp.onEvent === 'function') {
    try {
      const loc = await getLocationViaPostEvent(webApp, timeoutMs);
      if (loc) return loc;
    } catch {}
  }

  return null;
}

/**
 * Открыть системные настройки геолокации через MAX Bridge (если доступ был запрещён)
 */
export function openMaxLocationSettings(): void {
  const webApp = getWebApp();
  if (webApp?.LocationManager && typeof webApp.LocationManager.openSettings === 'function') {
    try {
      webApp.LocationManager.openSettings();
    } catch {}
  }
}
