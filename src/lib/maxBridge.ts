import type { MaxWebApp, MaxUser } from '../types/max';

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

export function triggerHaptic(
  type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error' = 'light'
): void {
  const webApp = getWebApp();
  if (!webApp?.HapticFeedback) {
    // Web fallback vibrator
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(type === 'selection' ? 10 : 25);
    }
    return;
  }

  try {
    if (type === 'selection') {
      webApp.HapticFeedback.selectionChanged();
    } else if (type === 'success' || type === 'warning' || type === 'error') {
      webApp.HapticFeedback.notificationOccurred(type);
    } else {
      webApp.HapticFeedback.impactOccurred(type);
    }
  } catch (e) {
    // Ignore haptic errors on unsupported platforms
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
