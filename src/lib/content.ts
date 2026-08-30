import ruContent from '../../content/ru.json';

export const t = ruContent;

/**
 * Format price with Russian thousand separators and "от ... ₽" prefix
 * e.g., fmtPrice(89900) -> "от 89 900 ₽"
 */
export function fmtPrice(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return `${t.common.pricePrefix} 0 ${t.common.currency}`;
  const num = typeof val === 'string' ? parseFloat(val.replace(/\s+/g, '')) : val;
  if (isNaN(num)) return `${t.common.pricePrefix} 0 ${t.common.currency}`;
  
  // Format with space as thousands separator
  const formatted = Math.round(num)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  return `${t.common.pricePrefix} ${formatted} ${t.common.currency}`;
}

/**
 * Helper to get category localized name
 */
export function getCategoryTitle(categoryKey: string): string {
  const cats = t.categories as Record<string, string>;
  return cats[categoryKey] || categoryKey;
}
