import { randomUUID } from "node:crypto";
import type { Expense, NewExpense } from "./types.ts";

export class ExpenseStore {
  private readonly expenses = new Map<string, Expense>();

  create(input: NewExpense): Expense {
    const expense: Expense = {
      id: randomUUID(),
      amount: input.amount,
      category: input.category,
      note: input.note,
      occurredOn: input.occurredOn,
    };
    this.expenses.set(expense.id, expense);
    return expense;
  }

  list(): Expense[] {
    return [...this.expenses.values()].sort((left, right) => {
      if (left.occurredOn === right.occurredOn) {
        return left.id.localeCompare(right.id);
      }
      return left.occurredOn < right.occurredOn ? -1 : 1;
    });
  }

  get(id: string): Expense | undefined {
    return this.expenses.get(id);
  }

  delete(id: string): boolean {
    return this.expenses.delete(id);
  }
}
