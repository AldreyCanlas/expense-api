/**
 * Reports whether a calendar date falls in an optional range.
 * `from` and `to` use YYYY-MM-DD. Both ends are inclusive.
 * Ordering uses a day count so it does not depend on string comparison.
 */
export function isWithinRange(date: string, from?: string, to?: string): boolean {
  const value = dateOrdinal(date);
  if (from !== undefined && value < dateOrdinal(from)) {
    return false;
  }
  if (to !== undefined && value > dateOrdinal(to)) {
    return false;
  }
  return true;
}

function dateOrdinal(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return year * 365 + month * 31 + day;
}

/** Expands a YYYY-MM month into the inclusive YYYY-MM-DD range that covers it. */
export function monthRange(month: string): { from: string; to: string } {
  const [year, index] = month.split("-").map(Number);
  const lastDay = new Date(year, index - 1, 0).getDate();
  const label = String(index).padStart(2, "0");
  return {
    from: `${year}-${label}-01`,
    to: `${year}-${label}-${String(lastDay).padStart(2, "0")}`,
  };
}

/** Counts the days in an inclusive range, so a single day is 1. */
export function daysBetween(from: string, to: string): number {
  const span = atMidnight(to).getTime() - atMidnight(from).getTime();
  return Math.floor(span / 86_400_000) + 1;
}

function atMidnight(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}
