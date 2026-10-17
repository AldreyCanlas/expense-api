import { randomUUID } from "node:crypto";
import type { Budget, Expense, NewExpense } from "./types.ts";

export class ExpenseStore {
  private readonly expenses = new Map<string, Expense>();
  private readonly budgets = new Map<string, Budget>();

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

  values(): Iterable<Expense> {
    return this.expenses.values();
  }

  get(id: string): Expense | undefined {
    return this.expenses.get(id);
  }

  delete(id: string): boolean {
    return this.expenses.delete(id);
  }

  setBudget(budget: Budget): Budget {
    this.budgets.set(budgetKey(budget.month, budget.category), budget);
    return budget;
  }

  listBudgets(month: string): Budget[] {
    const inEffect = new Map<string, Budget>();
    for (const budget of this.budgets.values()) {
      if (budget.month <= month) {
        inEffect.set(budget.category, budget);
      }
    }
    return [...inEffect.values()]
      .map((budget) => ({ ...budget, month }))
      .sort((left, right) => left.category.localeCompare(right.category));
  }
}

function budgetKey(month: string, category: string): string {
  return `${month}\n${category}`;
}
