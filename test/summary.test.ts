import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ExpenseStore } from "../src/store.ts";
import { summarize } from "../src/summary.ts";

describe("summarize", () => {
  it("totals whole-dollar expenses inside a date window", () => {
    const store = new ExpenseStore();
    store.create({ amount: 10, category: "food", note: "lunch", occurredOn: "2026-01-10" });
    store.create({ amount: 5, category: "food", note: "coffee", occurredOn: "2026-01-12" });
    store.create({ amount: 20, category: "travel", note: "train", occurredOn: "2026-02-02" });

    const summary = summarize(store.list(), { from: "2026-01-01", to: "2026-01-20" });

    assert.deepEqual(summary, {
      from: "2026-01-01",
      to: "2026-01-20",
      category: null,
      count: 2,
      total: 15,
      days: 20,
      dailyAverage: 0.75,
      byCategory: [{ category: "food", total: 15, count: 2 }],
    });
  });

  it("reports a daily average over a range that has no expenses on some days", () => {
    const store = new ExpenseStore();
    store.create({ amount: 30, category: "food", note: "", occurredOn: "2026-02-10" });
    store.create({ amount: 30, category: "food", note: "", occurredOn: "2026-02-19" });

    const summary = summarize(store.list(), { from: "2026-02-01", to: "2026-02-28" });

    assert.equal(summary.days, 28);
    assert.equal(summary.total, 60);
    assert.equal(summary.dailyAverage, 2.14);
  });

  it("filters by an exact category name", () => {
    const store = new ExpenseStore();
    store.create({ amount: 8, category: "food", note: "", occurredOn: "2026-03-01" });
    store.create({ amount: 4, category: "books", note: "", occurredOn: "2026-03-01" });

    const summary = summarize(store.list(), { category: "books" });

    assert.equal(summary.total, 4);
    assert.equal(summary.count, 1);
    assert.equal(summary.byCategory[0]?.category, "books");
  });
});
