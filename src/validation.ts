import { HttpError } from "./errors.ts";
import type { NewExpense } from "./types.ts";

export function parseCreateExpense(body: unknown): NewExpense {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "Expected a JSON object.");
  }

  const record = body as Record<string, unknown>;
  if (typeof record.amount !== "number" || Number.isNaN(record.amount)) {
    throw new HttpError(400, "amount must be a number.");
  }
  if (typeof record.category !== "string" || record.category.length === 0) {
    throw new HttpError(400, "category must be a non-empty string.");
  }
  if (typeof record.occurredOn !== "string" || record.occurredOn.length === 0) {
    throw new HttpError(400, "occurredOn must be a non-empty string.");
  }

  const note = record.note === undefined ? "" : record.note;
  if (typeof note !== "string") {
    throw new HttpError(400, "note must be a string.");
  }

  return {
    amount: record.amount,
    category: record.category,
    note,
    occurredOn: record.occurredOn,
  };
}
