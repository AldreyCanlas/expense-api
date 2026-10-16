import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sumAmounts } from "../src/money.ts";
import { ExpenseStore } from "../src/store.ts";
import { summarize } from "../src/summary.ts";

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
