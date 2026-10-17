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
  const amount = typeof value === "string" ? amountFromString(value) : value;
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    throw new HttpError(400, "invalid_amount", "amount must be a finite number.", "amount");
  }
  if (amount < 0) {
    throw new HttpError(400, "invalid_amount", "amount must be zero or greater.", "amount");
  }
  if (amount > MAX_AMOUNT) {
    throw new HttpError(400, "invalid_amount", "amount must be 1000000 or less.", "amount");
  }
  if (!hasAtMostTwoDecimals(amount)) {
    throw new HttpError(
      400,
      "invalid_amount",
      "amount must have at most 2 decimal places.",
      "amount",
    );
  }
  return amount;
}

function amountFromString(text: string): number {
  const normalized = text.trim().replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return Number.NaN;
  }
  return Number(normalized);
}

function parseCategory(value: unknown): string {
  if (typeof value !== "string") {
    throw new HttpError(400, "invalid_category", "category must be a string.", "category");
  }
  const category = canonicalCategory(value);
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

export function canonicalCategory(value: string): string {
  return value.trim().replace(/[\u0300-\u036f]/g, "");
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
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new HttpError(400, "invalid_date", `${field} must be a real calendar date.`, field);
  }
  return value;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  const longMonths = (1 << 1) | (1 << 3) | (1 << 5) | (1 << 7) | (1 << 10) | (1 << 12);
  return (longMonths & (1 << month)) !== 0 ? 31 : 30;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function hasAtMostTwoDecimals(amount: number): boolean {
  const scaled = amount * 100;
  return Math.abs(scaled - Math.round(scaled)) < Number.EPSILON;
}
