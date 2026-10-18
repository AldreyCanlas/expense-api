import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { ExpenseStore } from "../src/store.ts";
import { request, startTestApp, type TestApp } from "./helpers.ts";

describe("top category report", { concurrency: false }, () => {
  let app: TestApp;

  before(async () => {
    const store = new ExpenseStore();
    store.create({ amount: 40, category: "food", note: "lunch", occurredOn: "2026-01-10" });
    store.create({ amount: 10, category: "food", note: "coffee", occurredOn: "2026-01-12" });
    app = await startTestApp(store);
  });

  after(async () => {
    await app.close();
  });

  it("returns the categories that spent in the month", async () => {
    const response = await request(`${app.url}/summary/top?month=2026-01`);
    assert.equal(response.status, 200);
    const body = response.body as { top: { category: string; total: number }[] };
    assert.equal(body.top.length, 1);
    assert.equal(body.top[0]?.category, "food");
    assert.equal(body.top[0]?.total, 50);
  });
});
