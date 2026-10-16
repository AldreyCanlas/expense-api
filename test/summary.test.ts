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
      byCategory: [{ category: "food", total: 15, count: 2 }],
    });
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
