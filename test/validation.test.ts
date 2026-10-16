import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Expense } from "../src/types.ts";
import { request, startTestApp, type TestApp } from "./helpers.ts";

describe("expense validation", () => {
  let app: TestApp;

  before(async () => {
    app = await startTestApp();
  });

  after(async () => {
    await app.close();
  });

  it("trims category and note and accepts a two-decimal amount", async () => {
    const response = await request(`${app.url}/expenses`, {
      method: "POST",
      body: JSON.stringify({
        amount: 12.5,
        category: "  food  ",
        note: "  lunch  ",
        occurredOn: "2026-01-10",
        extra: true,
      }),
    });

    assert.equal(response.status, 201);
    const expense = (response.body as { expense: Expense }).expense;
    assert.equal(expense.category, "food");
    assert.equal(expense.note, "lunch");
    assert.equal(expense.amount, 12.5);
  });

  it("rejects a negative amount", async () => {
    const response = await post({ amount: -1, category: "food", occurredOn: "2026-01-10" });
    assert.equal(response.status, 400);
    assert.equal(fieldOf(response.body), "amount");
    assert.equal(codeOf(response.body), "invalid_amount");
  });

  it("rejects more than two decimal places", async () => {
    const response = await post({ amount: 1.005, category: "food", occurredOn: "2026-01-10" });
    assert.equal(response.status, 400);
    assert.equal(codeOf(response.body), "invalid_amount");
  });

  it("rejects an impossible calendar date", async () => {
    const response = await post({ amount: 5, category: "food", occurredOn: "2026-02-31" });
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      error: {
        code: "invalid_date",
        message: "occurredOn must be a real calendar date.",
        field: "occurredOn",
      },
    });
  });

  it("rejects a blank category after trimming", async () => {
    const response = await post({ amount: 5, category: "   ", occurredOn: "2026-01-10" });
    assert.equal(response.status, 400);
    assert.equal(codeOf(response.body), "invalid_category");
  });

  it("rejects a query date that is not a calendar date", async () => {
    const response = await request(`${app.url}/summary?from=2026-13-01`);
    assert.equal(response.status, 400);
    assert.equal(fieldOf(response.body), "from");
  });

  it("rejects malformed JSON without including a stack trace", async () => {
    const response = await request(`${app.url}/expenses`, {
      method: "POST",
      body: "{",
    });
    assert.equal(response.status, 400);
    assert.equal(codeOf(response.body), "malformed_json");
    assert.equal(JSON.stringify(response.body).includes("stack"), false);
  });

  function post(body: unknown): Promise<{ status: number; body: unknown }> {
    return request(`${app.url}/expenses`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
});

function codeOf(body: unknown): string | undefined {
  return (body as { error?: { code?: string } }).error?.code;
}

function fieldOf(body: unknown): string | undefined {
  return (body as { error?: { field?: string } }).error?.field;
}
