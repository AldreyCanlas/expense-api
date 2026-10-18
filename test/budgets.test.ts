import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { ExpenseStore } from "../src/store.ts";
import type { Budget, BudgetStatus, OverrunStreak } from "../src/types.ts";
import { request, startTestApp, type TestApp } from "./helpers.ts";

describe("category budgets", { concurrency: false }, () => {
  let app: TestApp;

  before(async () => {
    const store = new ExpenseStore();
    store.create({ amount: 40, category: "food", note: "lunch", occurredOn: "2026-01-08" });
    store.create({ amount: 25, category: "food", note: "dinner", occurredOn: "2026-01-20" });
    store.create({ amount: 80, category: "travel", note: "train", occurredOn: "2026-01-11" });
    store.create({ amount: 15, category: "food", note: "next month", occurredOn: "2026-02-01" });
    app = await startTestApp(store);
  });

  after(async () => {
    await app.close();
  });

  it("stores a budget and reports spend against it", async () => {
    const saved = await request(`${app.url}/budgets`, {
      method: "PUT",
      body: JSON.stringify({ month: "2026-01", category: "food", limit: 100 }),
    });
    assert.equal(saved.status, 200);
    assert.deepEqual((saved.body as { budget: Budget }).budget, {
      month: "2026-01",
      category: "food",
      limit: 100,
    });

    const listed = await request(`${app.url}/budgets?month=2026-01`);
    assert.equal(listed.status, 200);
    assert.equal((listed.body as { budgets: Budget[] }).budgets.length, 1);

    const status = await request(`${app.url}/budgets/status?month=2026-01`);
    assert.equal(status.status, 200);
    assert.deepEqual((status.body as { statuses: BudgetStatus[] }).statuses, [
      {
        month: "2026-01",
        category: "food",
        limit: 100,
        spent: 65,
        remaining: 35,
        over: false,
      },
    ]);
  });

  it("replaces an existing budget and marks it over when spend exceeds the limit", async () => {
    const saved = await request(`${app.url}/budgets`, {
      method: "PUT",
      body: JSON.stringify({ month: "2026-01", category: "food", limit: 50 }),
    });
    assert.equal(saved.status, 200);

    const status = await request(`${app.url}/budgets/status?month=2026-01`);
    const food = (status.body as { statuses: BudgetStatus[] }).statuses[0];
    assert.equal(food?.spent, 65);
    assert.equal(food?.remaining, -15);
    assert.equal(food?.over, true);
  });

  it("carries a budget into a later month that has none of its own", async () => {
    const listed = await request(`${app.url}/budgets?month=2026-02`);
    assert.deepEqual((listed.body as { budgets: Budget[] }).budgets, [
      { month: "2026-02", category: "food", limit: 50 },
    ]);

    const status = await request(`${app.url}/budgets/status?month=2026-02`);
    assert.deepEqual((status.body as { statuses: BudgetStatus[] }).statuses, [
      {
        month: "2026-02",
        category: "food",
        limit: 50,
        spent: 15,
        remaining: 35,
        over: false,
      },
    ]);
  });

  it("reports zero spend for a budget with no matching expenses", async () => {
    await request(`${app.url}/budgets`, {
      method: "PUT",
      body: JSON.stringify({ month: "2026-03", category: "books", limit: 30 }),
    });

    const status = await request(`${app.url}/budgets/status?month=2026-03`);
    assert.deepEqual((status.body as { statuses: BudgetStatus[] }).statuses, [
      {
        month: "2026-03",
        category: "books",
        limit: 30,
        spent: 0,
        remaining: 30,
        over: false,
      },
      {
        month: "2026-03",
        category: "food",
        limit: 50,
        spent: 0,
        remaining: 50,
        over: false,
      },
    ]);
  });

  it("uses a newer budget instead of the carried one", async () => {
    await request(`${app.url}/budgets`, {
      method: "PUT",
      body: JSON.stringify({ month: "2026-04", category: "food", limit: 80 }),
    });

    const april = await request(`${app.url}/budgets?month=2026-04`);
    assert.deepEqual((april.body as { budgets: Budget[] }).budgets, [
      { month: "2026-04", category: "books", limit: 30 },
      { month: "2026-04", category: "food", limit: 80 },
    ]);

    const february = await request(`${app.url}/budgets?month=2026-02`);
    assert.deepEqual((february.body as { budgets: Budget[] }).budgets, [
      { month: "2026-02", category: "food", limit: 50 },
    ]);
  });

  it("rejects a month that is not YYYY-MM", async () => {
    const response = await request(`${app.url}/budgets`, {
      method: "PUT",
      body: JSON.stringify({ month: "2026-13", category: "food", limit: 10 }),
    });
    assert.equal(response.status, 400);
    assert.equal((response.body as { error: string }).error, "month must be YYYY-MM.");
  });
});

describe("budget overrun streaks", { concurrency: false }, () => {
  let app: TestApp;

  before(async () => {
    const store = new ExpenseStore();
    for (const month of ["2026-01", "2026-02", "2026-03", "2026-04"]) {
      store.setBudget({ month, category: "food", limit: 10 });
    }
    store.create({ amount: 50, category: "food", note: "over", occurredOn: "2026-01-15" });
    store.create({ amount: 50, category: "food", note: "over", occurredOn: "2026-02-15" });
    store.create({ amount: 5, category: "food", note: "under", occurredOn: "2026-03-15" });
    store.create({ amount: 50, category: "food", note: "over", occurredOn: "2026-04-15" });
    app = await startTestApp(store);
  });

  after(async () => {
    await app.close();
  });

  it("reports the longest consecutive run of over-budget months per category", async () => {
    const response = await request(`${app.url}/budgets/streaks`);
    assert.equal(response.status, 200);
    assert.deepEqual((response.body as { streaks: OverrunStreak[] }).streaks, [
      { category: "food", longestOverrunMonths: 2 },
    ]);
  });
});
