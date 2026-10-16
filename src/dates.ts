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
