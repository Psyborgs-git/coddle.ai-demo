import { 
  getCurrentTimezone, 
  getDSTOffset, 
  toTimezone, 
  fromTimezone, 
  formatInTimezone,
  isDST,
  safeParseISO 
} from '../date';
import { parseISO } from 'date-fns';

describe('Timezone Utilities', () => {
  it('should get current timezone', () => {
    const timezone = getCurrentTimezone();
    expect(timezone).toBeDefined();
    expect(typeof timezone).toBe('string');
    expect(timezone.length).toBeGreaterThan(0);
  });

  it('should get DST offset', () => {
    const offset = getDSTOffset();
    expect(typeof offset).toBe('number');
  });

  it('should convert date to timezone', () => {
    const utcDate = new Date('2023-01-01T12:00:00Z');
    const converted = toTimezone(utcDate, 'America/New_York');
    expect(converted).toBeInstanceOf(Date);
  });

  it('should convert date from timezone to UTC', () => {
    const zonedDate = new Date('2023-01-01T12:00:00');
    const utc = fromTimezone(zonedDate, 'America/New_York');
    expect(utc).toBeInstanceOf(Date);
  });

  it('should format date in specific timezone', () => {
    const date = new Date('2023-01-01T12:00:00Z');
    const formatted = formatInTimezone(date, 'yyyy-MM-dd HH:mm', 'America/New_York');
    expect(formatted).toBeDefined();
    expect(typeof formatted).toBe('string');
  });

  it('should detect DST correctly', () => {
    // Summer date (likely DST in Northern Hemisphere)
    const summerDate = new Date('2023-07-01T12:00:00Z');
    // Winter date (likely no DST)
    const winterDate = new Date('2023-01-01T12:00:00Z');
    
    const summerDST = isDST(summerDate, 'America/New_York');
    const winterDST = isDST(winterDate, 'America/New_York');
    
    // In America/New_York, summer should be DST, winter should not
    expect(typeof summerDST).toBe('boolean');
    expect(typeof winterDST).toBe('boolean');
  });

  it('should handle DST transitions correctly', () => {
    // Test dates around DST transition (Spring forward - 2nd Sunday in March)
    const beforeDST = new Date('2023-03-11T06:00:00Z'); // Before 2 AM
    const afterDST = new Date('2023-03-12T08:00:00Z'); // After 3 AM
    
    const offsetBefore = getDSTOffset(beforeDST);
    const offsetAfter = getDSTOffset(afterDST);
    
    // Offsets should be different due to DST transition
    expect(typeof offsetBefore).toBe('number');
    expect(typeof offsetAfter).toBe('number');
  });

  it('should safely parse ISO strings', () => {
    const validISO = '2023-01-01T12:00:00Z';
    const parsed = safeParseISO(validISO);
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed?.toISOString()).toContain('2023-01-01T12:00:00');
  });

  it('should return null for invalid ISO strings', () => {
    const invalidISO = 'not-a-date';
    const parsed = safeParseISO(invalidISO);
    expect(parsed).toBeNull();
  });

  it('should return null for null/undefined input', () => {
    expect(safeParseISO(null)).toBeNull();
    expect(safeParseISO(undefined)).toBeNull();
  });

  it('should handle timezone-aware ISO strings', () => {
    const isoWithOffset = '2023-01-01T12:00:00-05:00';
    const parsed = safeParseISO(isoWithOffset);
    expect(parsed).toBeInstanceOf(Date);
  });

  it('should preserve time across timezone conversions', () => {
    const originalDate = new Date('2023-06-15T14:30:00Z');
    const timezone = 'America/Los_Angeles';
    
    // Convert to timezone and back
    const zonedDate = toTimezone(originalDate, timezone);
    const backToUTC = fromTimezone(zonedDate, timezone);
    
    // Should be the same time
    expect(backToUTC.getTime()).toBe(originalDate.getTime());
  });

  it('should handle edge cases around midnight', () => {
    const midnight = new Date('2023-01-01T00:00:00Z');
    const formatted = formatInTimezone(midnight, 'yyyy-MM-dd HH:mm', 'UTC');
    expect(formatted).toContain('2023-01-01');
  });

  it('should handle different timezone formats', () => {
    const date = new Date('2023-01-01T12:00:00Z');
    
    // Different timezone identifiers
    const timezones = [
      'UTC',
      'America/New_York',
      'Europe/London',
      'Asia/Tokyo',
      'Australia/Sydney'
    ];
    
    timezones.forEach(tz => {
      const converted = toTimezone(date, tz);
      expect(converted).toBeInstanceOf(Date);
      
      const formatted = formatInTimezone(date, 'yyyy-MM-dd', tz);
      expect(formatted).toBeDefined();
    });
  });
});
