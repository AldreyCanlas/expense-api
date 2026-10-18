# expense-api

Small HTTP API for recording personal expenses and totaling them by category. Data lives in memory and resets when the process stops.

## Purpose

`expense-api` is a small, self-hostable HTTP/JSON backend for tracking expenses. It lets a person or a small team record what they spent, categorize it, filter it by date and category, summarize totals per category, and set monthly per-category budgets to watch spending against. It runs on Node's native TypeScript runtime with zero external runtime dependencies.

### Why it exists

Most expense trackers are either heavyweight SaaS products or full web apps bundled with a database and a framework. `expense-api` fills the gap for a tiny, embeddable spending-ledger service you can drop behind your own dashboard, CLI, or chat bot without adopting a database, an ORM, or a web framework. The guiding idea is the smallest honest expense backend: do the money-and-category bookkeeping correctly, and leave storage, auth, and UI as deliberate, swappable extension points.

### Who it's for

- Individual developers who want to track personal spending programmatically and own their data.
- Small teams needing a lightweight internal tool for shared category spend.
- Builders who need a drop-in finance microservice behind a dashboard, a Slack or Discord bot, or a CLI.
- Anyone who wants a compact, framework-free reference for a well-structured Node and TypeScript HTTP service.

## Requirements

- Node.js 22.18 or newer

## Run

```bash
npm install
npm start
```

The server listens on port 3000, or on `PORT` when that variable is set.

## API

Amounts are decimal numbers in major units (for example, `12.5` dollars). Dates use `YYYY-MM-DD`. `from` and `to` are inclusive.

### `GET /health`

```json
{ "ok": true }
```

### `POST /expenses`

```json
{
  "amount": 12.5,
  "category": "food",
  "note": "lunch",
  "occurredOn": "2026-01-10"
}
```

`note` is optional.

### `GET /expenses`

Optional query parameters: `from`, `to`, `category`.

### `GET /expenses/:id`

### `DELETE /expenses/:id`

Returns `204` when the expense is removed.

### `GET /summary`

Uses the same query parameters as `GET /expenses`.

```json
{
  "summary": {
    "from": "2026-01-01",
    "to": "2026-01-31",
    "category": null,
    "count": 2,
    "total": 15,
    "byCategory": [{ "category": "food", "total": 15, "count": 2 }]
  }
}
```

## Checks

```bash
npm test
npm run typecheck
```

## Design principles

- **Zero runtime dependencies.** Pure Node standard library (`node:http`, `node:crypto`) plus TypeScript. Nothing to vet for supply-chain risk, nothing to keep patched.
- **Native TypeScript execution.** Runs `.ts` directly on Node 22.18+ (`node src/index.ts`); type-checking is a separate `tsc --noEmit` step and tests use the built-in `node --test`. No build pipeline.
- **In-memory by design, storage as a seam.** The data layer sits behind a single `ExpenseStore` class, so swapping in SQLite, Postgres, or Redis is a localized change. The in-memory default keeps the quick start and the test suite instant.
- **Thin, explicit HTTP layer.** Manual routing and JSON handling keep the request lifecycle visible and easy to debug.
- **MIT licensed**, so it is free to embed and modify.

## Architecture

| Module | Responsibility |
|---|---|
| `src/index.ts` | Entry point; reads `PORT` and starts the server |
| `src/server.ts` | HTTP server, routing, body parsing, error-to-response mapping |
| `src/store.ts` | `ExpenseStore`, the in-memory data layer and storage seam |
| `src/validation.ts` | Request parsing and input validation |
| `src/summary.ts` | Filtering and per-category aggregation |
| `src/money.ts` | Amount summation |
| `src/dates.ts` | Date-range logic |
| `src/types.ts` | Domain types such as `Expense` and `Summary` |
| `src/errors.ts` | `HttpError` for status-coded failures |

## Scope and non-goals

- No authentication or multi-tenant isolation; it assumes a trusted deployment or a gateway in front.
- No durable storage out of the box; persistence is an intentional extension point.
- No UI; it is a backend, and the frontend is whatever consumes the JSON.
- Not a multi-currency accounting system; it tracks amounts in a single major unit per deployment.

## Roadmap

- Fold the monthly-budget, period-reporting, and strict-validation feature branches into a single coherent release.
- Add a pluggable persistence adapter so data survives restarts.
- Keep a documented, stable REST contract suitable for building a dashboard or bot on.
