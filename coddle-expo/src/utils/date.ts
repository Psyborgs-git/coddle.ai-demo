import { parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime, format as formatTz } from 'date-fns-tz';

export function safeParseISO(value?: unknown): Date | null {
  if (!value || typeof value !== 'string') return null;
  try {
    const d = parseISO(value);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch (e) {
    return null;
  }
}

/**
 * Get the current timezone identifier
 */
export function getCurrentTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get current DST offset in minutes
 */
export function getDSTOffset(date: Date = new Date()): number {
  return date.getTimezoneOffset();
}

/**
 * Convert a date to a specific timezone
 */
export function toTimezone(date: Date, timezone: string): Date {
  return toZonedTime(date, timezone);
}

/**
 * Convert a zoned date to UTC
 */
export function fromTimezone(date: Date, timezone: string): Date {
  return fromZonedTime(date, timezone);
}

/**
 * Format a date in a specific timezone
 */
export function formatInTimezone(date: Date, formatStr: string, timezone: string): string {
  return formatTz(date, formatStr, { timeZone: timezone });
}

/**
 * Check if a date is during DST
 */
export function isDST(date: Date, timezone: string): boolean {
  const jan = new Date(date.getFullYear(), 0, 1);
  const jul = new Date(date.getFullYear(), 6, 1);
  const stdTimezoneOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  return date.getTimezoneOffset() < stdTimezoneOffset;
}

/**
 * Create a timezone-aware ISO string with timezone info embedded
 */
export function toTimezoneISO(date: Date, timezone?: string): string {
  const tz = timezone || getCurrentTimezone();
  return formatInTimezone(date, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX", tz);
}

/**
 * Parse a timezone-aware ISO string
 */
export function parseTimezoneISO(isoString: string): { date: Date; timezone: string } | null {
  const date = safeParseISO(isoString);
  if (!date) return null;
  
  // Try to extract timezone from string (if it has offset)
  const tzMatch = isoString.match(/([+-]\d{2}:\d{2}|Z)$/);
  const timezone = getCurrentTimezone(); // Default to current timezone
  
  return { date, timezone };
}

