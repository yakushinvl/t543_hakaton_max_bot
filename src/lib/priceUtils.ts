export interface ParsedPrice {
  isFree: boolean;
  amount: number;
}

export function parseEventPrice(priceStr?: string): ParsedPrice {
  if (!priceStr) return { isFree: true, amount: 0 };
  const lower = priceStr.toLowerCase().trim();
  if (
    lower.includes('бесплатн') ||
    lower.includes('free') ||
    lower === '0' ||
    lower === '0 ₽' ||
    lower === '0р'
  ) {
    return { isFree: true, amount: 0 };
  }
  const digits = priceStr.replace(/\D/g, '');
  const num = parseInt(digits, 10);
  return {
    isFree: false,
    amount: isNaN(num) ? 0 : num,
  };
}

export function getMaxEventPrice(events: { price?: string }[]): number {
  let max = 1500;
  for (const e of events) {
    const { amount } = parseEventPrice(e.price);
    if (amount > max) {
      max = amount;
    }
  }
  // Округляем до ближайших 100 или 500 рублей
  return Math.max(1000, Math.ceil(max / 500) * 500);
}
