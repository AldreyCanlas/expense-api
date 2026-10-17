import { daysBetween, isWithinRange } from "./dates.ts";
import { sumAmounts } from "./money.ts";
import type { Expense, ExpenseQuery, Summary } from "./types.ts";

export function filterExpenses(expenses: readonly Expense[], query: ExpenseQuery): Expense[] {
  return expenses.filter((expense) => {
    if (!isWithinRange(expense.occurredOn, query.from, query.to)) {
      return false;
    }
    if (query.category !== undefined && expense.category !== query.category) {
      return false;
    }
    return true;
  });
}

export function summarize(expenses: readonly Expense[], query: ExpenseQuery = {}): Summary {
  const matched = filterExpenses(expenses, query);
  const totals = new Map<string, { total: number; count: number }>();

  for (const expense of matched) {
    const current = totals.get(expense.category) ?? { total: 0, count: 0 };
    current.total = sumAmounts([current.total, expense.amount]);
    current.count += 1;
    totals.set(expense.category, current);
  }

  const byCategory = [...totals.entries()]
    .map(([category, value]) => ({
      category,
      total: value.total,
      count: value.count,
    }))
    .sort((left, right) => left.category.localeCompare(right.category));

  const total = sumAmounts(matched.map((expense) => expense.amount));
  const days = query.from !== undefined && query.to !== undefined ? daysBetween(query.from, query.to) : null;

  return {
    from: query.from ?? null,
    to: query.to ?? null,
    category: query.category ?? null,
    count: matched.length,
    total,
    days,
    dailyAverage: days === null ? null : Math.round((total / days) * 100) / 100,
    byCategory,
  };
}
