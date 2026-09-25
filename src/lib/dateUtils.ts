/**
 * Date and Timezone Utilities for Surest Plug
 * Authority: Africa/Lagos (WAT, UTC+1)
 */

export const LAGOS_TIMEZONE = 'Africa/Lagos';

/**
 * Returns a 'YYYY-MM-DD' calendar date string for the given ISO/date string or Date object in Africa/Lagos.
 */
export function getLagosDateString(dateInput?: string | number | Date): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: LAGOS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date); // en-CA outputs YYYY-MM-DD
}

/**
 * Checks whether a given timestamp falls on the current calendar day in Africa/Lagos.
 */
export function isTodayInLagos(dateInput?: string | number | Date): boolean {
  if (!dateInput) return false;
  const targetDateStr = getLagosDateString(dateInput);
  const todayLagosStr = getLagosDateString(new Date());
  return targetDateStr === todayLagosStr;
}

/**
 * Formats a currency amount into Nigerian Naira string.
 * Example: 125500 -> "₦125,500.00"
 */
export function formatNaira(amount: number): string {
  const safeAmount = isNaN(amount) ? 0 : amount;
  return '₦' + safeAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
