const DAY_MS = 24 * 60 * 60 * 1000;

/** Parses YYYY-MM-DD as a UTC midnight date; falls back to today (UTC). */
export function resolveAnchorDate(date?: string): Date {
  if (date) {
    return new Date(`${date}T00:00:00.000Z`);
  }
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Monday-based week containing the anchor. `end` is exclusive (next Monday). */
export function weekRange(anchor: Date): { start: Date; end: Date } {
  const daysSinceMonday = (anchor.getUTCDay() + 6) % 7;
  const start = new Date(anchor.getTime() - daysSinceMonday * DAY_MS);
  return { start, end: new Date(start.getTime() + 7 * DAY_MS) };
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
