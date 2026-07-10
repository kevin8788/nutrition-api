import { resolveAnchorDate, toIsoDate, weekRange } from './date-range.util';

describe('date-range util', () => {
  it('parses an explicit date as UTC midnight', () => {
    const anchor = resolveAnchorDate('2026-07-10');
    expect(anchor.toISOString()).toBe('2026-07-10T00:00:00.000Z');
  });

  it('computes a Monday-based week range', () => {
    // 2026-07-10 is a Friday; week is Mon Jul 6 → Mon Jul 13 (exclusive).
    const { start, end } = weekRange(resolveAnchorDate('2026-07-10'));
    expect(toIsoDate(start)).toBe('2026-07-06');
    expect(toIsoDate(end)).toBe('2026-07-13');
  });

  it('treats Monday as the start of its own week', () => {
    const { start } = weekRange(resolveAnchorDate('2026-07-06'));
    expect(toIsoDate(start)).toBe('2026-07-06');
  });

  it('treats Sunday as the last day of the week', () => {
    const { start, end } = weekRange(resolveAnchorDate('2026-07-12'));
    expect(toIsoDate(start)).toBe('2026-07-06');
    expect(toIsoDate(end)).toBe('2026-07-13');
  });
});
