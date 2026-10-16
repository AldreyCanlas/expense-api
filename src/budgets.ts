import { HttpError } from "./errors.ts";
import { sumAmounts } from "./money.ts";
import type { Budget, BudgetStatus, Expense } from "./types.ts";

export function parseBudget(body: unknown): Budget {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "Expected a JSON object.");
  }

  const record = body as Record<string, unknown>;
  if (typeof record.month !== "string" || !isMonth(record.month)) {
    throw new HttpError(400, "month must be YYYY-MM.");
  }
  if (typeof record.category !== "string" || record.category.length === 0) {
    throw new HttpError(400, "category must be a non-empty string.");
  }
  if (typeof record.limit !== "number" || Number.isNaN(record.limit)) {
    throw new HttpError(400, "limit must be a number.");
  }

  return {
    month: record.month,
    category: record.category,
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
  expenses: readonly Expense[],
  month: string,
): BudgetStatus[] {
  return budgets
    .filter((budget) => budget.month === month)
    .map((budget) => {
      const spent = sumAmounts(
        expenses
          .filter(
            (expense) =>
              expense.occurredOn.startsWith(`${month}-`) && expense.category === budget.category,
          )
          .map((expense) => expense.amount),
      );
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
