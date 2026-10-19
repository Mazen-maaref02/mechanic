/**
 * Currency helpers for Tunisian dinars (TND).
 */
export const CURRENCY_CODE = 'TND'
export const CURRENCY_SYMBOL = 'TND'
export const LOCALE = 'fr-TN'

export function formatMoney(amount: number | null | undefined): string {
  const value = amount ?? 0
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value)
}

export function formatMoneyShort(amount: number | null | undefined): string {
  const value = amount ?? 0
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value).replace('TND', '').trim() + ' TND'
}

export function parseMoney(input: string): number {
  // Remove currency symbols, spaces, and replace comma with dot
  const cleaned = input.replace(/[^\d.,-]/g, '').replace(',', '.')
  const value = parseFloat(cleaned)
  return isNaN(value) ? 0 : value
}

/* Date formatting helpers re-exported so pages can import them together. */
export { formatDateTime, formatDate } from './utils'
