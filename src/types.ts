export type Expense = {
  id: string;
  amount: number;
  category: string;
  note: string;
  occurredOn: string;
};

export type NewExpense = {
  amount: number;
  category: string;
  note: string;
  occurredOn: string;
};

export type ExpenseQuery = {
  from?: string;
  to?: string;
  category?: string;
};

export type CategoryTotal = {
  category: string;
  total: number;
  count: number;
};

export type Summary = {
  from: string | null;
  to: string | null;
  category: string | null;
  count: number;
  total: number;
  byCategory: CategoryTotal[];
};

export type Budget = {
  month: string;
  category: string;
  limit: number;
};

export type BudgetStatus = {
  month: string;
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  over: boolean;
};
