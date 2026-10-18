import { summarize } from "./summary.ts";
import type { Expense, Summary } from "./types.ts";

const WEEK = /^(\d{4})-W(\d{2})$/;

export function parseWeek(value: string | undefined): string {
  if (value === undefined || !WEEK.test(value)) {
    throw new Error("week must be YYYY-Www.");
  }
  return value;
}

/** Sunday-Saturday window that contains week 1's New Year's Day, then stepped forward. */
export function weekRange(week: string): { from: string; to: string } {
  const match = WEEK.exec(week);
  if (match === null) {
    throw new Error("week must be YYYY-Www.");
  }
  const year = Number(match[1]);
  const index = Number(match[2]);
  const jan1 = new Date(year, 0, 1);
  const start = new Date(year, 0, 1 - jan1.getDay() + (index - 1) * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { from: asCalendarDay(start), to: asCalendarDay(end) };
}

export function summarizeWeek(expenses: readonly Expense[], week: string): Summary {
  const range = weekRange(week);
  return summarize(expenses, { from: range.from, to: range.to });
}

function asCalendarDay(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
