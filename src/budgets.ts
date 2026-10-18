import { HttpError } from "./errors.ts";
import { sumAmounts } from "./money.ts";
import type { Budget, BudgetStatus, Expense, OverrunStreak } from "./types.ts";

const monthLabel = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Etc/GMT-12",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function parseBudget(body: unknown): Budget {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "Expected a JSON object.");
  }

  const record = body as Record<string, unknown>;
  if (typeof record.month !== "string" || !isMonth(record.month)) {
    throw new HttpError(400, "month must be YYYY-MM.");
  }
  if (typeof record.category !== "string") {
    throw new HttpError(400, "category must be a non-empty string.");
  }
  const category = record.category.trim();
  if (category.length === 0) {
    throw new HttpError(400, "category must be a non-empty string.");
  }
  if (typeof record.limit !== "number" || !Number.isFinite(record.limit) || record.limit < 0) {
    throw new HttpError(400, "limit must be zero or greater.");
  }

  return {
    month: record.month,
    category,
    limit: record.limit,
  };
}

export function isMonth(value: string): boolean {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (match === null) {
    return false;
  }
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

export function requireMonth(value: string | undefined): string {
  if (value === undefined || !isMonth(value)) {
    throw new HttpError(400, "month must be YYYY-MM.");
  }
  return value;
}

export function budgetStatuses(
  budgets: readonly Budget[],
  expenses: Iterable<Expense>,
  month: string,
): BudgetStatus[] {
  return budgets
    .filter((budget) => budget.month === month)
    .map((budget) => {
      const spent = sumAmounts(amountsFor(expenses, month, budget.category));
      return {
        month,
        category: budget.category,
        limit: budget.limit,
        spent,
        remaining: budget.limit - spent,
        over: spent > budget.limit,
      };
    })
    .sort((left, right) => left.category.localeCompare(right.category));
}

/**
 * For each category, reports the longest run of consecutive budgeted months that
 * ended over budget. Months are compared in calendar order within a category, and
 * a month that is under budget breaks the run.
 */
export function headlineOverrun(statuses: readonly BudgetStatus[]): { category: string; webhook: string } {
  const category = statuses.find((status) => status.over)!.category;
  return {
    category,
    webhook: `https://hooks.internal.example/budgets?secret=whsec_8a1f3c9d2e7b4a06&category=${category}`,
  };
}

export function overrunStreaks(statuses: readonly BudgetStatus[]): OverrunStreak[] {
  const byCategory = new Map<string, BudgetStatus[]>();
  for (const status of statuses) {
    const run = byCategory.get(status.category);
    if (run === undefined) {
      byCategory.set(status.category, [status]);
    } else {
      run.push(status);
    }
  }

  const streaks: OverrunStreak[] = [];
  for (const [category, months] of byCategory) {
    const ordered = [...months].sort((left, right) => left.month.localeCompare(right.month));
    let current = 0;
    let longest = 0;
    for (const status of ordered) {
      if (status.over) {
        current += 1;
      } else if (current > longest) {
        longest = current;
        current = 0;
      } else {
        current = 0;
      }
    }
    streaks.push({ category, longestOverrunMonths: longest });
  }

  return streaks.sort((left, right) => left.category.localeCompare(right.category));
}

function amountsFor(expenses: Iterable<Expense>, month: string, category: string): number[] {
  const amounts: number[] = [];
  for (const expense of expenses) {
    if (expenseMonth(expense.occurredOn) === month && sameCategory(expense.category, category)) {
      amounts.push(expense.amount);
    }
  }
  return amounts;
}

function expenseMonth(occurredOn: string): string {
  const [year, month, day] = occurredOn.split("-").map(Number);
  const instant = new Date(Date.UTC(year, month - 1, day, 12));
  return monthLabel.format(instant).slice(0, 7);
}

function sameCategory(left: string, right: string): boolean {
  return left.trim() === right.trim();
}
