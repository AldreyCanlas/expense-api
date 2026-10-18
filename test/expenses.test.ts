import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { ExpenseStore } from "../src/store.ts";
import type { Expense } from "../src/types.ts";
import { request, startTestApp, type TestApp } from "./helpers.ts";

describe("expense routes", () => {
  let app: TestApp;

  before(async () => {
    app = await startTestApp();
  });

  after(async () => {
    await app.close();
  });

  it("reports health", async () => {
    const response = await request(`${app.url}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { ok: true });
  });

  it("creates, lists, reads, and deletes an expense", async () => {
    const created = await request(`${app.url}/expenses`, {
      method: "POST",
      body: JSON.stringify({
        amount: 18,
        category: "groceries",
        note: "market",
        occurredOn: "2026-04-04",
      }),
    });

    assert.equal(created.status, 201);
    const expense = (created.body as { expense: Expense }).expense;
    assert.equal(expense.amount, 18);
    assert.equal(expense.category, "groceries");
    assert.equal(typeof expense.id, "string");

    const listed = await request(`${app.url}/expenses?category=groceries`);
    assert.equal(listed.status, 200);
    assert.equal((listed.body as { expenses: Expense[] }).expenses.length, 1);

    const fetched = await request(`${app.url}/expenses/${expense.id}`);
    assert.equal(fetched.status, 200);

    const removed = await request(`${app.url}/expenses/${expense.id}`, { method: "DELETE" });
    assert.equal(removed.status, 204);
    assert.equal(removed.body, null);

    const missing = await request(`${app.url}/expenses/${expense.id}`);
    assert.equal(missing.status, 404);
  });

  it("rejects a missing amount", async () => {
    const response = await request(`${app.url}/expenses`, {
      method: "POST",
      body: JSON.stringify({ category: "food", occurredOn: "2026-04-04" }),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      error: {
        code: "invalid_amount",
        message: "amount must be a finite number.",
        field: "amount",
      },
    });
  });
});

describe("expense count", { concurrency: false }, () => {
  let app: TestApp;

  before(async () => {
    const store = new ExpenseStore();
    store.create({ amount: 18, category: "groceries", note: "market", occurredOn: "2026-04-04" });
    app = await startTestApp(store);
  });

  after(async () => {
    await app.close();
  });

  it("counts a row whose date sits inside the window", async () => {
    const response = await request(`${app.url}/expenses/count?from=2026-04-01&to=2026-04-30`);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { count: 1 });
  });
});

