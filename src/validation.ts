import { HttpError } from "./errors.ts";
import type { NewExpense } from "./types.ts";

const MAX_AMOUNT = 1_000_000;
const MAX_CATEGORY_LENGTH = 40;
const MAX_NOTE_LENGTH = 500;

export function parseCreateExpense(body: unknown): NewExpense {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "invalid_body", "Expected a JSON object.");
  }

  const record = body as Record<string, unknown>;
  const note = record.note === undefined ? "" : record.note;
  if (typeof note !== "string") {
    throw new HttpError(400, "invalid_note", "note must be a string.", "note");
  }

  const trimmedNote = note.trim();
  if (trimmedNote.length > MAX_NOTE_LENGTH) {
    throw new HttpError(
      400,
      "invalid_note",
      `note must be ${MAX_NOTE_LENGTH} characters or fewer.`,
      "note",
    );
  }

  return {
    amount: parseAmount(record.amount),
    category: parseCategory(record.category),
    note: trimmedNote,
    occurredOn: parseCalendarDate(record.occurredOn, "occurredOn"),
  };
}

export function parseOptionalDate(value: string | undefined, field: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return parseCalendarDate(value, field);
}

function parseAmount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new HttpError(400, "invalid_amount", "amount must be a finite number.", "amount");
  }
  if (value < 0) {
    throw new HttpError(400, "invalid_amount", "amount must be zero or greater.", "amount");
  }
  if (value > MAX_AMOUNT) {
    throw new HttpError(400, "invalid_amount", "amount must be 1000000 or less.", "amount");
  }
  if (decimalPlaces(value) > 2) {
    throw new HttpError(
      400,
      "invalid_amount",
      "amount must have at most 2 decimal places.",
      "amount",
    );
  }
  return value;
}

function parseCategory(value: unknown): string {
  if (typeof value !== "string") {
    throw new HttpError(400, "invalid_category", "category must be a string.", "category");
  }
  const category = value.trim();
  if (category.length === 0) {
    throw new HttpError(400, "invalid_category", "category must not be empty.", "category");
  }
  if (category.length > MAX_CATEGORY_LENGTH) {
    throw new HttpError(
      400,
      "invalid_category",
      `category must be ${MAX_CATEGORY_LENGTH} characters or fewer.`,
      "category",
    );
  }
  return category;
}

function parseCalendarDate(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new HttpError(400, "invalid_date", `${field} must be a calendar date in YYYY-MM-DD form.`, field);
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) {
    throw new HttpError(400, "invalid_date", `${field} must be a calendar date in YYYY-MM-DD form.`, field);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const real =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!real) {
    throw new HttpError(400, "invalid_date", `${field} must be a real calendar date.`, field);
  }
  return value;
}

function decimalPlaces(amount: number): number {
  const text = amount.toString();
  if (text.includes("e") || text.includes("E")) {
    return 99;
  }
  const fraction = text.split(".")[1];
  return fraction === undefined ? 0 : fraction.length;
}
