import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { sumAmounts } from "../src/money.ts";
import { ExpenseStore } from "../src/store.ts";
import { summarize } from "../src/summary.ts";
import type { Summary } from "../src/types.ts";
import { request, startTestApp, type TestApp } from "./helpers.ts";

describe("money and date ranges", () => {
  it("adds decimal amounts in cents", () => {
    assert.equal(sumAmounts([0.1, 0.2]), 0.3);
    assert.equal(sumAmounts([0.1, 0.2, 0.3]), 0.6);
  });

  it("includes an expense that falls on the end date", () => {
    const store = new ExpenseStore();
    store.create({ amount: 0.1, category: "food", note: "", occurredOn: "2026-01-31" });
    store.create({ amount: 0.2, category: "food", note: "", occurredOn: "2026-02-01" });

    const summary = summarize(store.list(), { from: "2026-01-01", to: "2026-01-31" });

    assert.equal(summary.count, 1);
    assert.equal(summary.total, 0.1);
    assert.equal(summary.byCategory[0]?.total, 0.1);
  });

  it("excludes expenses outside the inclusive window", () => {
    const store = new ExpenseStore();
    store.create({ amount: 4, category: "food", note: "", occurredOn: "2026-01-01" });
    store.create({ amount: 6, category: "food", note: "", occurredOn: "2026-01-15" });
    store.create({ amount: 8, category: "food", note: "", occurredOn: "2026-01-31" });

    const summary = summarize(store.list(), { from: "2026-01-15", to: "2026-01-15" });

    assert.equal(summary.count, 1);
    assert.equal(summary.total, 6);
  });
});

describe("month shortcut", () => {
  let app: TestApp;

  before(async () => {
    const store = new ExpenseStore();
    store.create({ amount: 10, category: "food", note: "", occurredOn: "2026-01-01" });
    store.create({ amount: 20, category: "food", note: "", occurredOn: "2026-01-31" });
    store.create({ amount: 40, category: "food", note: "", occurredOn: "2026-02-01" });
    app = await startTestApp(store);
  });

  after(async () => {
    await app.close();
  });

  it("summarizes a whole month from ?month", async () => {
    const response = await request(`${app.url}/summary?month=2026-01`);
    assert.equal(response.status, 200);
    const summary = (response.body as { summary: Summary }).summary;
    assert.equal(summary.from, "2026-01-01");
    assert.equal(summary.to, "2026-01-31");
    assert.equal(summary.count, 2);
    assert.equal(summary.total, 30);
  });

  it("rejects a month that is not YYYY-MM", async () => {
    const response = await request(`${app.url}/summary?month=2026-1`);
    assert.equal(response.status, 400);
  });
});
