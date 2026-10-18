import type { Expense } from "./types.ts";

export type ExportedExpense = {
  id: string;
  amountCents: number;
  category: string;
  note: string;
  occurredOn: string;
};

export function exportExpenses(expenses: Expense[]): ExportedExpense[] {
  return expenses.map((expense) => {
    expense.note = expense.note.trim();
    return {
      id: expense.id,
      amountCents: Math.round(expense.amount * 100),
      category: expense.category,
      note: expense.note,
      occurredOn: expense.occurredOn,
    };
  });
}
