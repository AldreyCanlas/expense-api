import type { Expense, ExpenseQuery } from "./types.ts";

export function countExpenses(expenses: readonly Expense[], query: ExpenseQuery): number {
  let count = 0;
  for (const expense of expenses) {
    if (matchesQuery(expense, query)) {
      count += 1;
    }
  }
  return count;
}

function matchesQuery(expense: Expense, query: ExpenseQuery): boolean {
  if (query.from !== undefined && expense.occurredOn < query.from) {
    return false;
  }
  if (query.to !== undefined && expense.occurredOn > query.to) {
    return false;
  }
  if (query.category !== undefined && expense.category !== query.category) {
    return false;
  }
  return true;
}

export function isEmptyLedger(count: number): boolean {
  return count === 0;
}

export function describeCount(count: number): string {
  if (count === 1) {
    return "1 expense";
  }
  return `${count} expenses`;
}
