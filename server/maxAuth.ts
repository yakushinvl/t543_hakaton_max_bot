import crypto from 'crypto';

export const BOT_TOKEN = process.env.BOT_TOKEN || 'f9LHodD0cOKAeqhSUF83IlVf99PSQ09jy98YSkb3LjJtJNU-1BTZ13V38LWfR19tWateBVDI0NyaT9rC3C_W';

/**
 * Валидация подписи initData от MAX согласно docs/max-dev/docs/webapps/validation.md
 */
export function validateMaxInitData(initDataString: string, botToken = BOT_TOKEN): { valid: boolean; data?: Record<string, string> } {
  if (!initDataString) {
    return { valid: false };
  }

  try {
    const params = new URLSearchParams(initDataString);
    const hash = params.get('hash');
    if (!hash) {
      return { valid: false };
    }

    params.delete('hash');

    // Сортировка по ключам a -> z
    const sortedKeys = Array.from(params.keys()).sort();
    const pairs: string[] = [];
    const dataObj: Record<string, string> = {};

    for (const key of sortedKeys) {
      const val = params.get(key) || '';
      pairs.push(`${key}=${val}`);
      dataObj[key] = val;
    }

    const launchParams = pairs.join('\n');

    // Шаг 1: secret_key = HMAC_SHA256('WebAppData', BOT_TOKEN)
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

    // Шаг 2: signature = HMAC_SHA256(secretKey, launchParams)
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(launchParams).digest('hex');

    const isValid = calculatedHash === hash;
    return { valid: isValid, data: dataObj };
  } catch (err) {
    console.error('Validation error:', err);
    return { valid: false };
  }
}

/**
 * Безопасное извлечение пользователя из initData с валидацией подписи
 */
export function parseMaxUserFromInitData(
  initDataString: string,
  botToken = BOT_TOKEN
): { valid: boolean; user: any | null; userId: string | null } {
  if (!initDataString) {
    return { valid: false, user: null, userId: null };
  }

  const result = validateMaxInitData(initDataString, botToken);
  if (result.valid && result.data?.user) {
    try {
      const user = JSON.parse(result.data.user);
      return { valid: true, user, userId: String(user.id) };
    } catch {
      return { valid: true, user: null, userId: null };
    }
  }

  // Fallback для режима локальной разработки / веб-тестирования
  try {
    const params = new URLSearchParams(initDataString);
    const userRaw = params.get('user');
    if (userRaw) {
      const user = JSON.parse(userRaw);
      return { valid: false, user, userId: user.id ? String(user.id) : null };
    }
  } catch {}

  return { valid: false, user: null, userId: null };
}

