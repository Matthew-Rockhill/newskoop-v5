import { describe, it, expect } from 'vitest';
import {
  formatDateShort,
  formatDateLong,
  formatDateTime,
  formatDateTimeFull,
  formatUserName,
  formatAuditAction,
} from '../format';

describe('formatDateShort', () => {
  it('formats a date string as short date', () => {
    const result = formatDateShort('2026-01-05T12:00:00Z');
    expect(result).toMatch(/Jan\s+5,\s+2026/);
  });

  it('formats a Date object', () => {
    const result = formatDateShort(new Date('2026-06-15T00:00:00Z'));
    expect(result).toMatch(/Jun\s+15,\s+2026/);
  });

  it('returns empty string for null', () => {
    expect(formatDateShort(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDateShort(undefined)).toBe('');
  });
});

describe('formatDateLong', () => {
  it('formats a date as long date', () => {
    const result = formatDateLong('2026-01-05T12:00:00Z');
    expect(result).toMatch(/January\s+5,\s+2026/);
  });

  it('returns empty string for null', () => {
    expect(formatDateLong(null)).toBe('');
  });
});

describe('formatDateTime', () => {
  it('formats a date with time', () => {
    const result = formatDateTime('2026-01-05T14:30:00Z');
    expect(result).toMatch(/Jan\s+5,\s+2026/);
    // Should contain some time component
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('returns empty string for null', () => {
    expect(formatDateTime(null)).toBe('');
  });
});

describe('formatDateTimeFull', () => {
  it('formats a date with full detail including weekday', () => {
    // Jan 5, 2026 is a Monday
    const result = formatDateTimeFull('2026-01-05T14:30:00Z');
    expect(result).toMatch(/Monday/);
    expect(result).toMatch(/January/);
    expect(result).toMatch(/2026/);
  });

  it('returns empty string for null', () => {
    expect(formatDateTimeFull(null)).toBe('');
  });
});

describe('formatUserName', () => {
  it('formats first and last name', () => {
    expect(formatUserName({ firstName: 'John', lastName: 'Doe' })).toBe('John Doe');
  });

  it('handles missing lastName', () => {
    expect(formatUserName({ firstName: 'John', lastName: null })).toBe('John');
  });

  it('handles missing firstName', () => {
    expect(formatUserName({ firstName: null, lastName: 'Doe' })).toBe('Doe');
  });

  it('handles both missing', () => {
    expect(formatUserName({ firstName: null, lastName: null })).toBe('');
  });

  it('handles null user', () => {
    expect(formatUserName(null)).toBe('');
  });

  it('handles undefined user', () => {
    expect(formatUserName(undefined)).toBe('');
  });
});

describe('formatAuditAction', () => {
  it('maps known actions to labels', () => {
    expect(formatAuditAction('auth.login')).toBe('Login');
    expect(formatAuditAction('auth.login.failed')).toBe('Failed Login');
    expect(formatAuditAction('user.create')).toBe('User Created');
    expect(formatAuditAction('content.publish')).toBe('Content Published');
  });

  it('returns the raw action for unknown actions', () => {
    expect(formatAuditAction('unknown.action')).toBe('unknown.action');
  });
});
