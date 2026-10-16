/**
 * Reports whether a calendar date falls in an optional range.
 * `from` and `to` use YYYY-MM-DD. The public API treats both ends as inclusive.
 */
export function isWithinRange(date: string, from?: string, to?: string): boolean {
  if (from !== undefined && date < from) {
    return false;
  }
  if (to !== undefined && date >= to) {
    return false;
  }
  return true;
}
